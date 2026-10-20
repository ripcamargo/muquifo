import { Lock } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { adminSignIn } from '../../services/firebase/auth';
import { friendlyError } from '../../services/firebase/errors';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';

interface Props {
  notice?: string;
  /** Preenchido quando alguém entrou com uma conta sem permissão de administrador. */
  deniedEmail?: string;
  onSignOut: () => void;
}

export function LoginScreen({ notice, deniedEmail, onSignOut }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adminSignIn(email, password);
      // O AdminApp reage à mudança de sessão e verifica a permissão.
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  return (
    <main className="adm-login">
      <div className="adm-login__card">
        <img src="/img/logo-lockup.webp" width={963} height={400} alt="Muquifo Home Studio" />
        <h1 className="mq-display">Painel</h1>
        <p className="mq-muted mb-4">Acesso restrito ao estúdio.</p>

        {deniedEmail !== undefined ? (
          <Alert
            tone="error"
            title="Sem permissão"
            actions={
              <Button size="sm" onClick={onSignOut}>
                Sair e usar outra conta
              </Button>
            }
          >
            A conta {deniedEmail || 'atual'} não é administradora deste painel.
          </Alert>
        ) : (
          <form onSubmit={submit} noValidate>
            {notice && (
              <Alert tone="warning" className="mb-3">
                {notice}
              </Alert>
            )}
            <Field label="E-mail">
              <input
                className="mq-input"
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Senha">
              <input
                className="mq-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <Alert tone="error" className="mb-3">
                {error}
              </Alert>
            )}
            <Button type="submit" variant="primary" size="lg" block loading={loading} icon={<Lock size={18} aria-hidden="true" />}>
              Entrar
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
