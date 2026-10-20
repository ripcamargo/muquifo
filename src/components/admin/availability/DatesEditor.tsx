import { useMemo, useState } from 'react';
import { useAvailability } from '../../../hooks/useAvailability';
import { setDaysMode } from '../../../services/availability';
import { friendlyError } from '../../../services/firebase/errors';
import type { AvailabilitySettings, CalendarDay, ISODate } from '../../../types';
import { addDays, diffDays, formatDateLong, formatDateShort, monthOf, monthRange, zonedNow } from '../../../utils/datetime';
import { openWindows } from '../../../utils/slots';
import { MonthCalendar, type DayView } from '../../calendar/MonthCalendar';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useToast } from '../../ui/Toast';
import { DayEditor } from './DayEditor';

type DayKind = 'open' | 'partial' | 'closed';

/** Classifica a data para o calendário do painel. */
export function classifyDay(date: ISODate, settings: AvailabilitySettings, day?: CalendarDay): { kind: DayKind; tag: string } {
  const windows = openWindows(date, settings, day);
  if (!windows.length) return { kind: 'closed', tag: day?.mode === 'fechado' ? 'FECH' : '' };
  const changed = day && (day.mode === 'especial' || day.extraIntervals.length > 0 || day.blocks.length > 0);
  const taken = (day?.booked.length ?? 0) + (day?.holds.length ?? 0);
  if (changed) return { kind: 'partial', tag: taken ? `${taken} res` : day.mode === 'especial' ? 'ESP' : 'BLOQ' };
  return { kind: 'open', tag: taken ? `${taken} res` : '' };
}

export function DatesEditor({ settings }: { settings: AvailabilitySettings }) {
  const toast = useToast();
  const today = zonedNow(settings.timezone).date;
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState<ISODate>(today);
  const { first, last } = monthRange(month);
  const { days, status, error, retry } = useAvailability(first, last);

  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeAction, setRangeAction] = useState<'fechado' | 'padrao' | null>(null);
  const [rangeBusy, setRangeBusy] = useState(false);

  const describe = useMemo(
    () =>
      (date: ISODate): DayView => {
        const { kind, tag } = classifyDay(date, settings, days.get(date));
        const label = { open: 'aberto', partial: 'com alterações', closed: 'fechado' }[kind];
        return {
          enabled: true,
          className: `is-${kind} ${date < today ? 'is-past' : ''}`,
          label: `${formatDateLong(date)}: ${label}${tag ? ` (${tag})` : ''}`,
          extra: <span className="adm-day-tag" aria-hidden="true">{tag || ' '}</span>,
        };
      },
    [settings, days, today],
  );

  const rangeDays = rangeFrom && rangeTo && rangeTo >= rangeFrom ? diffDays(rangeTo, rangeFrom) + 1 : 0;

  async function applyRange() {
    if (!rangeAction || !rangeDays) return;
    setRangeBusy(true);
    try {
      const dates = Array.from({ length: rangeDays }, (_, i) => addDays(rangeFrom, i));
      await setDaysMode(dates, rangeAction);
      toast(rangeAction === 'fechado' ? `${rangeDays} dias fechados.` : `${rangeDays} dias voltaram ao horário da semana.`);
      setRangeFrom('');
      setRangeTo('');
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setRangeBusy(false);
      setRangeAction(null);
    }
  }

  return (
    <div className="adm-dates">
      <div>
        <section className="adm-card adm-cal">
          {status === 'error' ? (
            <Alert tone="error" actions={<Button size="sm" onClick={retry}>Tentar de novo</Button>}>
              {friendlyError(error)}
            </Alert>
          ) : (
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              today={today}
              selected={selected}
              onSelect={setSelected}
              describeDay={describe}
            />
          )}
          <div className="adm-legend" aria-hidden="true">
            <span><i /> Aberto</span>
            <span><i className="is-partial" /> Com alterações</span>
            <span><i className="is-closed" /> Fechado</span>
            <span>“2 res” = reservas/pedidos em análise</span>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <h3>Vários dias de uma vez</h3>
          </div>
          <p className="mq-muted" style={{ fontSize: '0.875rem' }}>
            Férias, viagem, reforma… Feche um período inteiro ou devolva os dias ao horário da semana.
          </p>
          <div className="adm-block-form" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="mq-field">
              <label className="mq-field__label" htmlFor="r-from">De</label>
              <input id="r-from" className="mq-input" type="date" min={today} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
            </div>
            <div className="mq-field">
              <label className="mq-field__label" htmlFor="r-to">Até</label>
              <input id="r-to" className="mq-input" type="date" min={rangeFrom || today} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
            </div>
            <Button variant="danger" size="sm" disabled={!rangeDays} onClick={() => setRangeAction('fechado')}>
              Fechar período
            </Button>
            <Button size="sm" disabled={!rangeDays} onClick={() => setRangeAction('padrao')}>
              Restaurar período
            </Button>
          </div>
        </section>
      </div>

      <section className="adm-card" aria-live="polite">
        {status === 'loading' ? (
          <div className="mq-skeleton" style={{ height: 320 }} />
        ) : (
          <DayEditor key={selected} date={selected} settings={settings} day={days.get(selected)} />
        )}
      </section>

      <ConfirmDialog
        open={rangeAction !== null}
        title={rangeAction === 'fechado' ? 'Fechar período?' : 'Restaurar período?'}
        confirmLabel={rangeAction === 'fechado' ? `Fechar ${rangeDays} dias` : `Restaurar ${rangeDays} dias`}
        danger={rangeAction === 'fechado'}
        loading={rangeBusy}
        onConfirm={applyRange}
        onCancel={() => setRangeAction(null)}
      >
        {rangeFrom && rangeTo && (
          <>
            De {formatDateShort(rangeFrom)} a {formatDateShort(rangeTo)}.{' '}
            {rangeAction === 'fechado'
              ? 'Nenhum horário será oferecido nesses dias. Reservas já confirmadas continuam valendo — avise os clientes.'
              : 'Horários especiais, intervalos extras e bloqueios desses dias serão removidos.'}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
