// Imagem da agenda para enviar a clientes. Desenhada direto em canvas (sem dependências) e
// SEM dados pessoais: só mostra o que está livre, ocupado ou indisponível.
import { studio } from '../../config/studio';
import type { AvailabilitySettings, CalendarDay, ISODate, TimelineSegment } from '../../types';
import { formatTime, STUDIO_TIMEZONE, timeToMinutes, WEEKDAY_SHORT, weekdayOf, zonedNow } from '../../utils/datetime';
import { dayTimeline, openWindows } from '../../utils/slots';
import { closedRanges, hourRange, type CalendarView } from '../../utils/agendaView';

export interface ExportInput {
  view: CalendarView;
  /** Semana: 7 datas. Mês: todas as datas da grade (múltiplo de 7). */
  dates: ISODate[];
  /** Mês exibido (AAAA-MM), para esmaecer dias dos meses vizinhos. */
  month: string;
  title: string;
  settings: AvailabilitySettings;
  days: Map<ISODate, CalendarDay>;
  /** Último dia que aceita reservas: depois dele a agenda aparece como indisponível. */
  lastBookable?: ISODate;
}

const C = {
  paper: '#f4efdc',
  ink: '#2a1a1e',
  muted: '#7a6d68',
  wine: '#6e162f',
  cream: '#ece7d3',
  line: '#d8d0b6',
  freeBg: '#d8ecd9',
  freeLine: '#3f8f5a',
  freeInk: '#1f5a36',
  offBg: '#e4dfcc',
  hatch: '#c9c2a8',
  fullBg: '#ecd3d9',
};

const SCALE = 2;
const WIDTH = 1200;
const MARGIN = 40;
const FONT_DISPLAY = '"Anton", "Impact", "Arial Narrow", sans-serif';
const FONT_LABEL = '"Oswald", "Arial Narrow", sans-serif';
const FONT_BODY = '"Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

type Ctx = CanvasRenderingContext2D;

function hatch(ctx: Ctx, x: number, y: number, w: number, h: number, bg = C.offBg) {
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = C.hatch;
  ctx.lineWidth = 1.5;
  for (let k = -h; k < w; k += 9) {
    ctx.beginPath();
    ctx.moveTo(x + k, y + h);
    ctx.lineTo(x + k + h, y);
    ctx.stroke();
  }
  ctx.restore();
}

function text(ctx: Ctx, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load(`34px ${FONT_DISPLAY}`),
      document.fonts.load(`500 20px ${FONT_LABEL}`),
      document.fonts.load(`400 16px ${FONT_BODY}`),
      document.fonts.load(`600 16px ${FONT_BODY}`),
    ]);
  } catch {
    // Sem as fontes da marca, o canvas usa as alternativas da lista.
  }
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/img/logo-wordmark.webp';
  });
}

function header(ctx: Ctx, logo: HTMLImageElement | null, title: string): number {
  const h = 128;
  ctx.fillStyle = C.wine;
  ctx.fillRect(0, 0, WIDTH, h);
  if (logo) {
    const lh = 46;
    ctx.drawImage(logo, MARGIN, (h - lh) / 2, (lh * logo.width) / logo.height, lh);
  } else {
    text(ctx, studio.shortName.toUpperCase(), MARGIN, 76, `34px ${FONT_DISPLAY}`, C.cream);
  }
  text(ctx, 'AGENDA DE HORÁRIOS', WIDTH - MARGIN, 62, `34px ${FONT_DISPLAY}`, C.cream, 'right');
  text(ctx, title, WIDTH - MARGIN, 96, `500 22px ${FONT_LABEL}`, 'rgba(236,231,211,0.8)', 'right');
  return h;
}

function legend(ctx: Ctx, y: number, items: { label: string; kind: 'free' | 'busy' | 'off' }[]) {
  let x = MARGIN;
  for (const item of items) {
    if (item.kind === 'free') {
      ctx.fillStyle = C.freeBg;
      ctx.fillRect(x, y, 22, 22);
      ctx.strokeStyle = C.freeLine;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, 20, 20);
    } else if (item.kind === 'busy') {
      ctx.fillStyle = C.wine;
      ctx.fillRect(x, y, 22, 22);
    } else {
      hatch(ctx, x, y, 22, 22);
    }
    text(ctx, item.label, x + 32, y + 17, `500 17px ${FONT_BODY}`, C.ink);
    x += 32 + ctx.measureText(item.label).width + 28;
  }
}

function footer(ctx: Ctx, y: number) {
  const stamp = new Intl.DateTimeFormat('pt-BR', {
    timeZone: STUDIO_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(WIDTH - MARGIN, y);
  ctx.stroke();
  text(ctx, 'Pra reservar, chama no WhatsApp ou agenda pelo site.', MARGIN, y + 34, `600 17px ${FONT_BODY}`, C.ink);
  text(ctx, `${studio.whatsappDisplay} · ${window.location.host}`, MARGIN, y + 60, `400 15px ${FONT_BODY}`, C.muted);
  text(ctx, `Atualizado em ${stamp.replace(', ', ' às ')}`, WIDTH - MARGIN, y + 60, `400 15px ${FONT_BODY}`, C.muted, 'right');
  return y + 84;
}

const range = (s: { start: string; end: string }) => `${formatTime(s.start)}–${formatTime(s.end)}`;

// ── Semana ────────────────────────────────────────────────────────────────────

function drawWeek(ctx: Ctx, input: ExportInput, top: number, startMin: number, endMin: number, hourH: number) {
  const { dates, settings, days } = input;
  const gutter = 56;
  const colW = (WIDTH - MARGIN * 2 - gutter) / 7;
  const headH = 58;
  const gridTop = top + headH;
  const gridH = ((endMin - startMin) / 60) * hourH;
  const y = (min: number) => gridTop + ((min - startMin) / 60) * hourH;

  // Cabeçalho dos dias
  dates.forEach((date, i) => {
    const x = MARGIN + gutter + i * colW;
    text(ctx, WEEKDAY_SHORT[weekdayOf(date)].toUpperCase(), x + colW / 2, top + 24, `500 17px ${FONT_LABEL}`, C.muted, 'center');
    text(ctx, String(Number(date.slice(8))), x + colW / 2, top + 52, `26px ${FONT_DISPLAY}`, C.ink, 'center');
  });

  // Fundo, linhas de hora
  ctx.fillStyle = '#fbf8ec';
  ctx.fillRect(MARGIN + gutter, gridTop, colW * 7, gridH);
  for (let m = startMin; m <= endMin; m += 60) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN + gutter - 6, y(m));
    ctx.lineTo(MARGIN + gutter + colW * 7, y(m));
    ctx.stroke();
    if (m < endMin) text(ctx, `${m / 60}h`, MARGIN + gutter - 12, y(m) + 5, `500 14px ${FONT_BODY}`, C.muted, 'right');
  }

  dates.forEach((date, i) => {
    const x = MARGIN + gutter + i * colW;
    const day = days.get(date);
    const outside = !!input.lastBookable && date > input.lastBookable;
    const windows = outside ? [] : openWindows(date, settings, day);

    for (const [s, e] of closedRanges(windows, startMin, endMin)) hatch(ctx, x, y(s), colW, y(e) - y(s));
    if (!windows.length && !outside) {
      text(ctx, 'Fechado', x + colW / 2, gridTop + 26, `500 16px ${FONT_LABEL}`, C.muted, 'center');
    }

    const segments = outside ? [] : dayTimeline(date, settings, day);
    for (const seg of segments) {
      const s = Math.max(startMin, timeToMinutes(seg.start));
      const e = Math.min(endMin, timeToMinutes(seg.end));
      if (e <= s) continue;
      drawSegment(ctx, seg, x + 3, y(s) + 1, colW - 6, y(e) - y(s) - 2);
    }

    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, gridTop);
    ctx.lineTo(x, gridTop + gridH);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(MARGIN + gutter + colW * 7, gridTop);
  ctx.lineTo(MARGIN + gutter + colW * 7, gridTop + gridH);
  ctx.stroke();
}

function drawSegment(ctx: Ctx, seg: TimelineSegment, x: number, y: number, w: number, h: number) {
  if (seg.state === 'indisponivel') {
    hatch(ctx, x - 3, y - 1, w + 6, h + 2);
    return;
  }
  const free = seg.state === 'livre';
  if (free) {
    ctx.fillStyle = C.freeBg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.freeLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  } else {
    ctx.fillStyle = C.wine;
    ctx.fillRect(x, y, w, h);
  }
  const ink = free ? C.freeInk : C.cream;
  const label = free ? 'Livre' : 'Ocupado';
  if (h >= 46) {
    text(ctx, label, x + w / 2, y + h / 2 - 2, `600 17px ${FONT_BODY}`, ink, 'center');
    text(ctx, range(seg), x + w / 2, y + h / 2 + 18, `400 14px ${FONT_BODY}`, ink, 'center');
  } else if (h >= 24) {
    text(ctx, free ? `Livre ${range(seg)}` : label, x + w / 2, y + h / 2 + 5, `600 13px ${FONT_BODY}`, ink, 'center');
  }
}

// ── Mês ───────────────────────────────────────────────────────────────────────

function drawMonth(ctx: Ctx, input: ExportInput, top: number, rowH: number) {
  const { dates, month, settings, days } = input;
  const colW = (WIDTH - MARGIN * 2) / 7;
  const today = zonedNow(settings.timezone).date;

  WEEKDAY_SHORT.forEach((d, i) => {
    text(ctx, d.toUpperCase(), MARGIN + i * colW + colW / 2, top + 24, `500 17px ${FONT_LABEL}`, C.muted, 'center');
  });
  const gridTop = top + 38;

  dates.forEach((date, k) => {
    const x = MARGIN + (k % 7) * colW;
    const y = gridTop + Math.floor(k / 7) * rowH;
    const inMonth = date.slice(0, 7) === month;
    const day = days.get(date);
    const outside = !!input.lastBookable && date > input.lastBookable;
    const windows = outside ? [] : openWindows(date, settings, day);
    const segments = outside ? [] : dayTimeline(date, settings, day);
    const free = segments.filter((s) => s.state === 'livre');
    const past = date < today;

    let kind: 'free' | 'full' | 'off' = 'off';
    if (!past && windows.length) kind = free.length ? 'free' : 'full';

    const cx = x + 2;
    const cy = y + 2;
    const cw = colW - 4;
    const ch = rowH - 4;
    if (kind === 'off') hatch(ctx, cx, cy, cw, ch);
    else {
      ctx.fillStyle = kind === 'free' ? C.freeBg : C.fullBg;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = kind === 'free' ? C.freeLine : C.wine;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 1, cy + 1, cw - 2, ch - 2);
    }
    if (!inMonth) {
      ctx.fillStyle = 'rgba(244,239,220,0.65)';
      ctx.fillRect(cx, cy, cw, ch);
    }

    const numberColor = inMonth ? C.ink : C.muted;
    text(ctx, String(Number(date.slice(8))), cx + 10, cy + 30, `24px ${FONT_DISPLAY}`, numberColor);
    if (!inMonth) return;
    if (date === today) {
      ctx.fillStyle = C.wine;
      ctx.beginPath();
      ctx.arc(cx + cw - 16, cy + 20, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (past || outside) return;
    if (!windows.length) {
      text(ctx, 'Fechado', cx + 10, cy + 56, `500 15px ${FONT_LABEL}`, C.muted);
    } else if (!free.length) {
      text(ctx, 'Lotado', cx + 10, cy + 56, `600 15px ${FONT_BODY}`, C.wine);
    } else {
      free.slice(0, 3).forEach((s, n) => text(ctx, range(s), cx + 10, cy + 56 + n * 21, `600 14px ${FONT_BODY}`, C.freeInk));
      if (free.length > 3) text(ctx, `+${free.length - 3}`, cx + cw - 10, cy + ch - 10, `600 13px ${FONT_BODY}`, C.freeInk, 'right');
    }
  });
}

// ── Entrada ───────────────────────────────────────────────────────────────────

export async function renderAgendaImage(input: ExportInput): Promise<Blob> {
  await loadFonts();
  const logo = await loadLogo();

  const isWeek = input.view === 'semana';
  const hours = isWeek ? hourRange(input.dates, input.settings, input.days, []) : null;
  const startMin = (hours?.startHour ?? 0) * 60;
  const endMin = (hours?.endHour ?? 0) * 60;
  const hourH = 44;
  const headH = 128;
  const legendH = 64;
  const bodyH = isWeek ? 58 + ((endMin - startMin) / 60) * hourH : 38 + (input.dates.length / 7) * 112;
  const footerH = 100;
  const height = headH + legendH + bodyH + 24 + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu gerar a imagem.');
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, WIDTH, height);
  header(ctx, logo, input.title);
  legend(ctx, headH + 24, [
    { label: 'Horário livre', kind: 'free' },
    { label: 'Ocupado', kind: 'busy' },
    { label: 'Indisponível / fechado', kind: 'off' },
  ]);

  const top = headH + legendH;
  if (isWeek) drawWeek(ctx, input, top, startMin, endMin, hourH);
  else drawMonth(ctx, input, top, 112);
  footer(ctx, top + bodyH + 24);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))), 'image/png'),
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Celular: abre a folha de compartilhamento (WhatsApp etc.). Retorna false se o aparelho não suporta. */
export async function shareImage(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title });
  } catch (err) {
    if ((err as DOMException)?.name !== 'AbortError') throw err;
  }
  return true;
}
