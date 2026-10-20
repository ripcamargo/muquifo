import { Plus, X } from 'lucide-react';
import type { TimeInterval } from '../../../types';
import { minutesToTime, timeToMinutes } from '../../../utils/datetime';
import { validateIntervals } from '../../../utils/slots';
import { Button } from '../../ui/Button';

interface Props {
  value: TimeInterval[];
  onChange: (value: TimeInterval[]) => void;
  label: string;
  addLabel?: string;
}

/** Lista editável de intervalos "das HH:MM às HH:MM". */
export function IntervalsEditor({ value, onChange, label, addLabel = 'Adicionar intervalo' }: Props) {
  const error = validateIntervals(value);

  const set = (i: number, patch: Partial<TimeInterval>) => onChange(value.map((v, k) => (k === i ? { ...v, ...patch } : v)));

  const add = () => {
    const last = value[value.length - 1];
    const start = last ? Math.min(timeToMinutes(last.end) + 60, 22 * 60) : 18 * 60;
    onChange([...value, { start: minutesToTime(start), end: minutesToTime(Math.min(start + 120, 24 * 60 - 1)) }]);
  };

  return (
    <div className="adm-intervals" role="group" aria-label={label}>
      {value.map((interval, i) => (
        <div className="adm-intervals__row" key={i}>
          <input
            className="mq-input"
            type="time"
            step={900}
            value={interval.start}
            aria-label={`${label}: início do intervalo ${i + 1}`}
            onChange={(e) => set(i, { start: e.target.value })}
          />
          <span>às</span>
          <input
            className="mq-input"
            type="time"
            step={900}
            value={interval.end === '24:00' ? '23:59' : interval.end}
            aria-label={`${label}: fim do intervalo ${i + 1}`}
            onChange={(e) => set(i, { end: e.target.value === '23:59' ? '24:00' : e.target.value })}
          />
          <button
            type="button"
            className="mq-icon-btn"
            onClick={() => onChange(value.filter((_, k) => k !== i))}
            aria-label={`Remover intervalo ${i + 1}`}
          >
            <X size={18} />
          </button>
        </div>
      ))}
      {error && value.length > 0 && (
        <span className="adm-intervals__error" role="alert">
          {error}
        </span>
      )}
      <div>
        <Button variant="ghost" size="sm" onClick={add} icon={<Plus size={16} aria-hidden="true" />}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
