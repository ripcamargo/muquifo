import { ArrowLeft, CalendarX, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BookingDraft } from '../../hooks/useBookingDraft';
import type { AvailabilityStatus } from '../../hooks/useAvailability';
import { friendlyError } from '../../services/firebase/errors';
import type { BookingStep } from '../../types';
import { studioWhatsappUrl } from '../../utils/whatsapp';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export interface StepProps {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft> | ((d: BookingDraft) => Partial<BookingDraft>)) => void;
  goTo: (step: BookingStep) => void;
}

export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mq-display mq-wizard__title" tabIndex={-1} data-step-title>
      {children}
    </h3>
  );
}

export function BackButton({ onClick, label = 'Voltar' }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="ghost" onClick={onClick} icon={<ArrowLeft size={18} aria-hidden="true" />}>
      {label}
    </Button>
  );
}

/** Estados de carregamento / erro / agenda não publicada, comuns às etapas de dia e horário. */
export function AvailabilityGate({
  status,
  error,
  retry,
  children,
}: {
  status: AvailabilityStatus;
  error: unknown;
  retry: () => void;
  children: ReactNode;
}) {
  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Carregando disponibilidade">
        <div className="mq-skeleton" style={{ height: 44, marginBottom: 12 }} />
        <div className="mq-skeleton" style={{ height: 260 }} />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <Alert
        tone="error"
        title="Não conseguimos carregar a agenda"
        actions={
          <>
            <Button size="sm" onClick={retry} icon={<RefreshCw size={16} aria-hidden="true" />}>
              Tentar de novo
            </Button>
            <ButtonLink size="sm" variant="ghost" href={studioWhatsappUrl()} target="_blank" rel="noopener noreferrer">
              Falar pelo WhatsApp
            </ButtonLink>
          </>
        }
      >
        {friendlyError(error)}
      </Alert>
    );
  }
  if (status === 'unpublished') {
    return (
      <EmptyState
        icon={CalendarX}
        title="A agenda online ainda não foi aberta"
        actions={
          <ButtonLink variant="primary" href={studioWhatsappUrl()} target="_blank" rel="noopener noreferrer">
            Consultar pelo WhatsApp
          </ButtonLink>
        }
      >
        Enquanto isso, consulte os horários direto com o estúdio.
      </EmptyState>
    );
  }
  return <>{children}</>;
}
