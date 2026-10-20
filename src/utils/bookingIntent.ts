// Ponte entre os botões "Agendar" espalhados pela página e o fluxo de agendamento
// (que é carregado sob demanda e pode ainda não estar montado quando o botão é clicado).
import type { ServiceType } from '../types';

type Listener = (service?: ServiceType) => void;

let pending: ServiceType | undefined;
const listeners = new Set<Listener>();

export const BOOKING_SECTION_ID = 'agendar';

export function requestBooking(service?: ServiceType) {
  if (service) pending = service;
  listeners.forEach((l) => l(service));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(BOOKING_SECTION_ID)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
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
