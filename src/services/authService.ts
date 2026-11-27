import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore/lite';
import {
  AppLanguage,
  DogProfile,
  LocationPoint,
  UnitSystem,
  WalkLogEntry,
} from '../types/walk';
import {
  AuthErrorKey,
  mapFirebaseAuthErrorCode,
  maskEmail,
  sanitizeText,
  validateEmail,
  validateStrongPassword,
} from '../utils/validation';
import {
  getFirebaseAuth,
  getFirebaseDb,
  isFirebaseConfigured,
} from './firebaseClient';

/**
 * Firebase Email/Password Authentication & Per-User Cloud Sync Service.
 *
 * Security notes:
 * - Never logs emails, passwords, UIDs, or Firebase tokens to console.
 * - Enforces strong password validation (min 12 chars) before calling Firebase.
 * - Maps auth failures to anti-enumeration generic error keys.
 * - Deletes the user's Firestore document BEFORE deleting their Firebase Auth
 *   account (requiring recent password re-authentication per App Store Guideline 5.1.1(v)).
 * - TODO(security): Add Sign in with Apple / OAuth providers and optional TOTP/SMS MFA
 *   enrollment in a future release for enhanced account protection.
 */

export interface AuthUserSummary {
  uid: string;
  maskedEmail: string;
  emailVerified: boolean;
}

export interface CloudSyncPayload {
  schemaVersion: 1;
  updatedAtMs: number;
  units: UnitSystem;
  language: AppLanguage;
  savedPlaceIds: string[];
  spotNotes: Record<string, string>;
  dogs: DogProfile[];
  activeDogIds: string[];
  walkLogs: WalkLogEntry[];
  location: LocationPoint;
}

export interface AuthActionResult {
  ok: boolean;
  errorKey?: AuthErrorKey;
}

const MAX_CLOUD_AVATAR_LEN = 120_000;

function toUserSummary(user: User | null): AuthUserSummary | null {
  if (!user) return null;
  return {
    uid: user.uid,
    maskedEmail: maskEmail(user.email),
    emailVerified: Boolean(user.emailVerified),
  };
}

function extractFirebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code?: unknown }).code ?? '');
  }
  return '';
}

export function subscribeToAuthState(
  onChange: (user: AuthUserSummary | null) => void
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    onChange(toUserSummary(user));
  });
}

export async function signUpWithEmail(
  rawEmail: string,
  password: string
): Promise<AuthActionResult> {
  if (!isFirebaseConfigured) {
    return { ok: false, errorKey: 'not_configured' };
  }
  const emailCheck = validateEmail(rawEmail);
  if (!emailCheck.valid) {
    return { ok: false, errorKey: 'invalid_email' };
  }
  const pwdCheck = validateStrongPassword(password);
  if (!pwdCheck.valid) {
    return { ok: false, errorKey: 'weak_password' };
  }
  const auth = getFirebaseAuth();
  if (!auth) {
    return { ok: false, errorKey: 'not_configured' };
  }
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      emailCheck.normalized,
      password
    );
    // Best-effort verification email without blocking onboarding
    sendEmailVerification(cred.user).catch(() => {});
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorKey: mapFirebaseAuthErrorCode(extractFirebaseErrorCode(err)),
    };
  }
}

export async function signInWithEmail(
  rawEmail: string,
  password: string
): Promise<AuthActionResult> {
  if (!isFirebaseConfigured) {
    return { ok: false, errorKey: 'not_configured' };
  }
  const emailCheck = validateEmail(rawEmail);
  if (!emailCheck.valid) {
    return { ok: false, errorKey: 'invalid_email' };
  }
  if (typeof password !== 'string' || password.length === 0 || password.length > 128) {
    return { ok: false, errorKey: 'invalid_credentials' };
  }
  const auth = getFirebaseAuth();
  if (!auth) {
    return { ok: false, errorKey: 'not_configured' };
  }
  try {
    await signInWithEmailAndPassword(auth, emailCheck.normalized, password);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorKey: mapFirebaseAuthErrorCode(extractFirebaseErrorCode(err)),
    };
  }
}

export async function requestPasswordReset(
  rawEmail: string
): Promise<AuthActionResult> {
  if (!isFirebaseConfigured) {
    return { ok: false, errorKey: 'not_configured' };
  }
  const emailCheck = validateEmail(rawEmail);
  if (!emailCheck.valid) {
    return { ok: false, errorKey: 'invalid_email' };
  }
  const auth = getFirebaseAuth();
  if (!auth) {
    return { ok: false, errorKey: 'not_configured' };
  }
  try {
    await sendPasswordResetEmail(auth, emailCheck.normalized);
    return { ok: true };
  } catch (err) {
    const code = extractFirebaseErrorCode(err);
    // Avoid disclosing whether an email is registered on password reset
    if (code === 'auth/user-not-found') {
      return { ok: true };
    }
    return {
      ok: false,
      errorKey: mapFirebaseAuthErrorCode(code),
    };
  }
}

export async function resendVerificationEmail(): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) {
    return { ok: false, errorKey: 'generic_error' };
  }
  try {
    await sendEmailVerification(auth.currentUser);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorKey: mapFirebaseAuthErrorCode(extractFirebaseErrorCode(err)),
    };
  }
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

/**
 * Re-authenticates with the user's current password, deletes their per-user
 * Firestore profile document, and permanently deletes their Firebase Auth account.
 */
export async function deleteCurrentAccount(
  currentPassword: string
): Promise<AuthActionResult> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!auth || !user || !user.email) {
    return { ok: false, errorKey: 'generic_error' };
  }
  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return { ok: false, errorKey: 'invalid_credentials' };
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    const db = getFirebaseDb();
    if (db) {
      const ref = doc(db, 'users', user.uid, 'pawcast', 'profile');
      await deleteDoc(ref).catch(() => {});
    }

    await deleteUser(user);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorKey: mapFirebaseAuthErrorCode(extractFirebaseErrorCode(err)),
    };
  }
}

/**
 * Loads the signed-in user's synced PawCast profile from Firestore (`users/{uid}/pawcast/profile`).
 * Server-side ownership is enforced by `firestore.rules` (`request.auth.uid == userId`).
 */
export async function loadCloudUserState(
  uid: string
): Promise<Record<string, unknown> | null> {
  const safeUid = sanitizeText(uid, 128);
  if (!safeUid) return null;
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const ref = doc(db, 'users', safeUid, 'pawcast', 'profile');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return data && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Saves the signed-in user's sanitized PawCast profile to Firestore (`users/{uid}/pawcast/profile`).
 */
export async function saveCloudUserState(
  uid: string,
  payload: CloudSyncPayload
): Promise<boolean> {
  const safeUid = sanitizeText(uid, 128);
  if (!safeUid) return false;
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    // Keep custom base64 avatars compact so the full Firestore document stays well under 1 MiB
    const boundedDogs = payload.dogs.slice(0, 5).map((d) => ({
      ...d,
      customPhotoUri:
        d.customPhotoUri && d.customPhotoUri.length <= MAX_CLOUD_AVATAR_LEN
          ? d.customPhotoUri
          : null,
    }));

    const ref = doc(db, 'users', safeUid, 'pawcast', 'profile');
    await setDoc(ref, {
      schemaVersion: 1,
      updatedAtMs: Date.now(),
      units: payload.units,
      language: payload.language,
      savedPlaceIds: payload.savedPlaceIds.slice(0, 50),
      spotNotes: payload.spotNotes,
      dogs: boundedDogs,
      activeDogIds: payload.activeDogIds.slice(0, 5),
      walkLogs: payload.walkLogs.slice(0, 100),
      location: payload.location,
    });
    return true;
  } catch {
    return false;
  }
}
