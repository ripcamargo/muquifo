// Regras de montagem da agenda do painel (sem React): eventos, faixa de horas, sobreposição e conferência de horário.
import type {
  AvailabilitySettings,
  BookingRequest,
  CalendarDay,
  HHMM,
  ISODate,
  RequestStatus,
  ServiceType,
  TimeInterval,
} from '../../../types';
import { formatTime, timeToMinutes } from '../../../utils/datetime';
import { findConflicts, openWindows } from '../../../utils/slots';

/** Pedidos que aparecem na agenda: os demais status não ocupam horário. */
const VISIBLE: RequestStatus[] = ['pedido_preparado', 'aguardando_confirmacao', 'confirmado'];

export interface CalEvent {
  /** Id do pedido (ou da ocupação, quando não há pedido correspondente). */
  id: string;
  date: ISODate;
  start: HHMM;
  end: HHMM;
  startMin: number;
  endMin: number;
  title: string;
  service: ServiceType;
  status: RequestStatus;
  /** Ocupação sem pedido correspondente (dados antigos): não abre detalhes. */
  orphan: boolean;
}

export function buildEvents(
  requests: BookingRequest[],
  days: Map<ISODate, CalendarDay>,
  first: ISODate,
  last: ISODate,
): CalEvent[] {
  const out: CalEvent[] = [];
  const known = new Set(requests.map((r) => r.id));
  for (const r of requests) {
    if (!VISIBLE.includes(r.status) || r.requestedDate < first || r.requestedDate > last) continue;
    out.push({
      id: r.id,
      date: r.requestedDate,
      start: r.startTime,
      end: r.endTime,
      startMin: timeToMinutes(r.startTime),
      endMin: timeToMinutes(r.endTime),
      title: r.projectName ? `${r.name} · ${r.projectName}` : r.name,
      service: r.serviceType,
      status: r.status,
      orphan: false,
    });
  }
  for (const [date, day] of days) {
    const lists: [typeof day.booked, RequestStatus][] = [
      [day.booked, 'confirmado'],
      [day.holds, 'aguardando_confirmacao'],
    ];
    for (const [list, status] of lists) {
      for (const o of list) {
        if (known.has(o.ref)) continue;
        out.push({
          id: o.ref, date, start: o.start, end: o.end,
          startMin: timeToMinutes(o.start), endMin: timeToMinutes(o.end),
          title: 'Reservado', service: o.service, status, orphan: true,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}

/** Distribui eventos que se sobrepõem lado a lado. */
export function layoutLanes(events: CalEvent[]): Map<string, { lane: number; lanes: number }> {
  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: CalEvent[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds: number[] = [];
    const assigned = cluster.map((e) => {
      let lane = laneEnds.findIndex((end) => end <= e.startMin);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = e.endMin;
      return { e, lane };
    });
    for (const { e, lane } of assigned) result.set(e.id, { lane, lanes: laneEnds.length });
    cluster = [];
  };

  for (const e of [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)) {
    if (cluster.length && e.startMin >= clusterEnd) flush();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.endMin);
    if (cluster.length === 1) clusterEnd = e.endMin;
  }
  if (cluster.length) flush();
  return result;
}

export interface SlotCheck {
  /** Impedem o agendamento (reserva confirmada no mesmo horário). */
  conflicts: string[];
  /** Avisos: o administrador pode seguir mesmo assim. */
  warnings: string[];
}

export function checkSlot(
  date: ISODate,
  start: HHMM,
  end: HHMM,
  settings: AvailabilitySettings | null,
  day: CalendarDay | undefined,
): SlotCheck {
  const interval = { start, end };
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const overlaps = (i: TimeInterval) => timeToMinutes(i.start) < e && s < timeToMinutes(i.end);
  const conflicts = day
    ? findConflicts({ ...day, mode: 'padrao', blocks: [] }, interval, settings?.booking.bufferMin ?? 0)
    : [];
  const warnings: string[] = [];
  if (day?.mode === 'fechado') warnings.push('O dia está fechado na agenda.');
  else if (settings) {
    const windows = openWindows(date, settings, day);
    if (!windows.some((w) => timeToMinutes(w.start) <= s && e <= timeToMinutes(w.end))) {
      warnings.push('Parte do horário fica fora do expediente.');
    }
  }
  for (const b of day?.blocks ?? []) {
    if (overlaps(b)) warnings.push(`Há um bloqueio das ${formatTime(b.start)} às ${formatTime(b.end)}.`);
  }
  for (const h of day?.holds ?? []) {
    if (overlaps(h)) warnings.push(`Há um pedido em análise das ${formatTime(h.start)} às ${formatTime(h.end)}.`);
  }
  return { conflicts, warnings };
}

export { closedRanges, dayMonthShort, formatWeekTitle, hourRange, monthCells, timeLabel, weekDates, weekStart, type CalendarView } from '../../../utils/agendaView';
