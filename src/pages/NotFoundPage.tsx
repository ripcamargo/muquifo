import { Link } from 'react-router';
import { Header } from '../components/layout/Header';

export default function NotFoundPage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="mq-page">
        <div className="container mq-page__body">
          <h1 className="mq-display">Faixa não encontrada</h1>
          <p>Esta página não existe ou mudou de lugar.</p>
          <Link to="/" className="mq-btn mq-btn--primary">
            Voltar ao início
          </Link>
        </div>
      </main>
    </>
  );
}
