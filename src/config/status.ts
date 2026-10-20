import type { LeadStatus, RequestStatus } from '../types';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo lead',
  em_andamento: 'Em andamento',
  pedido_preparado: 'Pedido preparado',
  aguardando_confirmacao: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  abandonado: 'Abandonado',
};

export const STATUS_HINTS: Record<LeadStatus, string> = {
  novo: 'Deixou nome e WhatsApp, ainda não escolheu horário.',
  em_andamento: 'Está escolhendo serviço, dia ou horário.',
  pedido_preparado: 'Clicou em enviar pelo WhatsApp. Confira se a mensagem chegou.',
  aguardando_confirmacao: 'Mensagem recebida; horário retido como "em análise" na agenda pública.',
  confirmado: 'Horário confirmado e ocupado na agenda.',
  recusado: 'Pedido recusado; horário liberado.',
  cancelado: 'Pedido cancelado; horário liberado.',
  abandonado: 'Sem continuidade; horário liberado.',
};

/** Ordem dos botões de status no detalhe do pedido. */
export const REQUEST_STATUS_FLOW: RequestStatus[] = [
  'pedido_preparado',
  'aguardando_confirmacao',
  'confirmado',
  'recusado',
  'cancelado',
  'abandonado',
];

export const ACTIVE_REQUEST_STATUSES: RequestStatus[] = ['pedido_preparado', 'aguardando_confirmacao'];
