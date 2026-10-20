import { useCallback, useEffect, useState } from 'react';
import type { BookingStep, ISODate, ServiceType, TimeInterval } from '../types';
import { newSessionId } from '../utils/text';

/** Tudo o que o visitante preencheu, guardado no navegador para retomar o processo. */
export interface BookingDraft {
  version: 1;
  sessionId: string;
  step: BookingStep;
  name: string;
  whatsapp: string;
  whatsappNormalized: string;
  service: ServiceType | null;
  date: ISODate | null;
  slot: TimeInterval | null;
  projectName: string;
  peopleCount: string;
  description: string;
  notes: string;
  leadSaved: boolean;
  requestCreated: boolean;
  /** Link do WhatsApp gerado no envio (para reabrir). */
  sentUrl: string;
  sentSaveFailed: boolean;
  savedAt: number;
}

const STORAGE_KEY = 'muquifo.booking.v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function freshDraft(contact?: Pick<BookingDraft, 'name' | 'whatsapp'>): BookingDraft {
  return {
    version: 1,
    sessionId: newSessionId(),
    step: 'contato',
    name: contact?.name ?? '',
    whatsapp: contact?.whatsapp ?? '',
    whatsappNormalized: '',
    service: null,
    date: null,
    slot: null,
    projectName: '',
    peopleCount: '',
    description: '',
    notes: '',
    leadSaved: false,
    requestCreated: false,
    sentUrl: '',
    sentSaveFailed: false,
    savedAt: Date.now(),
  };
}

function load(): { draft: BookingDraft; restored: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BookingDraft;
      if (parsed?.version === 1 && parsed.sessionId && Date.now() - parsed.savedAt < MAX_AGE_MS) {
        return { draft: parsed, restored: parsed.leadSaved && parsed.step !== 'contato' };
      }
    }
  } catch {
    // Armazenamento indisponível (modo privado, bloqueio): segue sem retomada.
  }
  return { draft: freshDraft(), restored: false };
}

export function useBookingDraft() {
  const [{ draft, restored }, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignora
    }
  }, [draft]);

  const update = useCallback((patch: Partial<BookingDraft> | ((d: BookingDraft) => Partial<BookingDraft>)) => {
    setState((s) => {
      const p = typeof patch === 'function' ? patch(s.draft) : patch;
      return { ...s, draft: { ...s.draft, ...p, savedAt: Date.now() } };
    });
  }, []);

  /** Começa uma nova sessão (novo lead). Mantém nome e WhatsApp para agilizar, se pedido. */
  const reset = useCallback((keepContact = false) => {
    setState((s) => ({
      restored: false,
      draft: freshDraft(keepContact ? { name: s.draft.name, whatsapp: s.draft.whatsapp } : undefined),
    }));
  }, []);

  const dismissRestored = useCallback(() => setState((s) => ({ ...s, restored: false })), []);

  return { draft, restored, update, reset, dismissRestored };
}
