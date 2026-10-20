import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { appCheckSiteKey, firebaseConfig, isFirebaseConfigured, useFirebaseEmulators } from './config';

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super('Firebase não configurado: preencha as variáveis VITE_FIREBASE_* (veja .env.example).');
  }
}

let instance: { app: FirebaseApp; db: Firestore; auth: Auth } | null = null;

/** Inicializa o Firebase uma única vez, na primeira vez que algum serviço precisa dele. */
export function firebase() {
  if (instance) return instance;
  if (!isFirebaseConfigured) throw new FirebaseNotConfiguredError();

  const app = initializeApp(firebaseConfig);

  if (appCheckSiteKey && !useFirebaseEmulators) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  const db = getFirestore(app);

  if (useFirebaseEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  instance = { app, db, auth };
  return instance;
}
