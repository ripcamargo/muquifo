import { CircleAlert } from 'lucide-react';
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

interface FieldProps {
  label: ReactNode;
  /** Ex.: "opcional". */
  note?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactElement<Record<string, unknown>>;
  className?: string;
}

/** Rótulo + controle + dica + erro, com os atributos de acessibilidade ligados automaticamente. */
export function Field({ label, note, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={`mq-field ${className ?? ''}`}>
      <label className="mq-field__label" htmlFor={id}>
        {label}
        {note && <small>{note}</small>}
      </label>
      {control}
      {hint && !error && (
        <span className="mq-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="mq-field__error" id={errorId} role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}
