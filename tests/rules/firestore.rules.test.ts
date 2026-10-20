// Testes das regras do Firestore contra o emulador.
// Rodar: npx firebase-tools emulators:exec --only firestore "npx vitest run -c vitest.rules.config.ts"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const ts = () => firebase.firestore.FieldValue.serverTimestamp();
const LEAD = 'a1b2c3d4e5f6a1b2c3d4e5f6';
const OTHER_LEAD = 'ffffffffffffffffffffffff';

let env: RulesTestEnvironment;

const visitor = (uid = 'visitor-1') =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } } as never).firestore();
const admin = () => env.authenticatedContext('admin-1', { email: 'dono@estudio.com', firebase: { sign_in_provider: 'password' } } as never).firestore();
const stranger = () => env.authenticatedContext('random-user', { firebase: { sign_in_provider: 'password' } } as never).firestore();

function leadData(uid: string, id = LEAD) {
  return {
    name: 'Maria da Silva',
    whatsapp: '(15) 99811-0938',
    whatsappNormalized: '5515998110938',
    source: 'site',
    status: 'novo',
    currentStep: 'servico',
    sessionId: id,
    serviceType: null,
    bookingRequestId: null,
    privacyNoticeVersion: '2026-10-20',
    ownerUid: uid,
    createdAt: ts(),
    updatedAt: ts(),
    lastActivityAt: ts(),
  };
}

function requestData(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    leadId: LEAD,
    ownerUid: uid,
    name: 'Maria da Silva',
    whatsapp: '(15) 99811-0938',
    whatsappNormalized: '5515998110938',
    serviceType: 'ensaio',
    projectName: 'Banda X',
    peopleCount: 4,
    description: '',
    notes: '',
    requestedDate: '2026-10-24',
    startTime: '19:00',
    endTime: '21:00',
    status: 'pedido_preparado',
    createdAt: ts(),
    updatedAt: ts(),
    ...overrides,
  };
}

async function createLeadAs(db: firebase.firestore.Firestore, uid: string, id = LEAD) {
  const batch = db.batch();
  batch.set(db.doc(`visitorThrottle/${uid}`), { leadAt: ts() }, { merge: true });
  batch.set(db.doc(`leads/${id}`), leadData(uid, id));
  return batch.commit();
}

async function submitRequestAs(db: firebase.firestore.Firestore, uid: string, overrides: Record<string, unknown> = {}) {
  const batch = db.batch();
  batch.set(db.doc(`visitorThrottle/${uid}`), { requestAt: ts() }, { merge: true });
  batch.set(db.doc(`bookingRequests/${LEAD}`), requestData(uid, overrides));
  batch.update(db.doc(`leads/${LEAD}`), {
    status: 'pedido_preparado',
    currentStep: 'enviado',
    serviceType: 'ensaio',
    bookingRequestId: LEAD,
    updatedAt: ts(),
    lastActivityAt: ts(),
  });
  return batch.commit();
}

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-muquifo',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('admins/admin-1').set({ email: 'dono@estudio.com' });
    await ctx.firestore().doc('settings/availability').set({ timezone: 'America/Sao_Paulo' });
  });
});

describe('leads', () => {
  it('visitante cria o próprio lead (com controle de frequência)', async () => {
    await assertSucceeds(createLeadAs(visitor(), 'visitor-1'));
  });

  it('sem login ou sem controle de frequência não cria', async () => {
    await assertFails(env.unauthenticatedContext().firestore().doc(`leads/${LEAD}`).set(leadData('x')));
    await assertFails(visitor().doc(`leads/${LEAD}`).set(leadData('visitor-1')));
  });

  it('não cria lead com status administrativo ou dono falso', async () => {
    const db = visitor();
    const batch = db.batch();
    batch.set(db.doc('visitorThrottle/visitor-1'), { leadAt: ts() });
    batch.set(db.doc(`leads/${LEAD}`), { ...leadData('visitor-1'), status: 'confirmado' });
    await assertFails(batch.commit());
    await assertFails(createLeadAs(visitor('visitor-2'), 'visitor-1'));
  });

  it('bloqueia um segundo lead logo em seguida', async () => {
    await assertSucceeds(createLeadAs(visitor(), 'visitor-1'));
    await assertFails(createLeadAs(visitor(), 'visitor-1', OTHER_LEAD));
  });

  it('visitante nunca lê leads (nem o próprio)', async () => {
    await createLeadAs(visitor(), 'visitor-1');
    await assertFails(visitor().doc(`leads/${LEAD}`).get());
    await assertFails(visitor('visitor-2').collection('leads').get());
    await assertFails(stranger().collection('leads').get());
  });

  it('dono avança no fluxo, mas não muda status administrativo', async () => {
    await createLeadAs(visitor(), 'visitor-1');
    await assertSucceeds(
      visitor().doc(`leads/${LEAD}`).update({ status: 'em_andamento', currentStep: 'data', serviceType: 'ensaio', updatedAt: ts(), lastActivityAt: ts() }),
    );
    await assertFails(visitor().doc(`leads/${LEAD}`).update({ status: 'confirmado', updatedAt: ts(), lastActivityAt: ts() }));
    await assertFails(visitor().doc(`leads/${LEAD}`).update({ ownerUid: 'visitor-2', updatedAt: ts(), lastActivityAt: ts() }));
  });

  it('outro visitante não altera o lead', async () => {
    await createLeadAs(visitor(), 'visitor-1');
    await assertFails(visitor('visitor-2').doc(`leads/${LEAD}`).update({ currentStep: 'data', updatedAt: ts(), lastActivityAt: ts() }));
  });

  it('administrador lê, muda status e exclui', async () => {
    await createLeadAs(visitor(), 'visitor-1');
    await assertSucceeds(admin().collection('leads').get());
    await assertSucceeds(admin().doc(`leads/${LEAD}`).update({ status: 'abandonado', updatedAt: ts() }));
    await assertFails(admin().doc(`leads/${LEAD}`).update({ name: 'Outro nome' }));
    await assertSucceeds(admin().doc(`leads/${LEAD}`).delete());
  });

  it('conta não administradora não lê nada', async () => {
    await createLeadAs(visitor(), 'visitor-1');
    await assertFails(stranger().doc(`leads/${LEAD}`).get());
  });
});

describe('pedidos', () => {
  beforeEach(async () => {
    await createLeadAs(visitor(), 'visitor-1');
  });

  it('dono do lead envia o pedido como "pedido_preparado"', async () => {
    await assertSucceeds(submitRequestAs(visitor(), 'visitor-1'));
  });

  it('visitante não cria pedido confirmado nem com campos extras', async () => {
    await assertFails(submitRequestAs(visitor(), 'visitor-1', { status: 'confirmado' }));
    await assertFails(submitRequestAs(visitor(), 'visitor-1', { adminNotes: 'oi' }));
    await assertFails(submitRequestAs(visitor(), 'visitor-1', { requestedDate: '24/10/2026' }));
    await assertFails(submitRequestAs(visitor(), 'visitor-1', { startTime: '21:00', endTime: '19:00' }));
  });

  it('outro visitante não cria pedido no lead alheio', async () => {
    await assertFails(submitRequestAs(visitor('visitor-2'), 'visitor-2'));
  });

  it('visitante não lê pedidos', async () => {
    await submitRequestAs(visitor(), 'visitor-1');
    await assertFails(visitor().doc(`bookingRequests/${LEAD}`).get());
    await assertFails(visitor().collection('bookingRequests').get());
  });

  it('depois que o estúdio assume, o visitante não altera mais', async () => {
    await submitRequestAs(visitor(), 'visitor-1');
    await assertSucceeds(admin().doc(`bookingRequests/${LEAD}`).update({ status: 'confirmado', updatedAt: ts(), confirmedAt: ts() }));
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc('visitorThrottle/visitor-1').set({ requestAt: new Date(0) }));
    const db = visitor();
    const batch = db.batch();
    batch.set(db.doc('visitorThrottle/visitor-1'), { requestAt: ts() }, { merge: true });
    batch.update(db.doc(`bookingRequests/${LEAD}`), { startTime: '10:00', endTime: '12:00', status: 'pedido_preparado', updatedAt: ts() });
    await assertFails(batch.commit());
  });

  it('administrador não reescreve os dados do cliente', async () => {
    await submitRequestAs(visitor(), 'visitor-1');
    await assertFails(admin().doc(`bookingRequests/${LEAD}`).update({ whatsappNormalized: '5511999999999' }));
    await assertSucceeds(admin().doc(`bookingRequests/${LEAD}`).update({ adminNotes: 'Banda pontual', updatedAt: ts() }));
  });
});

describe('disponibilidade', () => {
  it('é pública para leitura', async () => {
    await assertSucceeds(env.unauthenticatedContext().firestore().doc('settings/availability').get());
    await assertSucceeds(env.unauthenticatedContext().firestore().collection('calendarDays').where('date', '>=', '2026-10-01').get());
  });

  it('só o administrador altera', async () => {
    await assertFails(visitor().doc('settings/availability').set({ maxDaysAhead: 999 }));
    await assertFails(visitor().doc('calendarDays/2026-10-24').set({ date: '2026-10-24', mode: 'fechado' }));
    await assertFails(stranger().doc('calendarDays/2026-10-24').set({ date: '2026-10-24', mode: 'fechado' }));
    await assertSucceeds(admin().doc('calendarDays/2026-10-24').set({ date: '2026-10-24', mode: 'fechado' }));
    await assertFails(admin().doc('calendarDays/2026-10-24').set({ date: '2026-10-25', mode: 'fechado' }));
  });

  it('ninguém se promove a administrador', async () => {
    await assertFails(visitor().doc('admins/visitor-1').set({ email: 'x' }));
    await assertFails(stranger().collection('admins').get());
    await assertSucceeds(admin().doc('admins/admin-1').get());
  });
});
