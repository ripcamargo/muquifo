import {
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { studio } from '../config/studio';
import { SERVICE_TYPES, type BookingStep, type Lead, type LeadStatus, type ServiceType } from '../types';
import { ensureVisitorUser } from './firebase/auth';
import { col, COLLECTIONS, db, ref, str, toDate } from './firebase/db';
import { isPermissionDenied, withTimeout } from './firebase/errors';

export interface LeadContact {
  name: string;
  whatsapp: string;
  whatsappNormalized: string;
}

export const LEAD_SOURCE = 'site';

/** Visitante: registra o lead logo após a etapa de contato (antes de qualquer reserva). */
export async function createLead(sessionId: string, contact: LeadContact, serviceType: ServiceType | null) {
  const user = await ensureVisitorUser();
  const batch = writeBatch(db());
  // Controle de frequência: as regras exigem um intervalo mínimo entre leads do mesmo visitante.
  batch.set(ref(COLLECTIONS.visitorThrottle, user.uid), { leadAt: serverTimestamp() }, { merge: true });
  batch.set(ref(COLLECTIONS.leads, sessionId), {
    ...contact,
    source: LEAD_SOURCE,
    status: 'novo' satisfies LeadStatus,
    currentStep: 'servico' satisfies BookingStep,
    sessionId,
    serviceType,
    bookingRequestId: null,
    privacyNoticeVersion: studio.privacy.version,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
  try {
    await withTimeout(batch.commit());
  } catch (err) {
    // O lead pode já existir (ex.: tentativa anterior que expirou mas foi gravada): atualiza.
    if (!isPermissionDenied(err)) throw err;
    await updateLeadProgress(sessionId, { ...contact });
  }
}

export type LeadProgress = Partial<LeadContact> & {
  status?: Extract<LeadStatus, 'novo' | 'em_andamento'>;
  currentStep?: BookingStep;
  serviceType?: ServiceType | null;
};

/** Visitante: registra o avanço no fluxo (só campos que as regras permitem ao visitante). */
export async function updateLeadProgress(leadId: string, progress: LeadProgress) {
  await ensureVisitorUser();
  await withTimeout(
    updateDoc(ref(COLLECTIONS.leads, leadId), {
      ...progress,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    }),
  );
}

// ── Administração ─────────────────────────────────────────────────────────────

const LEAD_STATUSES: LeadStatus[] = [
  'novo', 'em_andamento', 'pedido_preparado', 'aguardando_confirmacao', 'confirmado', 'recusado', 'cancelado', 'abandonado',
];

function parseLead(snap: DocumentSnapshot): Lead {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    name: str(d.name),
    whatsapp: str(d.whatsapp),
    whatsappNormalized: str(d.whatsappNormalized),
    source: str(d.source),
    status: LEAD_STATUSES.includes(d.status) ? d.status : 'novo',
    currentStep: str(d.currentStep, 'contato') as BookingStep,
    sessionId: str(d.sessionId, snap.id),
    serviceType: SERVICE_TYPES.includes(d.serviceType) ? d.serviceType : null,
    bookingRequestId: typeof d.bookingRequestId === 'string' ? d.bookingRequestId : null,
    privacyNoticeVersion: str(d.privacyNoticeVersion),
    adminNotes: str(d.adminNotes),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    lastActivityAt: toDate(d.lastActivityAt),
  };
}

export function subscribeLeads(onData: (leads: Lead[]) => void, onError: (err: unknown) => void, max = 500) {
  const q = query(col(COLLECTIONS.leads), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) => onData(snap.docs.map(parseLead)), onError);
}

/** Status de leads que ainda não viraram pedido (o status dos pedidos muda em bookings.ts). */
export function setLeadStatus(leadId: string, status: LeadStatus) {
  return withTimeout(updateDoc(ref(COLLECTIONS.leads, leadId), { status, updatedAt: serverTimestamp() }));
}

export async function markLeadsAbandoned(leadIds: string[]) {
  for (let i = 0; i < leadIds.length; i += 400) {
    const batch = writeBatch(db());
    for (const id of leadIds.slice(i, i + 400)) {
      batch.update(ref(COLLECTIONS.leads, id), { status: 'abandonado', updatedAt: serverTimestamp() });
    }
    await withTimeout(batch.commit());
  }
}
