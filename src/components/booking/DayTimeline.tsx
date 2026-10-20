import type { SegmentState, TimelineSegment } from '../../types';
import { formatTime, timeToMinutes } from '../../utils/datetime';

const LABELS: Record<SegmentState, string> = {
  livre: 'Livre',
  ocupado: 'Ocupado',
  em_analise: 'Em análise',
  indisponivel: 'Indisponível',
};

/**
 * Barra do expediente do dia. É só um apoio visual (aria-hidden): a lista de períodos livres,
 * logo abaixo, traz a mesma informação em texto. Os estados também têm textura, não só cor.
 */
export function DayTimeline({ segments }: { segments: TimelineSegment[] }) {
  if (!segments.length) return null;
  const first = timeToMinutes(segments[0].start);
  const last = timeToMinutes(segments[segments.length - 1].end);
  const total = last - first || 1;

  // Intervalos entre expedientes (ex.: almoço) entram como "indisponível".
  const filled: TimelineSegment[] = [];
  for (const seg of segments) {
    const prev = filled[filled.length - 1];
    if (prev && prev.end !== seg.start) filled.push({ start: prev.end, end: seg.start, state: 'indisponivel' });
    filled.push(seg);
  }
  const present = new Set(filled.map((s) => s.state));
  const hourMarks: number[] = [];
  for (let m = Math.ceil(first / 60) * 60; m <= last; m += 60) hourMarks.push(m);
  const labelEvery = hourMarks.length > 9 ? 3 : hourMarks.length > 5 ? 2 : 1;

  return (
    <div className="mq-timeline" aria-hidden="true">
      <div className="mq-timeline__bar">
        {filled.map((s) => (
          <span
            key={s.start}
            className={`mq-timeline__seg is-${s.state}`}
            style={{ width: `${((timeToMinutes(s.end) - timeToMinutes(s.start)) / total) * 100}%` }}
            title={`${formatTime(s.start)}–${formatTime(s.end)}: ${LABELS[s.state]}`}
          />
        ))}
      </div>
      <div className="mq-timeline__scale">
        {hourMarks.map((m, i) =>
          i % labelEvery === 0 || m === last ? (
            <span key={m} style={{ left: `${((m - first) / total) * 100}%` }}>
              {formatTime(`${String(Math.floor(m / 60)).padStart(2, '0')}:00`)}
            </span>
          ) : null,
        )}
      </div>
      <div className="mq-timeline__legend">
        {(['livre', 'ocupado', 'em_analise', 'indisponivel'] as SegmentState[])
          .filter((s) => present.has(s))
          .map((s) => (
            <span key={s}>
              <i className={`is-${s}`} /> {LABELS[s]}
            </span>
          ))}
      </div>
    </div>
  );
}
