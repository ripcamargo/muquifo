import { X } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { services, serviceInfo } from '../../../config/studio';
import { useModal } from '../../../hooks/useModal';
import { createAdminBooking, SlotConflictError, type AdminBookingInput } from '../../../services/bookings';
import { friendlyError } from '../../../services/firebase/errors';
import type { AvailabilitySettings, CalendarDay, HHMM, ISODate, ServiceType } from '../../../types';
import { isISODate, minutesToTime, timeToMinutes } from '../../../utils/datetime';
import { maskPhone, validatePhone } from '../../../utils/phone';
import { cleanMultiline, collapseSpaces, validateName } from '../../../utils/text';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { useToast } from '../../ui/Toast';
import { checkSlot } from './calendarModel';

export interface BookingDraft {
  date: ISODate;
  start: HHMM;
}

interface Props {
  draft: BookingDraft;
  settings: AvailabilitySettings | null;
  days: Map<ISODate, CalendarDay>;
  onClose: () => void;
}

export function NewBookingDialog({ draft, settings, days, onClose }: Props) {
  const toast = useToast();
  const titleId = useId();
  const ref = useModal<HTMLDivElement>(true, () => !busy && onClose());

  const defaultMinutes = settings?.booking.minDurationMin ?? 60;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState<ServiceType>('ensaio');
  const [date, setDate] = useState(draft.date);
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(minutesToTime(Math.min(24 * 60, timeToMinutes(draft.start) + defaultMinutes)));
  const [status, setStatus] = useState<AdminBookingInput['status']>('confirmado');
  const [project, setProject] = useState('');
  const [people, setPeople] = useState('');
  const [description, setDescription] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string[] | null>(null);

  const info = serviceInfo(service);
  const nameCheck = validateName(name);
  const phoneCheck = validatePhone(phone);
  const dateOk = isISODate(date);
  const timeOk = !!start && !!end && timeToMinutes(end) > timeToMinutes(start);
  const peopleNumber = people ? Number(people) : null;
  const peopleOk = peopleNumber === null || (Number.isInteger(peopleNumber) && peopleNumber >= 1 && peopleNumber <= 50);

  const slot = useMemo(
    () => (dateOk && timeOk && days.has(date) ? checkSlot(date, start, end, settings, days.get(date)) : null),
    [dateOk, timeOk, date, start, end, settings, days],
  );
  const conflicts = status === 'confirmado' ? (slot?.conflicts ?? []) : [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    if (!nameCheck.ok || !phoneCheck.ok || !dateOk || !timeOk || !peopleOk || conflicts.length) return;
    setBusy(true);
    try {
      await createAdminBooking({
        name: nameCheck.value,
        whatsapp: phoneCheck.display,
        whatsappNormalized: phoneCheck.normalized,
        serviceType: service,
        projectName: collapseSpaces(project).slice(0, 120),
        peopleCount: info.fields.askPeople ? peopleNumber : null,
        description: info.fields.askDescription ? cleanMultiline(description, 1000) : '',
        notes: '',
        adminNotes: cleanMultiline(adminNotes, 2000),
        requestedDate: date,
        startTime: start,
        endTime: end,
        status,
      });
      toast(status === 'confirmado' ? 'Agendamento confirmado na agenda.' : 'Horário retido como “em análise”.');
      onClose();
    } catch (err) {
      if (err instanceof SlotConflictError) setServerError(err.conflicts);
      else toast(friendlyError(err), 'error');
      setBusy(false);
    }
  }

  return (
    <div className="mq-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div ref={ref} className="mq-dialog adm-booking-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="adm-booking-dialog__head">
          <h2 id={titleId} className="mq-dialog__title">
            Novo agendamento
          </h2>
          <button type="button" className="mq-icon-btn" onClick={onClose} disabled={busy} aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        <p className="mq-muted" style={{ fontSize: '0.875rem' }}>
          Para quem pediu fora do site (WhatsApp, pessoalmente…). O horário já entra na agenda.
        </p>

        <form onSubmit={submit} noValidate>
          <div className="adm-booking-dialog__grid">
            <Field label="Nome" error={submitted && !nameCheck.ok ? nameCheck.error : null}>
              <input className="mq-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={80} data-autofocus />
            </Field>
            <Field label="WhatsApp" error={submitted && !phoneCheck.ok ? phoneCheck.error : null}>
              <input
                className="mq-input"
                inputMode="tel"
                placeholder="(15) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                autoComplete="off"
              />
            </Field>
          </div>

          <Field label="Serviço">
            <select className="mq-input" value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="adm-booking-dialog__grid adm-booking-dialog__grid--3">
            <Field label="Data" error={submitted && !dateOk ? 'Escolha a data.' : null}>
              <input className="mq-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Início">
              <input className="mq-input" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Fim" error={submitted && !timeOk ? 'O fim precisa ser depois do início.' : null}>
              <input className="mq-input" type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>

          {conflicts.length > 0 && (
            <Alert tone="error" title="Esse horário já está ocupado" className="mb-3">
              <ul className="mb-0 ps-3">
                {conflicts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Alert>
          )}
          {serverError && (
            <Alert tone="error" title="O horário foi ocupado enquanto você preenchia" className="mb-3">
              <ul className="mb-0 ps-3">
                {serverError.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Alert>
          )}
          {slot && slot.warnings.length > 0 && !conflicts.length && (
            <Alert tone="warning" title="Atenção" className="mb-3">
              <ul className="mb-0 ps-3">
                {slot.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              Você pode agendar mesmo assim.
            </Alert>
          )}

          <Field label="Situação">
            <select className="mq-input" value={status} onChange={(e) => setStatus(e.target.value as AdminBookingInput['status'])}>
              <option value="confirmado">Confirmado</option>
              <option value="aguardando_confirmacao">Em análise (reserva provisória)</option>
            </select>
          </Field>

          <Field label={info.fields.projectLabel} note="opcional">
            <input className="mq-input" value={project} onChange={(e) => setProject(e.target.value)} maxLength={120} />
          </Field>
          {info.fields.askPeople && (
            <Field label="Pessoas" note="opcional" error={submitted && !peopleOk ? 'Use um número de 1 a 50.' : null}>
              <input className="mq-input" inputMode="numeric" value={people} onChange={(e) => setPeople(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </Field>
          )}
          {info.fields.askDescription && (
            <Field label={info.fields.descriptionLabel ?? 'Descrição'} note="opcional">
              <textarea className="mq-input" rows={2} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          )}
          <Field label="Anotação interna" note="opcional">
            <textarea className="mq-input" rows={2} maxLength={2000} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
          </Field>

          <div className="mq-dialog__actions">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={conflicts.length > 0}>
              Agendar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
