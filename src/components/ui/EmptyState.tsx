import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children, actions }: EmptyStateProps) {
  return (
    <div className="mq-empty" role="status">
      <Icon size={32} aria-hidden="true" />
      <p className="mq-empty__title">{title}</p>
      {children && <div>{children}</div>}
      {actions && <div className="mq-empty__actions">{actions}</div>}
    </div>
  );
}
