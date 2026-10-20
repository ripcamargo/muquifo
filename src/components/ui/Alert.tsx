import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'info' | 'error' | 'warning' | 'success';

const ICONS = { info: Info, error: CircleAlert, warning: TriangleAlert, success: CircleCheck };

interface AlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Mensagem inline (erros, avisos e confirmações dentro do fluxo). */
export function Alert({ tone = 'info', title, children, actions, className }: AlertProps) {
  const Icon = ICONS[tone];
  return (
    <div
      className={`mq-alert mq-alert--${tone} ${className ?? ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={20} aria-hidden="true" />
      <div className="mq-alert__body">
        {title && <div className="mq-alert__title">{title}</div>}
        {children}
        {actions && <div className="mq-alert__actions">{actions}</div>}
      </div>
    </div>
  );
}
