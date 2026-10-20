import { useId, type ReactNode } from 'react';
import { useModal } from '../../hooks/useModal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmação para ações destrutivas ou irreversíveis. */
export function ConfirmDialog({ open, title, children, confirmLabel, danger, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useModal<HTMLDivElement>(open, () => !loading && onCancel());
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="mq-overlay" onMouseDown={(e) => e.target === e.currentTarget && !loading && onCancel()}>
      <div ref={ref} className="mq-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="mq-dialog__title">
          {title}
        </h2>
        <div className="mq-muted">{children}</div>
        <div className="mq-dialog__actions">
          <Button variant="ghost" onClick={onCancel} disabled={loading} data-autofocus>
            Voltar
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
