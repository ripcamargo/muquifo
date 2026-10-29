import {
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { studio } from '../config/studio';
import { SERVICE_TYPES, type BookingRequest, type HHMM, type ISODate, type Occupation, type RequestStatus, type ServiceType } from '../types';
import { findConflicts } from '../utils/slots';
import { dayRef, parseDay, parseSettings } from './availability';
import { currentUid, ensureVisitorUser } from './firebase/auth';
import { col, COLLECTIONS, db, num, ref, SETTINGS_DOC, str, toDate } from './firebase/db';
import { isPermissionDenied, withTimeout } from './firebase/errors';

export interface RequestInput {
  /** O id do pedido é o mesmo do lead (uma solicitação por sessão de agendamento). */
  leadId: string;
  name: string;
  whatsapp: string;
  whatsappNormalized: string;
  serviceType: ServiceType;
  projectName: string;
  peopleCount: number | null;
  description: string;
  notes: string;
  requestedDate: ISODate;
  startTime: HHMM;
  endTime: HHMM;
}

/**
 * Visitante: grava o pedido como "pedido_preparado" (pronto para envio pelo WhatsApp)
 * e atualiza o lead na mesma operação atômica. Não reserva o horário.
 */
export async function submitBookingRequest(input: RequestInput, alreadyCreated: boolean) {
  const user = await ensureVisitorUser();
  const { leadId, ...fields } = input;

  const commit = (create: boolean) => {
    const batch = writeBatch(db());
    batch.set(ref(COLLECTIONS.visitorThrottle, user.uid), { requestAt: serverTimestamp() }, { merge: true });
    const data = { ...fields, status: 'pedido_preparado' satisfies RequestStatus, updatedAt: serverTimestamp() };
    const requestRef = ref(COLLECTIONS.bookingRequests, leadId);
    if (create) batch.set(requestRef, { ...data, leadId, ownerUid: user.uid, createdAt: serverTimestamp() });
    else batch.update(requestRef, data);
    batch.update(ref(COLLECTIONS.leads, leadId), {
      status: 'pedido_preparado',
      currentStep: 'enviado',
      serviceType: input.serviceType,
      bookingRequestId: leadId,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
    return withTimeout(batch.commit());
  };

  try {
    await commit(!alreadyCreated);
  } catch (err) {
    // O pedido pode já existir (envio anterior nesta mesma sessão): tenta como atualização.
    if (alreadyCreated || !isPermissionDenied(err)) throw err;
    await commit(false);
  }
}

// ── Administração ─────────────────────────────────────────────────────────────

const REQUEST_STATUSES: RequestStatus[] = [
  'pedido_preparado', 'aguardando_confirmacao', 'confirmado', 'recusado', 'cancelado', 'abandonado',
];

function parseRequest(snap: DocumentSnapshot): BookingRequest {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    leadId: str(d.leadId, snap.id),
    name: str(d.name),
    whatsapp: str(d.whatsapp),
    whatsappNormalized: str(d.whatsappNormalized),
    serviceType: SERVICE_TYPES.includes(d.serviceType) ? d.serviceType : 'ensaio',
    projectName: str(d.projectName),
    peopleCount: typeof d.peopleCount === 'number' ? num(d.peopleCount, 0) : null,
    description: str(d.description),
    notes: str(d.notes),
    requestedDate: str(d.requestedDate),
    startTime: str(d.startTime),
    endTime: str(d.endTime),
    status: REQUEST_STATUSES.includes(d.status) ? d.status : 'pedido_preparado',
    adminNotes: str(d.adminNotes),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    confirmedAt: toDate(d.confirmedAt),
  };
}

export function subscribeRequests(
  onData: (requests: BookingRequest[]) => void,
  onError: (err: unknown) => void,
  max = 500,
) {
  const q = query(col(COLLECTIONS.bookingRequests), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) => onData(snap.docs.map(parseRequest)), onError);
}

export class SlotConflictError extends Error {
  constructor(public conflicts: string[]) {
    super('O horário não está mais livre.');
  }
}

/**
 * Muda o status de um pedido numa transação, mantendo a ocupação da agenda coerente:
 * - aguardando_confirmacao → retém o horário como "em análise" (não confirmado);
 * - confirmado → verifica de novo, no servidor, se o horário segue livre; se não, aborta;
 * - recusado / cancelado / abandonado / pedido_preparado → libera o horário.
 */
export async function changeRequestStatus(requestId: string, next: RequestStatus) {
  await withTimeout(
    runTransaction(db(), async (tx) => {
      const requestRef = ref(COLLECTIONS.bookingRequests, requestId);
      const reqSnap = await tx.get(requestRef);
      if (!reqSnap.exists()) throw new Error('Pedido não encontrado.');
      const req = parseRequest(reqSnap);
      const leadRef = ref(COLLECTIONS.leads, req.leadId);
      const [daySnap, settingsSnap, leadSnap] = await Promise.all([
        tx.get(dayRef(req.requestedDate)),
        tx.get(ref(COLLECTIONS.settings, SETTINGS_DOC)),
        tx.get(leadRef),
      ]);

      const day = parseDay(req.requestedDate, daySnap.data());
      const occupation: Occupation = { ref: requestId, start: req.startTime, end: req.endTime, service: req.serviceType };
      let booked = day.booked.filter((o) => o.ref !== requestId);
      let holds = day.holds.filter((o) => o.ref !== requestId);

      if (next === 'confirmado') {
        const settings = settingsSnap.exists() ? parseSettings(settingsSnap.data()) : null;
        const buffer = settings?.booking.bufferMin ?? 0;
        const conflicts = findConflicts({ ...day, booked }, occupation, buffer, requestId);
        if (conflicts.length) throw new SlotConflictError(conflicts);
        booked = [...booked, occupation];
      } else if (next === 'aguardando_confirmacao') {
        holds = [...holds, occupation];
      }

      if (daySnap.exists()) {
        tx.update(dayRef(req.requestedDate), { booked, holds, updatedAt: serverTimestamp() });
      } else {
        tx.set(dayRef(req.requestedDate), {
          date: req.requestedDate, mode: 'padrao', intervals: [], extraIntervals: [], blocks: [],
          booked, holds, updatedAt: serverTimestamp(),
        });
      }
      tx.update(requestRef, {
        status: next,
        updatedAt: serverTimestamp(),
        confirmedAt: next === 'confirmado' ? serverTimestamp() : null,
      });
      if (leadSnap.exists()) tx.update(leadRef, { status: next, updatedAt: serverTimestamp() });
    }),
    20_000,
  );
}

export function saveRequestAdminNotes(requestId: string, adminNotes: string) {
  return withTimeout(
    updateDoc(ref(COLLECTIONS.bookingRequests, requestId), { adminNotes: adminNotes.slice(0, 2000), updatedAt: serverTimestamp() }),
  );
}

/** Exclui definitivamente os dados de uma pessoa (lead + pedido) e libera a agenda. */
export async function deleteBookingData(leadId: string) {
  await withTimeout(
    runTransaction(db(), async (tx) => {
      const requestRef = ref(COLLECTIONS.bookingRequests, leadId);
      const reqSnap = await tx.get(requestRef);
      if (reqSnap.exists()) {
        const req = parseRequest(reqSnap);
        const daySnap = await tx.get(dayRef(req.requestedDate));
        if (daySnap.exists()) {
          const day = parseDay(req.requestedDate, daySnap.data());
          tx.update(dayRef(req.requestedDate), {
            booked: day.booked.filter((o) => o.ref !== leadId),
            holds: day.holds.filter((o) => o.ref !== leadId),
            updatedAt: serverTimestamp(),
          });
        }
        tx.delete(requestRef);
      }
      tx.delete(ref(COLLECTIONS.leads, leadId));
    }),
    20_000,
  );
}

export interface AdminBookingInput {
  name: string;
  whatsapp: string;
  whatsappNormalized: string;
  serviceType: ServiceType;
  projectName: string;
  peopleCount: number | null;
  description: string;
  notes: string;
  adminNotes: string;
  requestedDate: ISODate;
  startTime: HHMM;
  endTime: HHMM;
  /** Confirmado ocupa a agenda; em análise apenas retém o horário. */
  status: Extract<RequestStatus, 'confirmado' | 'aguardando_confirmacao'>;
}

/**
 * Administrador: registra um agendamento de quem pediu fora do site (ex.: WhatsApp).
 * Cria lead + pedido com o mesmo id e atualiza a ocupação do dia na mesma transação.
 * Só reservas confirmadas de outras pessoas impedem o horário; expediente e bloqueios são decisão do administrador.
 */
export async function createAdminBooking(input: AdminBookingInput): Promise<string> {
  const ownerUid = currentUid();
  if (!ownerUid) throw new Error('Sessão expirada. Entre novamente.');
  const id = doc(col(COLLECTIONS.leads)).id;

  await withTimeout(
    runTransaction(db(), async (tx) => {
      const [daySnap, settingsSnap] = await Promise.all([
        tx.get(dayRef(input.requestedDate)),
        tx.get(ref(COLLECTIONS.settings, SETTINGS_DOC)),
      ]);
      const day = parseDay(input.requestedDate, daySnap.data());
      const occupation: Occupation = { ref: id, start: input.startTime, end: input.endTime, service: input.serviceType };
      let { booked, holds } = day;

      if (input.status === 'confirmado') {
        const buffer = settingsSnap.exists() ? parseSettings(settingsSnap.data()).booking.bufferMin : 0;
        const conflicts = findConflicts({ ...day, mode: 'padrao', blocks: [] }, occupation, buffer);
        if (conflicts.length) throw new SlotConflictError(conflicts);
        booked = [...booked, occupation];
      } else {
        holds = [...holds, occupation];
      }

      const { adminNotes, ...request } = input;
      tx.set(ref(COLLECTIONS.leads, id), {
        name: input.name,
        whatsapp: input.whatsapp,
        whatsappNormalized: input.whatsappNormalized,
        source: 'admin',
        status: input.status,
        currentStep: 'enviado',
        sessionId: id,
        serviceType: input.serviceType,
        bookingRequestId: id,
        privacyNoticeVersion: studio.privacy.version,
        ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });
      tx.set(ref(COLLECTIONS.bookingRequests, id), {
        ...request,
        adminNotes,
        leadId: id,
        ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        confirmedAt: input.status === 'confirmado' ? serverTimestamp() : null,
      });
      if (daySnap.exists()) {
        tx.update(dayRef(input.requestedDate), { booked, holds, updatedAt: serverTimestamp() });
      } else {
        tx.set(dayRef(input.requestedDate), {
          date: input.requestedDate, mode: 'padrao', intervals: [], extraIntervals: [], blocks: [],
          booked, holds, updatedAt: serverTimestamp(),
        });
      }
    }),
    20_000,
  );
  return id;
}
