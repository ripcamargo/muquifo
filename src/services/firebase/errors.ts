import { FirebaseError } from 'firebase/app';
import { FirebaseNotConfiguredError } from './app';

export class TimeoutError extends Error {
  constructor() {
    super('A conexão demorou demais.');
  }
}

/** Evita promessas que nunca terminam quando a rede cai (o Firestore fica tentando em silêncio). */
export function withTimeout<T>(promise: Promise<T>, ms = 12_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function errorCode(err: unknown): string {
  return err instanceof FirebaseError ? err.code : '';
}

export function isPermissionDenied(err: unknown): boolean {
  return errorCode(err) === 'permission-denied';
}

/** Mensagem amigável para qualquer erro vindo do Firebase. */
export function friendlyError(err: unknown): string {
  if (err instanceof FirebaseNotConfiguredError) return 'O agendamento online ainda não foi configurado.';
  if (err instanceof TimeoutError) return 'Sem resposta do servidor. Confira sua conexão e tente de novo.';
  switch (errorCode(err)) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'auth/network-request-failed':
      return 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
    case 'permission-denied':
      return 'Sem permissão para esta ação.';
    case 'resource-exhausted':
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente de novo.';
    case 'auth/admin-restricted-operation':
    case 'auth/operation-not-allowed':
      return 'O acesso de visitantes não está habilitado no Firebase (Authentication → Anônimo).';
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.';
    case 'auth/user-disabled':
      return 'Este usuário foi desativado.';
    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
      return 'Sua sessão expirou. Entre novamente.';
    case 'app-check/throttled':
    case 'app-check/fetch-status-error':
      return 'Não foi possível validar este navegador. Recarregue a página e tente de novo.';
    default:
      return 'Algo deu errado. Tente de novo em instantes.';
  }
}
