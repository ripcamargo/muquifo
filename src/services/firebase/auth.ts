import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebase } from './app';
import { withTimeout } from './errors';

/**
 * Visitantes usam uma sessão anônima do Firebase. Ela não pede dados ao visitante:
 * serve para que só o próprio navegador consiga atualizar o lead que criou.
 */
export async function ensureVisitorUser(): Promise<User> {
  const { auth } = firebase();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  const cred = await withTimeout(signInAnonymously(auth));
  return cred.user;
}

export function currentUid(): string | null {
  return firebase().auth.currentUser?.uid ?? null;
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebase().auth, callback);
}

export async function adminSignIn(email: string, password: string): Promise<User> {
  const cred = await withTimeout(signInWithEmailAndPassword(firebase().auth, email.trim(), password));
  return cred.user;
}

export function adminSignOut(): Promise<void> {
  return signOut(firebase().auth);
}

/**
 * Administrador = custom claim { admin: true } OU documento admins/{uid}.
 * Esta checagem é só para a interface: a proteção real está nas regras do Firestore.
 */
export async function isAdminUser(user: User): Promise<boolean> {
  if (user.isAnonymous) return false;
  const token = await user.getIdTokenResult();
  if (token.claims.admin === true) return true;
  const snap = await withTimeout(getDoc(doc(firebase().db, 'admins', user.uid)));
  return snap.exists();
}
