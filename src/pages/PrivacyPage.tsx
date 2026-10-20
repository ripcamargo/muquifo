import { useEffect } from 'react';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { studio } from '../config/studio';
import { formatDateShort } from '../utils/datetime';
import { studioWhatsappUrl } from '../utils/whatsapp';

export default function PrivacyPage() {
  useEffect(() => {
    document.title = `Política de privacidade · ${studio.name}`;
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main id="conteudo" className="mq-page">
        <div className="container">
          <article className="mq-page__body">
            <h1 className="mq-display">Política de privacidade</h1>
            <p>Versão de {formatDateShort(studio.privacy.version)}. Texto curto e direto, como deve ser.</p>

            <h2>Quem cuida dos dados</h2>
            <p>{studio.privacy.controller}, responsável por este site e pelos agendamentos feitos por ele.</p>

            <h2>Quais dados coletamos</h2>
            <ul>
              <li>Nome e número de WhatsApp, informados por você na primeira etapa do agendamento.</li>
              <li>Os detalhes do pedido: serviço, data, horário e, se você quiser, nome do projeto, número de pessoas e observações.</li>
              <li>Registros técnicos mínimos: datas de criação e atualização e a etapa em que o pedido parou.</li>
            </ul>
            <p>Não pedimos e-mail, senha, documentos nem dados de pagamento.</p>

            <h2>Para que usamos</h2>
            <p>
              Exclusivamente para responder ao seu pedido: confirmar ou sugerir horários, combinar detalhes da sessão e,
              se você não terminar o agendamento, retomar o contato sobre esse pedido. A base legal é o procedimento
              preliminar a um contrato solicitado por você (art. 7º, V, da LGPD).
            </p>
            <p>Não usamos seus dados para propaganda nem os compartilhamos com terceiros para marketing.</p>

            <h2>WhatsApp</h2>
            <p>
              Ao concluir, o site abre o WhatsApp com uma mensagem pronta para o estúdio. A conversa acontece no
              WhatsApp, que tem a própria política de privacidade.
            </p>

            <h2>Onde ficam e por quanto tempo</h2>
            <p>
              Os dados ficam armazenados no Google Firebase (Cloud Firestore), com acesso restrito ao responsável pelo
              estúdio. Guardamos os registros {studio.privacy.retention}, e depois os excluímos.
            </p>

            <h2>Seus direitos</h2>
            <p>
              Você pode pedir, a qualquer momento, para ver, corrigir ou excluir seus dados. É só chamar no WhatsApp{' '}
              <a href={studioWhatsappUrl('Olá! Gostaria de fazer uma solicitação sobre meus dados pessoais.')} target="_blank" rel="noopener noreferrer">
                {studio.whatsappDisplay}
              </a>
              .
            </p>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
