import { STATUS_HINTS, STATUS_LABELS } from '../../config/status';
import type { LeadStatus } from '../../types';

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`mq-status mq-status--${status}`} title={STATUS_HINTS[status]}>
      {STATUS_LABELS[status]}
    </span>
  );
}
