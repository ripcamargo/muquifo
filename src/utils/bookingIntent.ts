// Ponte entre os botões "Agendar" espalhados pela página e a janela de agendamento.
// O agendamento abre em `#agendar` (dá para compartilhar o link e o "voltar" do celular fecha a janela).
import type { ServiceType } from '../types';

type Listener = (service?: ServiceType) => void;

let pending: ServiceType | undefined;
const listeners = new Set<Listener>();

/** Fragmento da URL que abre a janela de agendamento. */
export const BOOKING_HASH = '#agendar';
/** Seção da página que apresenta o agendamento. */
export const BOOKING_SECTION_ID = 'reservar';

/** Abre a janela de agendamento, opcionalmente com a modalidade já escolhida. */
export function requestBooking(service?: ServiceType) {
  if (service) pending = service;
  listeners.forEach((l) => l(service));
}

/** Serviço escolhido num CTA antes de o fluxo estar montado (consumido uma única vez). */
export function takePendingService(): ServiceType | undefined {
  const s = pending;
  pending = undefined;
  return s;
}

export function onBookingRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Baixa o fluxo de agendamento (e o Firebase) antes de alguém clicar, para a janela abrir na hora. */
export const loadBookingWizard = () => import('../components/booking/BookingWizard');
