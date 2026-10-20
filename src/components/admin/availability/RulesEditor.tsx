import { useState } from 'react';
import type { AvailabilitySettings, BookingRules } from '../../../types';
import { formatDuration, formatTime, formatTimeRange, weekdayName } from '../../../utils/datetime';
import { freePeriods, startTimes } from '../../../utils/slots';
import { Field } from '../../ui/Field';

interface Props {
  settings: AvailabilitySettings;
  onChange: (s: AvailabilitySettings) => void;
}

// Data de referência só para a prévia: a semana de 4 a 10/jan/2032 começa num domingo.
const PREVIEW_DATES = ['2032-01-04', '2032-01-05', '2032-01-06', '2032-01-07', '2032-01-08', '2032-01-09', '2032-01-10'];
const PREVIEW_NOW = new Date('2000-01-01T00:00:00Z');

function NumberInput({ value, onChange, min, max, step }: { value: number; onChange: (n: number) => void; min: number; max: number; step: number }) {
  return (
    <input
      className="mq-input"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value))))}
    />
  );
}

export function RulesEditor({ settings, onChange }: Props) {
  const [previewDay, setPreviewDay] = useState(6);
  const rules = settings.booking;
  const setRules = (patch: Partial<BookingRules>) => onChange({ ...settings, booking: { ...rules, ...patch } });

  const date = PREVIEW_DATES[previewDay];
  const periods = freePeriods(date, settings, null, PREVIEW_NOW);
  const starts = startTimes(date, settings, null, PREVIEW_NOW);

  return (
    <>
      <section className="adm-card">
        <div className="adm-card__head">
          <h2>Reservas da sala</h2>
        </div>
        <p className="mq-muted" style={{ fontSize: '0.9375rem' }}>
          Valem para qualquer pedido — ensaio, gravação ou locação. A modalidade é só informativa, para você preparar a
          sala. O cliente escolhe o início e quantas horas quer, dentro destes limites.
        </p>
        <div className="adm-form-grid adm-form-grid--4">
          <Field label="Duração mínima" note="min" hint={formatDuration(rules.minDurationMin)}>
            <NumberInput value={rules.minDurationMin} min={15} max={720} step={15} onChange={(n) => setRules({ minDurationMin: n })} />
          </Field>
          <Field label="Duração máxima" note="min" hint={formatDuration(rules.maxDurationMin)}>
            <NumberInput value={rules.maxDurationMin} min={15} max={1440} step={15} onChange={(n) => setRules({ maxDurationMin: n })} />
          </Field>
          <Field label="De quanto em quanto" note="min" hint="60 → 18h, 19h… e 1h, 2h, 3h…">
            <NumberInput value={rules.stepMin} min={15} max={240} step={15} onChange={(n) => setRules({ stepMin: n })} />
          </Field>
          <Field label="Preparação entre reservas" note="min" hint="Folga antes e depois de outra reserva">
            <NumberInput value={rules.bufferMin} min={0} max={240} step={5} onChange={(n) => setRules({ bufferMin: n })} />
          </Field>
        </div>
        <div className="mq-label mq-muted mb-2">Prévia · {weekdayName(previewDay)} sem reservas</div>
        {periods.length ? (
          <p className="mb-0" style={{ fontSize: '0.9375rem' }}>
            Livre {periods.map((p) => formatTimeRange(p.start, p.end)).join(' · ')}. Inícios: {starts.map(formatTime).join(', ')}.
            Duração de {formatDuration(rules.minDurationMin)} até {formatDuration(rules.maxDurationMin)} (limitada ao fim do
            expediente).
          </p>
        ) : (
          <p className="mq-muted mb-0">Nenhum horário nesse dia.</p>
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card__head">
          <h2>Regras gerais</h2>
        </div>
        <div className="adm-form-grid">
          <Field label="Antecedência mínima" note="horas" hint="Ninguém pode pedir um horário que comece antes disso.">
            <NumberInput value={settings.minAdvanceHours} min={0} max={720} step={1} onChange={(n) => onChange({ ...settings, minAdvanceHours: n })} />
          </Field>
          <Field label="Agenda aberta por" note="dias" hint="Quantos dias à frente o site mostra.">
            <NumberInput value={settings.maxDaysAhead} min={1} max={365} step={1} onChange={(n) => onChange({ ...settings, maxDaysAhead: n })} />
          </Field>
          <Field label="Dia da prévia">
            <select className="mq-input" value={previewDay} onChange={(e) => setPreviewDay(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mq-muted mb-0" style={{ fontSize: '0.875rem' }}>
          Fuso horário: {settings.timezone}. Nenhuma reserva ultrapassa o fim do expediente configurado.
        </p>
      </section>
    </>
  );
}
