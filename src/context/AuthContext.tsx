import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  AuthActionResult,
  AuthUserSummary,
  CloudSyncPayload,
  createHouseholdInviteToken,
  createHouseholdShare,
  deleteCloudPhotoMemory,
  deleteCurrentAccount,
  HouseholdSharedState,
  joinHouseholdWithToken,
  leaveHouseholdShare,
  loadCloudPhotoMemories,
  loadCloudUserState,
  loadHouseholdShare,
  requestPasswordReset,
  resendVerificationEmail,
  revokeHouseholdInviteToken,
  saveCloudPhotoMemory,
  saveCloudUserState,
  saveHouseholdShare,
  signInWithEmail,
  signOutCurrentUser,
  signUpWithEmail,
  subscribeToAuthState,
  updateCurrentAuthDisplayName,
} from '../services/authService';
import { isFirebaseConfigured } from '../services/firebaseClient';
import { HouseholdSummary, PhotoMemory } from '../types/walk';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface AuthContextValue {
  user: AuthUserSummary | null;
  isInitializing: boolean;
  isFirebaseConfigured: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncedAtMs: number | null;
  household: HouseholdSummary | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  resendVerification: () => Promise<AuthActionResult>;
  updateAuthDisplayName: (displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: (currentPassword: string) => Promise<AuthActionResult>;
  pullCloudProfile: () => Promise<Record<string, unknown> | null>;
  pushCloudProfile: (payload: CloudSyncPayload) => Promise<boolean>;
  pullCloudPhotoMemories: () => Promise<Array<Record<string, unknown>>>;
  pushCloudPhotoMemory: (memory: PhotoMemory) => Promise<boolean>;
  removeCloudPhotoMemory: (photoId: string) => Promise<boolean>;
  createHousehold: (
    displayName: string,
    initial: HouseholdSharedState
  ) => Promise<{ ok: boolean; householdId?: string; inviteToken?: string }>;
  regenerateHouseholdInvite: (displayName: string) => Promise<string | null>;
  revokeHouseholdInvite: (token: string) => Promise<void>;
  joinHousehold: (
    displayName: string,
    token: string
  ) => Promise<{ ok: boolean; householdId?: string; rawData?: Record<string, unknown> }>;
  pullHousehold: (householdId: string) => Promise<Record<string, unknown> | null>;
  pushHousehold: (
    householdId: string,
    displayName: string,
    data: HouseholdSharedState
  ) => Promise<boolean>;
  leaveHousehold: (householdId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function triggerCleanWebReload(): void {
  if (Platform.OS !== 'web') return;
  const win = globalThis as { location?: { reload?: () => void } };
  win.location?.reload?.();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [isInitializing, setIsInitializing] = useState(isFirebaseConfigured);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedAtMs, setLastSyncedAtMs] = useState<number | null>(null);
  const [household, setHousehold] = useState<HouseholdSummary | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsInitializing(false);
      return;
    }
    const unsub = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setIsInitializing(false);
      if (!nextUser) {
        setSyncStatus('idle');
        setLastSyncedAtMs(null);
        setHousehold(null);
      }
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return signInWithEmail(email, password);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      return signUpWithEmail(email, password, displayName);
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    return requestPasswordReset(email);
  }, []);

  const resendVerification = useCallback(async () => {
    return resendVerificationEmail();
  }, []);

  const updateAuthDisplayName = useCallback(async (displayName: string) => {
    const ok = await updateCurrentAuthDisplayName(displayName);
    if (ok) {
      setUser((prev) => (prev ? { ...prev, displayName } : prev));
    }
    return ok;
  }, []);

  const signOut = useCallback(async () => {
    await signOutCurrentUser();
    setUser(null);
    setSyncStatus('idle');
    setLastSyncedAtMs(null);
    setHousehold(null);
    // Clear transient browser memory state cleanly on logout
    triggerCleanWebReload();
  }, []);

  const deleteAccount = useCallback(async (currentPassword: string) => {
    const res = await deleteCurrentAccount(currentPassword);
    if (res.ok) {
      await AsyncStorage.removeItem('@pawcast/multi-region/v2.2').catch(() => {});
      await AsyncStorage.removeItem('@pawcast/photo-memories/v1').catch(() => {});
      setUser(null);
      setSyncStatus('idle');
      setLastSyncedAtMs(null);
      setHousehold(null);
      triggerCleanWebReload();
    }
    return res;
  }, []);

  const pullCloudProfile = useCallback(async () => {
    if (!user?.uid) return null;
    setSyncStatus('syncing');
    const data = await loadCloudUserState(user.uid);
    if (data) {
      setSyncStatus('synced');
      setLastSyncedAtMs(Date.now());
    } else {
      setSyncStatus('idle');
    }
    return data;
  }, [user?.uid]);

  const pushCloudProfile = useCallback(
    async (payload: CloudSyncPayload) => {
      if (!user?.uid) return false;
      setSyncStatus('syncing');
      const ok = await saveCloudUserState(user.uid, payload);
      if (ok) {
        setSyncStatus('synced');
        setLastSyncedAtMs(Date.now());
      } else {
        setSyncStatus('error');
      }
      return ok;
    },
    [user?.uid]
  );

  const pullCloudPhotoMemories = useCallback(async () => {
    if (!user?.uid) return [];
    return loadCloudPhotoMemories(user.uid);
  }, [user?.uid]);

  const pushCloudPhotoMemory = useCallback(
    async (memory: PhotoMemory) => {
      if (!user?.uid) return false;
      return saveCloudPhotoMemory(user.uid, memory);
    },
    [user?.uid]
  );

  const removeCloudPhotoMemory = useCallback(
    async (photoId: string) => {
      if (!user?.uid) return false;
      return deleteCloudPhotoMemory(user.uid, photoId);
    },
    [user?.uid]
  );

  const createHousehold = useCallback(
    async (displayName: string, initial: HouseholdSharedState) => {
      if (!user?.uid) return { ok: false };
      const res = await createHouseholdShare(user.uid, displayName, initial);
      if (res.ok && res.household) {
        setHousehold(res.household);
        return {
          ok: true,
          householdId: res.household.id,
          inviteToken: res.inviteToken,
        };
      }
      return { ok: false };
    },
    [user?.uid]
  );

  const regenerateHouseholdInvite = useCallback(
    async (displayName: string) => {
      if (!user?.uid || !household?.id) return null;
      const token = await createHouseholdInviteToken(
        household.id,
        user.uid,
        displayName
      );
      if (token) {
        setHousehold((prev) =>
          prev ? { ...prev, activeInviteToken: token } : prev
        );
      }
      return token;
    },
    [user?.uid, household?.id]
  );

  const revokeHouseholdInvite = useCallback(async (token: string) => {
    await revokeHouseholdInviteToken(token);
    setHousehold((prev) =>
      prev ? { ...prev, activeInviteToken: null } : prev
    );
  }, []);

  const joinHousehold = useCallback(
    async (displayName: string, token: string) => {
      if (!user?.uid) return { ok: false };
      const res = await joinHouseholdWithToken(user.uid, displayName, token);
      if (res.ok && res.household) {
        setHousehold(res.household);
        return {
          ok: true,
          householdId: res.household.id,
          rawData: res.rawData,
        };
      }
      return { ok: false };
    },
    [user?.uid]
  );

  const pullHousehold = useCallback(async (householdId: string) => {
    const loaded = await loadHouseholdShare(householdId);
    if (!loaded) return null;
    setHousehold((prev) => ({
      ...loaded.summary,
      activeInviteToken: prev?.activeInviteToken ?? null,
    }));
    return loaded.rawData;
  }, []);

  const pushHousehold = useCallback(
    async (
      householdId: string,
      displayName: string,
      data: HouseholdSharedState
    ) => {
      if (!user?.uid) return false;
      return saveHouseholdShare(householdId, user.uid, displayName, data);
    },
    [user?.uid]
  );

  const leaveHousehold = useCallback(
    async (householdId: string) => {
      if (!user?.uid) return false;
      const isOwner = household?.ownerUid === user.uid;
      const ok = await leaveHouseholdShare(householdId, user.uid, isOwner);
      if (ok) {
        setHousehold(null);
      }
      return ok;
    },
    [user?.uid, household?.ownerUid]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isFirebaseConfigured,
      syncStatus,
      lastSyncedAtMs,
      household,
      signIn,
      signUp,
      resetPassword,
      resendVerification,
      updateAuthDisplayName,
      signOut,
      deleteAccount,
      pullCloudProfile,
      pushCloudProfile,
      pullCloudPhotoMemories,
      pushCloudPhotoMemory,
      removeCloudPhotoMemory,
      createHousehold,
      regenerateHouseholdInvite,
      revokeHouseholdInvite,
      joinHousehold,
      pullHousehold,
      pushHousehold,
      leaveHousehold,
    }),
    [
      user,
      isInitializing,
      syncStatus,
      lastSyncedAtMs,
      household,
      signIn,
      signUp,
      resetPassword,
      resendVerification,
      updateAuthDisplayName,
      signOut,
      deleteAccount,
      pullCloudProfile,
      pushCloudProfile,
      pullCloudPhotoMemories,
      pushCloudPhotoMemory,
      removeCloudPhotoMemory,
      createHousehold,
      regenerateHouseholdInvite,
      revokeHouseholdInvite,
      joinHousehold,
      pullHousehold,
      pushHousehold,
      leaveHousehold,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
