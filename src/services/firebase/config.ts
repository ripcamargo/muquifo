// Módulo leve (sem o SDK): pode ser importado pela página inicial sem aumentar o carregamento.
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const useFirebaseEmulators = env.VITE_USE_FIREBASE_EMULATORS === 'true';
export const appCheckSiteKey = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
