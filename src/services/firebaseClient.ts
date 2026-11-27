import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore/lite';
import { Platform } from 'react-native';

/**
 * Firebase Web & Expo Client Initialization.
 *
 * Security notes:
 * - Configuration values are read strictly from `EXPO_PUBLIC_FIREBASE_*` env vars
 *   at build time (never hardcoded or given fallback secret literals).
 * - Firebase Web API keys identify a public Firebase project (they are not admin
 *   credentials); access control MUST be enforced server-side via `firestore.rules`
 *   and Firebase Auth domain restrictions.
 * - On Web, Firebase Auth persists sessions in IndexedDB (`indexedDBLocalPersistence`),
 *   never in `localStorage` or `sessionStorage`.
 * - TODO(security): For enterprise/multi-tenant apps requiring HttpOnly session cookies,
 *   add a dedicated BFF server exchanging Firebase ID tokens for `__Host-` session cookies
 *   with CSRF protection (`firebase-admin` `createSessionCookie`).
 */

interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

const SAFE_AUTH_DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;
const SAFE_PROJECT_ID_RE = /^[a-z0-9-]{3,64}$/;

function readFirebaseConfigFromEnv(): FirebaseEnvConfig | null {
  const apiKey = (process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '').trim();
  const authDomain = (process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '').trim();
  const projectId = (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '').trim();
  const appId = (process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '').trim();
  const storageBucket = (
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || ''
  ).trim();
  const messagingSenderId = (
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''
  ).trim();

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }
  if (
    !SAFE_AUTH_DOMAIN_RE.test(authDomain) ||
    !SAFE_PROJECT_ID_RE.test(projectId)
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    ...(storageBucket ? { storageBucket } : {}),
    ...(messagingSenderId ? { messagingSenderId } : {}),
  };
}

const ENV_CONFIG = readFirebaseConfigFromEnv();

export const isFirebaseConfigured: boolean = ENV_CONFIG !== null;

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

function ensureFirebaseApp(): FirebaseApp | null {
  if (!ENV_CONFIG) {
    return null;
  }
  if (cachedApp) {
    return cachedApp;
  }
  const existing = getApps();
  cachedApp = existing.length > 0 ? existing[0] : initializeApp(ENV_CONFIG);
  return cachedApp;
}

export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }
  const app = ensureFirebaseApp();
  if (!app) {
    return null;
  }
  if (Platform.OS === 'web') {
    try {
      cachedAuth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, inMemoryPersistence],
      });
    } catch {
      // Fallback if Auth was already initialized on this app instance (e.g. fast refresh)
      cachedAuth = getAuth(app);
    }
  } else {
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

export function getFirebaseDb(): Firestore | null {
  if (cachedDb) {
    return cachedDb;
  }
  const app = ensureFirebaseApp();
  if (!app) {
    return null;
  }
  cachedDb = getFirestore(app);
  return cachedDb;
}
