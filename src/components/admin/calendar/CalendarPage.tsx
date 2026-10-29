import { ChevronLeft, ChevronRight, ImageDown, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAvailability } from '../../../hooks/useAvailability';
import { friendlyError } from '../../../services/firebase/errors';
import type { ISODate } from '../../../types';
import { addDays, addMonths, formatMonth, monthOf, zonedNow } from '../../../utils/datetime';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useAdminData } from '../AdminData';
import { LoadingCards } from '../DashboardPage';
import { buildEvents, formatWeekTitle, monthCells, weekDates, type CalendarView } from './calendarModel';
import { downloadBlob, renderAgendaImage } from '../../calendar/agendaImage';
import { MonthView } from './MonthView';
import { NewBookingDialog, type BookingDraft } from './NewBookingDialog';
import { WeekView } from './WeekView';

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
];

export function CalendarPage() {
  const { requests, openRequest } = useAdminData();
  const toast = useToast();
  const [view, setView] = useState<CalendarView>('semana');
  const [now, setNow] = useState(() => zonedNow());
  const [anchor, setAnchor] = useState<ISODate>(() => zonedNow().date);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(zonedNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  const month = monthOf(anchor);
  const dates = useMemo(() => (view === 'semana' ? weekDates(anchor) : monthCells(month).flat()), [view, anchor, month]);
  const first = dates[0];
  const last = dates[dates.length - 1];

  const { status, error, settings, days, retry } = useAvailability(first, last);
  const events = useMemo(() => (requests ? buildEvents(requests, days, first, last) : []), [requests, days, first, last]);

  const title = view === 'semana' ? formatWeekTitle(dates) : formatMonth(month);
  const step = (dir: -1 | 1) =>
    setAnchor((a) => (view === 'semana' ? addDays(a, dir * 7) : `${addMonths(monthOf(a), dir)}-01`));

  async function exportImage() {
    if (!settings) return;
    setExporting(true);
    try {
      const blob = await renderAgendaImage({ view, dates, month, title, settings, days });
      downloadBlob(blob, `agenda-muquifo-${view === 'semana' ? first : month}.png`);
      toast('Imagem da agenda baixada.');
    } catch (err) {
      toast(friendlyError(err), 'error');
    } finally {
      setExporting(false);
    }
  }

  const newBooking = (date: ISODate = anchor < now.date ? now.date : anchor, start = '18:00') => setDraft({ date, start });

  if (!requests) return <LoadingCards />;

  return (
    <>
      <div className="adm-page-title">
        <div>
          <h1 className="mq-display">Calendário</h1>
          <p>Tudo o que está agendado, os horários bloqueados e o que ainda está livre.</p>
        </div>
        <div className="adm-cal-actions">
          <Button
            icon={<ImageDown size={18} aria-hidden="true" />}
            onClick={exportImage}
            loading={exporting}
            disabled={!settings}
            title="Gera uma imagem só com horários livres e ocupados (sem nomes) para enviar a clientes"
          >
            Baixar imagem
          </Button>
          <Button variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={() => newBooking()}>
            Novo agendamento
          </Button>
        </div>
      </div>

      <div className="adm-cal-bar">
        <div className="adm-cal-nav">
          <Button size="sm" onClick={() => setAnchor(now.date)}>
            Hoje
          </Button>
          <button type="button" className="mq-icon-btn" onClick={() => step(-1)} aria-label={view === 'semana' ? 'Semana anterior' : 'Mês anterior'}>
            <ChevronLeft size={22} />
          </button>
          <button type="button" className="mq-icon-btn" onClick={() => step(1)} aria-label={view === 'semana' ? 'Próxima semana' : 'Próximo mês'}>
            <ChevronRight size={22} />
          </button>
          <h2 className="adm-cal-title" aria-live="polite">
            {title}
          </h2>
        </div>
        <div className="adm-segment adm-segment--2" role="radiogroup" aria-label="Tipo de visualização">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" role="radio" aria-checked={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'error' && (
        <Alert
          tone="error"
          className="mb-3"
          title="Não foi possível carregar a disponibilidade"
          actions={
            <Button size="sm" onClick={retry}>
              Tentar de novo
            </Button>
          }
        >
          {friendlyError(error)}
        </Alert>
      )}
      {status === 'unpublished' && (
        <Alert tone="warning" className="mb-3" title="A disponibilidade ainda não foi publicada">
          Os agendamentos aparecem, mas expediente e bloqueios só entram aqui depois de publicar a agenda em
          “Disponibilidade”.
        </Alert>
      )}

      {view === 'semana' ? (
        <WeekView
          dates={dates}
          settings={settings}
          days={days}
          events={events}
          today={now.date}
          nowMin={now.minutes}
          onSlot={(date, start) => newBooking(date, start)}
          onOpen={openRequest}
        />
      ) : (
        <MonthView
          month={month}
          settings={settings}
          days={days}
          events={events}
          today={now.date}
          onPickDay={(date) => {
            setAnchor(date);
            setView('semana');
          }}
          onOpen={openRequest}
        />
      )}

      <ul className="adm-legend adm-cal-legend" aria-label="Legenda">
        <li><i className="is-confirmado" /> Confirmado</li>
        <li><i className="is-aguardando_confirmacao" /> Em análise</li>
        <li><i className="is-pedido_preparado" /> Pedido novo (ainda não retém o horário)</li>
        <li><i className="is-block" /> Bloqueio</li>
        <li><i className="is-closed" /> Fora do expediente / fechado</li>
      </ul>

      {draft && <NewBookingDialog draft={draft} settings={settings} days={days} onClose={() => setDraft(null)} />}
    </>
  );
}
