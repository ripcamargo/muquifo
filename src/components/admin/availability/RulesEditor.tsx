import { useState } from 'react';
import { services } from '../../../config/studio';
import type { AvailabilitySettings, ServiceSchedule, ServiceType } from '../../../types';
import { formatDuration, formatTime, weekdayName } from '../../../utils/datetime';
import { generateSlots } from '../../../utils/slots';
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

  const setService = (id: ServiceType, patch: Partial<ServiceSchedule>) =>
    onChange({ ...settings, services: { ...settings.services, [id]: { ...settings.services[id], ...patch } } });

  return (
    <>
      {services.map((s) => {
        const cfg = settings.services[s.id];
        const overlapping = cfg.stepMin < cfg.durationMin;
        const preview = generateSlots(PREVIEW_DATES[previewDay], s.id, settings, null, PREVIEW_NOW);
        return (
          <section className="adm-card" key={s.id}>
            <div className="adm-card__head">
              <h2>{s.name}</h2>
              <label className="adm-switch">
                <input type="checkbox" checked={cfg.enabled} onChange={(e) => setService(s.id, { enabled: e.target.checked })} />
                {cfg.enabled ? 'Aceitando pedidos' : 'Pausado'}
              </label>
            </div>
            <div className="adm-form-grid">
              <Field label="Duração da sessão" note="min" hint={formatDuration(cfg.durationMin)}>
                <NumberInput value={cfg.durationMin} min={15} max={720} step={15} onChange={(n) => setService(s.id, { durationMin: n })} />
              </Field>
              <Field label="Novo início a cada" note="min" hint="Ex.: 60 oferece 18h, 19h, 20h…">
                <NumberInput value={cfg.stepMin} min={15} max={720} step={15} onChange={(n) => setService(s.id, { stepMin: n })} />
              </Field>
              <Field label="Preparação entre reservas" note="min" hint="Folga antes/depois de outra reserva">
                <NumberInput value={cfg.bufferMin} min={0} max={240} step={5} onChange={(n) => setService(s.id, { bufferMin: n })} />
              </Field>
            </div>
            {overlapping && (
              <p className="mq-muted" style={{ fontSize: '0.875rem' }}>
                Os horários oferecidos se sobrepõem: quando um for confirmado, os que batem com ele somem da agenda.
              </p>
            )}
            <div className="mq-label mq-muted mb-2">
              Prévia · {weekdayName(previewDay)}
            </div>
            <div className="adm-preview">
              {preview.length ? (
                preview.map((p) => (
                  <span key={p.start}>
                    {formatTime(p.start)}–{formatTime(p.end)}
                  </span>
                ))
              ) : (
                <span className="is-taken">Nenhum horário nesse dia</span>
              )}
            </div>
          </section>
        );
      })}

      <section className="adm-card">
        <div className="adm-card__head">
          <h2>Regras gerais</h2>
        </div>
        <div className="adm-form-grid">
          <Field label="Antecedência mínima" note="horas" hint="Ninguém pede um horário que começa antes disso.">
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
          Fuso horário: {settings.timezone}. Horários nunca ultrapassam o fim do expediente configurado.
        </p>
      </section>
    </>
  );
}
