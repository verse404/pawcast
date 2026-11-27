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
  updateProfile,
  User,
} from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore/lite';
import {
  AppLanguage,
  CareReminder,
  CustomWalkSpot,
  DogProfile,
  GearChecklistItem,
  HouseholdMemberEntry,
  HouseholdSummary,
  LocationPoint,
  MemberPreferences,
  MemberProfile,
  PhotoMemory,
  UnitSystem,
  WalkLogEntry,
} from '../types/walk';
import {
  AuthErrorKey,
  generateSecureInviteToken,
  mapFirebaseAuthErrorCode,
  maskEmail,
  sanitizeAvatarDataUri,
  sanitizeInviteToken,
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
 * Firebase Email/Password Authentication, Per-User Cloud Sync (Schema v2),
 * and Cryptographically-Tokenized Household Co-Walker Sharing Service.
 *
 * Security notes:
 * - Never logs emails, passwords, UIDs, invite tokens, or Firebase tokens to console.
 * - Enforces strong password validation (min 12 chars) before calling Firebase.
 * - Maps auth failures to anti-enumeration generic error keys.
 * - Deletes the user's Firestore profile BEFORE deleting their Firebase Auth
 *   account (requiring recent password re-authentication per App Store Guideline 5.1.1(v)).
 * - Household sharing uses 192-bit CSPRNG invite tokens (`crypto.getRandomValues`)
 *   with `allow list: if false` and server-side expiry verification in `firestore.rules`.
 * - TODO(security): Add Sign in with Apple / OAuth providers and optional TOTP/SMS MFA
 *   enrollment in a future release for enhanced account protection.
 */

export interface AuthUserSummary {
  uid: string;
  maskedEmail: string;
  displayName: string;
  emailVerified: boolean;
}

export interface CloudSyncPayload {
  schemaVersion: 2;
  updatedAtMs: number;
  units: UnitSystem;
  language: AppLanguage;
  savedPlaceIds: string[];
  spotNotes: Record<string, string>;
  dogs: DogProfile[];
  activeDogIds: string[];
  walkLogs: WalkLogEntry[];
  location: LocationPoint;
  memberProfile: MemberProfile;
  memberPreferences: MemberPreferences;
  customSpots: CustomWalkSpot[];
  careReminders: CareReminder[];
  gearChecklist: GearChecklistItem[];
  householdId: string | null;
}

export interface HouseholdSharedState {
  dogs: DogProfile[];
  activeDogIds: string[];
  savedPlaceIds: string[];
  walkLogs: WalkLogEntry[];
  careReminders: CareReminder[];
}

export interface AuthActionResult {
  ok: boolean;
  errorKey?: AuthErrorKey;
}

const MAX_CLOUD_AVATAR_LEN = 120_000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toUserSummary(user: User | null): AuthUserSummary | null {
  if (!user) return null;
  return {
    uid: user.uid,
    maskedEmail: maskEmail(user.email),
    displayName: sanitizeText(user.displayName, 40),
    emailVerified: Boolean(user.emailVerified),
  };
}

function extractFirebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code?: unknown }).code ?? '');
  }
  return '';
}

function boundDogsForCloud(dogs: DogProfile[]): DogProfile[] {
  return dogs.slice(0, 5).map((d) => {
    const safeAvatar = sanitizeAvatarDataUri(d.customPhotoUri);
    return {
      ...d,
      customPhotoUri:
        safeAvatar && safeAvatar.length <= MAX_CLOUD_AVATAR_LEN
          ? safeAvatar
          : null,
    };
  });
}

function boundMemberProfileForCloud(profile: MemberProfile): MemberProfile {
  const safeAvatar = sanitizeAvatarDataUri(profile.avatarUri);
  return {
    displayName: sanitizeText(profile.displayName, 40),
    avatarUri:
      safeAvatar && safeAvatar.length <= MAX_CLOUD_AVATAR_LEN
        ? safeAvatar
        : null,
  };
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
  password: string,
  rawDisplayName?: string
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
    const cleanName = sanitizeText(rawDisplayName, 40);
    if (cleanName) {
      await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
    }
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

export async function updateCurrentAuthDisplayName(
  rawDisplayName: string
): Promise<boolean> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return false;
  const cleanName = sanitizeText(rawDisplayName, 40);
  try {
    await updateProfile(auth.currentUser, { displayName: cleanName });
    return true;
  } catch {
    return false;
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
      const photosSnap = await getDocs(
        collection(db, 'users', user.uid, 'photoMemories')
      ).catch(() => null);
      if (photosSnap) {
        await Promise.all(
          photosSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {}))
        );
      }
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
 * Saves the signed-in user's sanitized PawCast profile (Schema v2) to Firestore.
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
    const ref = doc(db, 'users', safeUid, 'pawcast', 'profile');
    await setDoc(ref, {
      schemaVersion: 2,
      updatedAtMs: Date.now(),
      units: payload.units,
      language: payload.language,
      savedPlaceIds: payload.savedPlaceIds.slice(0, 50),
      spotNotes: payload.spotNotes,
      dogs: boundDogsForCloud(payload.dogs),
      activeDogIds: payload.activeDogIds.slice(0, 5),
      walkLogs: payload.walkLogs.slice(0, 100),
      location: payload.location,
      memberProfile: boundMemberProfileForCloud(payload.memberProfile),
      memberPreferences: {
        ...payload.memberPreferences,
        pinnedLocations: payload.memberPreferences.pinnedLocations.slice(0, 5),
        inviteSignature: sanitizeText(payload.memberPreferences.inviteSignature, 60),
      },
      customSpots: payload.customSpots.slice(0, 20),
      careReminders: payload.careReminders.slice(0, 12),
      gearChecklist: payload.gearChecklist.slice(0, 15),
      householdId: payload.householdId ? sanitizeText(payload.householdId, 64) : null,
    });
    return true;
  } catch {
    return false;
  }
}

function parseHouseholdDoc(
  householdId: string,
  raw: Record<string, unknown>,
  activeInviteToken?: string | null
): HouseholdSummary {
  const ownerUid = sanitizeText(raw.ownerUid, 128);
  const memberUids = Array.isArray(raw.memberUids)
    ? raw.memberUids.filter((x): x is string => typeof x === 'string').slice(0, 4)
    : ownerUid
      ? [ownerUid]
      : [];
  const labelsObj =
    raw.memberLabels && typeof raw.memberLabels === 'object'
      ? (raw.memberLabels as Record<string, unknown>)
      : {};
  const members: HouseholdMemberEntry[] = memberUids.map((mUid, idx) => ({
    uid: mUid,
    displayName:
      sanitizeText(labelsObj[mUid], 40) ||
      (mUid === ownerUid ? 'Owner' : `Co-Walker ${idx + 1}`),
    isOwner: mUid === ownerUid,
  }));
  return {
    id: householdId,
    ownerUid,
    members,
    activeInviteToken: activeInviteToken ?? null,
    updatedAtMs:
      typeof raw.updatedAtMs === 'number' && Number.isFinite(raw.updatedAtMs)
        ? raw.updatedAtMs
        : Date.now(),
  };
}

/**
 * Creates a shared Household document (`households/{id}`) and a 192-bit CSPRNG
 * invite token (`householdInvites/{token}`) for a partner or dog walker to join.
 */
export async function createHouseholdShare(
  uid: string,
  displayName: string,
  initial: HouseholdSharedState
): Promise<{ ok: boolean; household?: HouseholdSummary; inviteToken?: string }> {
  const db = getFirebaseDb();
  const safeUid = sanitizeText(uid, 128);
  if (!db || !safeUid) return { ok: false };
  try {
    const householdId = generateSecureInviteToken(16).replace(/^PAW-/, 'hh-');
    const inviteToken = generateSecureInviteToken(24);
    const safeName = sanitizeText(displayName, 40) || 'Member';
    const nowMs = Date.now();

    await setDoc(doc(db, 'households', householdId), {
      ownerUid: safeUid,
      memberUids: [safeUid],
      memberLabels: { [safeUid]: safeName },
      dogs: boundDogsForCloud(initial.dogs),
      activeDogIds: initial.activeDogIds.slice(0, 5),
      savedPlaceIds: initial.savedPlaceIds.slice(0, 50),
      walkLogs: initial.walkLogs.slice(0, 100),
      careReminders: initial.careReminders.slice(0, 12),
      lastJoinToken: '',
      updatedAtMs: nowMs,
    });

    await setDoc(doc(db, 'householdInvites', inviteToken), {
      householdId,
      ownerUid: safeUid,
      ownerName: safeName,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + INVITE_TTL_MS,
    });

    return {
      ok: true,
      inviteToken,
      household: {
        id: householdId,
        ownerUid: safeUid,
        members: [{ uid: safeUid, displayName: safeName, isOwner: true }],
        activeInviteToken: inviteToken,
        updatedAtMs: nowMs,
      },
    };
  } catch {
    return { ok: false };
  }
}

export async function createHouseholdInviteToken(
  householdId: string,
  ownerUid: string,
  ownerName: string
): Promise<string | null> {
  const db = getFirebaseDb();
  const safeHouseholdId = sanitizeText(householdId, 64);
  const safeOwnerUid = sanitizeText(ownerUid, 128);
  if (!db || !safeHouseholdId || !safeOwnerUid) return null;
  try {
    const inviteToken = generateSecureInviteToken(24);
    const nowMs = Date.now();
    await setDoc(doc(db, 'householdInvites', inviteToken), {
      householdId: safeHouseholdId,
      ownerUid: safeOwnerUid,
      ownerName: sanitizeText(ownerName, 40) || 'Member',
      createdAtMs: nowMs,
      expiresAtMs: nowMs + INVITE_TTL_MS,
    });
    return inviteToken;
  } catch {
    return null;
  }
}

export async function revokeHouseholdInviteToken(
  rawToken: string
): Promise<void> {
  const db = getFirebaseDb();
  const safeToken = sanitizeInviteToken(rawToken);
  if (!db || !safeToken) return;
  await deleteDoc(doc(db, 'householdInvites', safeToken)).catch(() => {});
}

export async function loadHouseholdShare(
  householdId: string
): Promise<{
  summary: HouseholdSummary;
  rawData: Record<string, unknown>;
} | null> {
  const db = getFirebaseDb();
  const safeId = sanitizeText(householdId, 64);
  if (!db || !safeId) return null;
  try {
    const snap = await getDoc(doc(db, 'households', safeId));
    if (!snap.exists()) return null;
    const raw = snap.data() as Record<string, unknown>;
    return {
      summary: parseHouseholdDoc(safeId, raw),
      rawData: raw,
    };
  } catch {
    return null;
  }
}

export async function joinHouseholdWithToken(
  uid: string,
  displayName: string,
  rawToken: string
): Promise<{
  ok: boolean;
  household?: HouseholdSummary;
  rawData?: Record<string, unknown>;
}> {
  const db = getFirebaseDb();
  const safeUid = sanitizeText(uid, 128);
  const safeToken = sanitizeInviteToken(rawToken);
  if (!db || !safeUid || !safeToken) return { ok: false };
  try {
    const inviteRef = doc(db, 'householdInvites', safeToken);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) return { ok: false };
    const inviteData = inviteSnap.data() as Record<string, unknown>;
    const householdId = sanitizeText(inviteData.householdId, 64);
    const expiresAtMs = Number(inviteData.expiresAtMs);
    if (!householdId || !Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
      return { ok: false };
    }

    const safeName = sanitizeText(displayName, 40) || 'Co-Walker';
    const hhRef = doc(db, 'households', householdId);
    await updateDoc(hhRef, {
      memberUids: arrayUnion(safeUid),
      [`memberLabels.${safeUid}`]: safeName,
      lastJoinToken: safeToken,
      updatedAtMs: Date.now(),
    });

    // Consume single-use invite token cleanly after joining
    await deleteDoc(inviteRef).catch(() => {});

    const loaded = await loadHouseholdShare(householdId);
    if (!loaded) return { ok: false };
    return {
      ok: true,
      household: loaded.summary,
      rawData: loaded.rawData,
    };
  } catch {
    return { ok: false };
  }
}

export async function saveHouseholdShare(
  householdId: string,
  uid: string,
  displayName: string,
  data: HouseholdSharedState
): Promise<boolean> {
  const db = getFirebaseDb();
  const safeId = sanitizeText(householdId, 64);
  const safeUid = sanitizeText(uid, 128);
  if (!db || !safeId || !safeUid) return false;
  try {
    const safeName = sanitizeText(displayName, 40);
    const patch: Record<string, unknown> = {
      dogs: boundDogsForCloud(data.dogs),
      activeDogIds: data.activeDogIds.slice(0, 5),
      savedPlaceIds: data.savedPlaceIds.slice(0, 50),
      walkLogs: data.walkLogs.slice(0, 100),
      careReminders: data.careReminders.slice(0, 12),
      updatedAtMs: Date.now(),
    };
    if (safeName) {
      patch[`memberLabels.${safeUid}`] = safeName;
    }
    await updateDoc(doc(db, 'households', safeId), patch);
    return true;
  } catch {
    return false;
  }
}

export async function leaveHouseholdShare(
  householdId: string,
  uid: string,
  isOwner: boolean
): Promise<boolean> {
  const db = getFirebaseDb();
  const safeId = sanitizeText(householdId, 64);
  const safeUid = sanitizeText(uid, 128);
  if (!db || !safeId || !safeUid) return false;
  try {
    const hhRef = doc(db, 'households', safeId);
    if (isOwner) {
      await deleteDoc(hhRef);
    } else {
      await updateDoc(hhRef, {
        memberUids: arrayRemove(safeUid),
        updatedAtMs: Date.now(),
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads the signed-in user's per-spot photo memories from `users/{uid}/photoMemories`.
 */
export async function loadCloudPhotoMemories(
  uid: string
): Promise<Array<Record<string, unknown>>> {
  const safeUid = sanitizeText(uid, 128);
  if (!safeUid) return [];
  const db = getFirebaseDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'users', safeUid, 'photoMemories'));
    return snap.docs.map((d) => d.data() as Record<string, unknown>);
  } catch {
    return [];
  }
}

/**
 * Saves one sanitized photo memory document (`users/{uid}/photoMemories/{id}`)
 * so each photo stays well under Firestore's 1 MiB per-document limit.
 */
export async function saveCloudPhotoMemory(
  uid: string,
  memory: PhotoMemory
): Promise<boolean> {
  const safeUid = sanitizeText(uid, 128);
  const safeId = sanitizeText(memory.id, 48);
  const safeThumb = sanitizeAvatarDataUri(memory.thumbnailUri, 48_000);
  const safePhoto = sanitizeAvatarDataUri(memory.photoUri, 170_000);
  if (!safeUid || !safeId || !safeThumb || !safePhoto) return false;
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    await setDoc(doc(db, 'users', safeUid, 'photoMemories', safeId), {
      id: safeId,
      thumbnailUri: safeThumb,
      photoUri: safePhoto,
      latitude: memory.latitude,
      longitude: memory.longitude,
      placeName: sanitizeText(memory.placeName, 60) || 'Walk Memory',
      suburbLabel: sanitizeText(memory.suburbLabel, 50),
      caption: sanitizeText(memory.caption, 120),
      takenDateIso: memory.takenDateIso,
      dogNames: memory.dogNames.slice(0, 5),
      createdAtMs: Math.round(memory.createdAtMs),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteCloudPhotoMemory(
  uid: string,
  photoId: string
): Promise<boolean> {
  const safeUid = sanitizeText(uid, 128);
  const safeId = sanitizeText(photoId, 48);
  if (!safeUid || !safeId) return false;
  const db = getFirebaseDb();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, 'users', safeUid, 'photoMemories', safeId));
    return true;
  } catch {
    return false;
  }
}
