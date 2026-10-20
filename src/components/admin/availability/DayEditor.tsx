import { Ban, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { serviceInfo } from '../../../config/studio';
import { saveDayOverrides, type DayOverrides } from '../../../services/availability';
import { friendlyError } from '../../../services/firebase/errors';
import type { AvailabilitySettings, BlockReason, CalendarDay, DayMode, ISODate, TimeInterval } from '../../../types';
import { formatDateLong, formatTime, formatTimeRange, isHHMM, timeToMinutes, weekdayOf, zonedNow } from '../../../utils/datetime';
import { dayTimeline, emptyDay, validateIntervals } from '../../../utils/slots';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useToast } from '../../ui/Toast';
import { useAdminData } from '../AdminData';
import { IntervalsEditor } from './IntervalsEditor';

const REASONS: Record<BlockReason, string> = {
  pessoal: 'Uso pessoal',
  manutencao: 'Manutenção',
  compromisso: 'Compromisso fora do site',
  outro: 'Outro',
};

const MODES: { id: DayMode; label: string }[] = [
  { id: 'padrao', label: 'Horário da semana' },
  { id: 'especial', label: 'Horário especial' },
  { id: 'fechado', label: 'Fechado' },
];

const PREVIEW_NOW = new Date('2000-01-01T00:00:00Z');

const SEGMENT_TEXT = { livre: 'livre', ocupado: 'ocupado', em_analise: 'em análise', indisponivel: 'indisponível' } as const;

const overridesOf = (day: CalendarDay): DayOverrides => ({
  mode: day.mode,
  intervals: day.intervals,
  extraIntervals: day.extraIntervals,
  blocks: day.blocks,
});

interface Props {
  date: ISODate;
  settings: AvailabilitySettings;
  day?: CalendarDay;
}

/** Exceções de uma data: abrir/fechar, horário especial, intervalos extras e bloqueios. */
export function DayEditor({ date, settings, day }: Props) {
  const toast = useToast();
  const { requests, openRequest } = useAdminData();
  const remote = day ?? emptyDay(date);
  const [draft, setDraft] = useState<DayOverrides>(() => overridesOf(remote));
  const baseline = useRef(JSON.stringify(overridesOf(remote)));
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [block, setBlock] = useState<{ start: string; end: string; reason: BlockReason }>({ start: '14:00', end: '17:00', reason: 'pessoal' });
  const [blockError, setBlockError] = useState<string | null>(null);

  // Se a data mudar em outro aparelho e não houver edição local, acompanha.
  const remoteKey = JSON.stringify(overridesOf(remote));
  useEffect(() => {
    setDraft((current) => (JSON.stringify(current) === baseline.current ? overridesOf(remote) : current));
    baseline.current = remoteKey;
  }, [remoteKey]);

  const today = zonedNow(settings.timezone).date;
  const past = date < today;
  const dirty = JSON.stringify(draft) !== remoteKey;
  const hasOverrides = remote.mode !== 'padrao' || remote.extraIntervals.length > 0 || remote.blocks.length > 0 || remote.intervals.length > 0;

  const weekly = settings.weekly[String(weekdayOf(date))] ?? [];
  const error =
    draft.mode === 'especial' && !draft.intervals.length
      ? 'Adicione ao menos um intervalo ao horário especial (ou marque o dia como fechado).'
      : validateIntervals(draft.mode === 'especial' ? draft.intervals : []) ?? validateIntervals(draft.extraIntervals);

  const previewDay: CalendarDay = { ...remote, ...draft };
  const previewSegments = dayTimeline(date, settings, previewDay, PREVIEW_NOW);
  const occupations = [
    ...remote.booked.map((o) => ({ ...o, kind: 'Confirmado' })),
    ...remote.holds.map((o) => ({ ...o, kind: 'Em análise' })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const blockConflicts = draft.blocks.filter((b) =>
    remote.booked.some((o) => timeToMinutes(o.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(o.end)),
  );

  function addBlock() {
    if (!isHHMM(block.start) || !isHHMM(block.end) || timeToMinutes(block.end) <= timeToMinutes(block.start)) {
      setBlockError('O fim do bloqueio precisa ser depois do início.');
      return;
    }
    setBlockError(null);
    setDraft((d) => ({
      ...d,
      blocks: [...d.blocks, { id: `${Date.now().toString(36)}`, ...block }].sort((a, b) => a.start.localeCompare(b.start)),
    }));
  }

  async function save(overrides: DayOverrides, message: string) {
    setSaving(true);
    try {
      await saveDayOverrides(date, {
        ...overrides,
        intervals: overrides.mode === 'especial' ? overrides.intervals : [],
        extraIntervals: overrides.mode === 'padrao' ? overrides.extraIntervals : [],
      });
      toast(message);
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setSaving(false);
      setConfirmReset(false);
    }
  }

  const setMode = (mode: DayMode) =>
    setDraft((d) => ({
      ...d,
      mode,
      intervals: mode === 'especial' && !d.intervals.length ? (weekly.length ? weekly : [{ start: '14:00', end: '18:00' }]) : d.intervals,
    }));

  return (
    <div>
      <div className="adm-card__head">
        <h2 style={{ textTransform: 'none', fontFamily: 'var(--mq-font-display)', fontSize: '1.6rem', letterSpacing: 0 }}>
          {formatDateLong(date)}
        </h2>
      </div>

      {past && (
        <Alert tone="info" className="mb-3">
          Data passada — só para consulta.
        </Alert>
      )}

      <fieldset disabled={past || saving}>
        <div className="adm-segment" role="radiogroup" aria-label="Funcionamento nesta data">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={draft.mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        {draft.mode === 'padrao' && (
          <div className="mb-4">
            <p className="mb-2">
              <span className="mq-muted">Semana: </span>
              {weekly.length ? weekly.map((w) => formatTimeRange(w.start, w.end)).join(' · ') : 'fechado'}
            </p>
            <div className="mq-label mq-muted mb-2">Intervalos extras nesta data</div>
            <IntervalsEditor
              label="Intervalos extras"
              addLabel="Abrir intervalo extra"
              value={draft.extraIntervals}
              onChange={(v: TimeInterval[]) => setDraft((d) => ({ ...d, extraIntervals: v }))}
            />
          </div>
        )}

        {draft.mode === 'especial' && (
          <div className="mb-4">
            <div className="mq-label mq-muted mb-2">Horários desta data (substituem a semana)</div>
            <IntervalsEditor
              label="Horário especial"
              value={draft.intervals}
              onChange={(v) => setDraft((d) => ({ ...d, intervals: v }))}
            />
          </div>
        )}

        {draft.mode === 'fechado' ? (
          <Alert tone="warning" className="mb-4">
            Dia inteiro bloqueado: nenhum horário será oferecido.
          </Alert>
        ) : (
          <div className="mb-4">
            <div className="mq-label mq-muted mb-2">Bloqueios de período</div>
            {draft.blocks.length > 0 && (
              <ul className="adm-block-list">
                {draft.blocks.map((b) => (
                  <li key={b.id}>
                    <span>
                      <Ban size={15} aria-hidden="true" /> {formatTimeRange(b.start, b.end)} · {REASONS[b.reason]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Undo2 size={15} aria-hidden="true" />}
                      onClick={() => setDraft((d) => ({ ...d, blocks: d.blocks.filter((x) => x.id !== b.id) }))}
                    >
                      Reabrir
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="adm-block-form">
              <div className="mq-field">
                <label className="mq-field__label" htmlFor="b-start">De</label>
                <input id="b-start" className="mq-input" type="time" step={900} value={block.start} onChange={(e) => setBlock({ ...block, start: e.target.value })} />
              </div>
              <div className="mq-field">
                <label className="mq-field__label" htmlFor="b-end">Até</label>
                <input id="b-end" className="mq-input" type="time" step={900} value={block.end} onChange={(e) => setBlock({ ...block, end: e.target.value })} />
              </div>
              <div className="mq-field">
                <label className="mq-field__label" htmlFor="b-reason">Motivo</label>
                <select id="b-reason" className="mq-input" value={block.reason} onChange={(e) => setBlock({ ...block, reason: e.target.value as BlockReason })}>
                  {Object.entries(REASONS).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>
              <Button size="sm" onClick={addBlock} icon={<Ban size={15} aria-hidden="true" />}>
                Bloquear
              </Button>
            </div>
            {blockError && <p className="adm-intervals__error mt-2" role="alert">{blockError}</p>}
            <p className="mq-muted mt-2 mb-0" style={{ fontSize: '0.8125rem' }}>
              O motivo fica visível só para você; o site mostra apenas “ocupado”.
            </p>
          </div>
        )}
      </fieldset>

      {blockConflicts.length > 0 && (
        <Alert tone="warning" className="mb-3">
          Há bloqueio sobre uma reserva já confirmada. A reserva continua valendo — combine com o cliente.
        </Alert>
      )}

      {occupations.length > 0 && (
        <div className="mb-4">
          <div className="mq-label mq-muted mb-2">Reservas e pedidos nesta data</div>
          <ul className="adm-block-list">
            {occupations.map((o) => {
              const req = requests?.find((r) => r.id === o.ref);
              return (
                <li key={o.ref + o.kind}>
                  <span>
                    {formatTimeRange(o.start, o.end)} · {req?.name ?? 'Pedido'} · {serviceInfo(o.service).name} · <span className="mq-muted">{o.kind}</span>
                  </span>
                  {req && (
                    <Button variant="ghost" size="sm" onClick={() => openRequest(req.id)}>
                      Ver
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <div className="mq-label mq-muted mb-2">Prévia do que o site vai oferecer</div>
        <div className="adm-preview">
          {previewSegments.length ? (
            previewSegments.map((p) => (
              <span key={p.start} className={p.state !== 'livre' ? 'is-taken' : ''}>
                {formatTime(p.start)}–{formatTime(p.end)}
                {p.state !== 'livre' && ' · ' + SEGMENT_TEXT[p.state]}
              </span>
            ))
          ) : (
            <span className="is-taken">Fechado</span>
          )}
        </div>
      </div>

      {!past && (
        <div className="d-flex flex-wrap gap-2 justify-content-end">
          {error && <p className="adm-intervals__error w-100 text-end mb-0" role="alert">{error}</p>}
          {hasOverrides && (
            <Button variant="ghost" onClick={() => setConfirmReset(true)} disabled={saving}>
              Voltar ao padrão da semana
            </Button>
          )}
          {dirty && (
            <Button variant="ghost" onClick={() => setDraft(overridesOf(remote))} disabled={saving}>
              Descartar
            </Button>
          )}
          <Button variant="primary" onClick={() => save(draft, 'Data atualizada.')} loading={saving} disabled={!dirty || !!error}>
            Salvar data
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        title="Voltar ao padrão?"
        confirmLabel="Restaurar"
        loading={saving}
        onConfirm={() => save({ mode: 'padrao', intervals: [], extraIntervals: [], blocks: [] }, 'Data restaurada ao horário da semana.')}
        onCancel={() => setConfirmReset(false)}
      >
        Horário especial, intervalos extras e bloqueios desta data serão removidos. Reservas confirmadas continuam valendo.
      </ConfirmDialog>
    </div>
  );
}
