import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import { firstName } from '../../utils/text';
import { Alert } from '../ui/Alert';
import { Button, ButtonLink } from '../ui/Button';
import { StepTitle, type StepProps } from './shared';

interface Props extends StepProps {
  onRestart: () => void;
}

export function StepSent({ draft, onRestart }: Props) {
  return (
    <div className="mq-sent">
      <div className="mq-sent__icon" aria-hidden="true">
        <Send size={32} />
      </div>
      <span className="mq-status mq-status--pedido_preparado">Aguardando seu envio no WhatsApp</span>
      <StepTitle>Pedido pronto, {firstName(draft.name)}!</StepTitle>
      <p className="mq-wizard__lead">
        Abrimos o WhatsApp com a mensagem preenchida. <strong>Toque em enviar por lá</strong> — o estúdio confere a
        agenda e responde confirmando ou sugerindo outro horário.
      </p>

      {draft.sentSaveFailed && (
        <Alert tone="warning" className="text-start mb-3">
          Não conseguimos registrar o pedido no sistema, mas a mensagem do WhatsApp tem todos os dados. É só enviá-la.
        </Alert>
      )}

      <div className="mq-sent__actions">
        <ButtonLink
          variant="primary"
          size="lg"
          href={draft.sentUrl}
          target="_blank"
          rel="noopener noreferrer"
          icon={<MessageCircle size={18} aria-hidden="true" />}
        >
          Abrir o WhatsApp
        </ButtonLink>
        <Button variant="ghost" onClick={onRestart} icon={<RefreshCw size={16} aria-hidden="true" />}>
          Fazer outro pedido
        </Button>
      </div>
    </div>
  );
}
