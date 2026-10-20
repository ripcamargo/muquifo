import { serviceInfo, studio } from '../config/studio';
import type { HHMM, ISODate, ServiceType } from '../types';
import { formatDateWithWeekday, formatDuration, formatTimeRange, timeToMinutes } from './datetime';

export function whatsappUrl(phoneDigits: string, text?: string): string {
  const base = `https://wa.me/${phoneDigits.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function studioWhatsappUrl(text?: string): string {
  return whatsappUrl(studio.whatsapp, text);
}

export interface BookingMessageData {
  name: string;
  whatsapp: string;
  service: ServiceType;
  date: ISODate;
  start: HHMM;
  end: HHMM;
  projectName?: string;
  peopleCount?: number | null;
  description?: string;
  notes?: string;
}

/** Mensagem do pedido. Campos opcionais vazios não aparecem. */
export function buildBookingMessage(d: BookingMessageData): string {
  const optional = [
    d.projectName && `${d.service === 'locacao' ? 'Projeto' : 'Projeto/banda'}: ${d.projectName}`,
    d.peopleCount && `Pessoas: ${d.peopleCount}`,
    d.description && `${serviceInfo(d.service).fields.descriptionShort ?? 'Descrição'}: ${d.description}`,
    d.notes && `Observações: ${d.notes}`,
  ].filter(Boolean);

  return [
    'Olá! Gostaria de solicitar um agendamento no home studio.',
    '',
    '*Meus dados*',
    `Nome: ${d.name}`,
    `WhatsApp: ${d.whatsapp}`,
    '',
    '*Detalhes do pedido*',
    `Serviço: ${serviceInfo(d.service).name}`,
    `Data: ${formatDateWithWeekday(d.date)}`,
    `Horário: ${formatTimeRange(d.start, d.end)} (${formatDuration(timeToMinutes(d.end) - timeToMinutes(d.start))})`,
    ...(optional.length ? ['', ...optional] : []),
    '',
    'Aguardo a confirmação da disponibilidade. Obrigado!',
  ].join('\n');
}
