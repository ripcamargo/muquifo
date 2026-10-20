/** Datas de calendário são sempre strings locais "YYYY-MM-DD" no fuso America/Sao_Paulo. */
export type ISODate = string;
/** Horário local "HH:MM" (00:00–24:00). */
export type HHMM = string;

export type ServiceType = 'ensaio' | 'gravacao';

export interface TimeInterval {
  start: HHMM;
  end: HHMM;
}

/** Regras de horário de um serviço. */
export interface ServiceSchedule {
  enabled: boolean;
  /** Duração de cada sessão, em minutos. */
  durationMin: number;
  /** De quantos em quantos minutos um novo início é oferecido dentro do expediente. */
  stepMin: number;
  /** Tempo livre exigido antes/depois de outra reserva (preparação, montagem). */
  bufferMin: number;
}

/** Chaves "0" (domingo) a "6" (sábado). Lista vazia = fechado. */
export type WeeklySchedule = Record<string, TimeInterval[]>;

export interface AvailabilitySettings {
  timezone: string;
  weekly: WeeklySchedule;
  services: Record<ServiceType, ServiceSchedule>;
  /** Antecedência mínima, em horas, entre agora e o início de uma sessão. */
  minAdvanceHours: number;
  /** Quantos dias à frente o calendário público mostra. */
  maxDaysAhead: number;
}

/** padrao: segue a semana · fechado: dia inteiro bloqueado · especial: horários próprios do dia. */
export type DayMode = 'padrao' | 'fechado' | 'especial';

export type BlockReason = 'pessoal' | 'manutencao' | 'compromisso' | 'outro';

export interface DayBlock extends TimeInterval {
  id: string;
  reason: BlockReason;
}

/** Período ocupado por uma solicitação (sem dados pessoais: este documento é público). */
export interface Occupation extends TimeInterval {
  ref: string;
  service: ServiceType;
}

/** Documento calendarDays/{YYYY-MM-DD}: exceções da data + ocupação. */
export interface CalendarDay {
  date: ISODate;
  mode: DayMode;
  /** Usado quando mode = "especial" (substitui a semana). */
  intervals: TimeInterval[];
  /** Intervalos somados ao expediente do dia. */
  extraIntervals: TimeInterval[];
  blocks: DayBlock[];
  /** Reservas confirmadas pelo administrador. */
  booked: Occupation[];
  /** Pedidos em análise pelo administrador (retenção manual, sem expiração automática). */
  holds: Occupation[];
}

export type SlotState = 'disponivel' | 'em_analise' | 'ocupado';

export interface Slot extends TimeInterval {
  state: SlotState;
}

export type DayState = 'passado' | 'fora_da_janela' | 'fechado' | 'lotado' | 'disponivel';

export interface DayAvailability {
  state: DayState;
  available: number;
}

export type LeadStatus =
  | 'novo'
  | 'em_andamento'
  | 'pedido_preparado'
  | 'aguardando_confirmacao'
  | 'confirmado'
  | 'recusado'
  | 'cancelado'
  | 'abandonado';

export type RequestStatus = Exclude<LeadStatus, 'novo' | 'em_andamento'>;

export type BookingStep = 'contato' | 'servico' | 'data' | 'horario' | 'detalhes' | 'revisao' | 'enviado';

export interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  whatsappNormalized: string;
  source: string;
  status: LeadStatus;
  currentStep: BookingStep;
  sessionId: string;
  serviceType: ServiceType | null;
  bookingRequestId: string | null;
  privacyNoticeVersion: string;
  adminNotes?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastActivityAt: Date | null;
}

export interface BookingRequest {
  id: string;
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
  status: RequestStatus;
  adminNotes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  confirmedAt: Date | null;
}
