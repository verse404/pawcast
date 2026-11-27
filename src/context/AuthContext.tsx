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
  deleteCurrentAccount,
  loadCloudUserState,
  requestPasswordReset,
  resendVerificationEmail,
  saveCloudUserState,
  signInWithEmail,
  signOutCurrentUser,
  signUpWithEmail,
  subscribeToAuthState,
} from '../services/authService';
import { isFirebaseConfigured } from '../services/firebaseClient';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface AuthContextValue {
  user: AuthUserSummary | null;
  isInitializing: boolean;
  isFirebaseConfigured: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncedAtMs: number | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  resendVerification: () => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  deleteAccount: (currentPassword: string) => Promise<AuthActionResult>;
  pullCloudProfile: () => Promise<Record<string, unknown> | null>;
  pushCloudProfile: (payload: CloudSyncPayload) => Promise<boolean>;
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
      }
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return signInWithEmail(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    return signUpWithEmail(email, password);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return requestPasswordReset(email);
  }, []);

  const resendVerification = useCallback(async () => {
    return resendVerificationEmail();
  }, []);

  const signOut = useCallback(async () => {
    await signOutCurrentUser();
    setUser(null);
    setSyncStatus('idle');
    setLastSyncedAtMs(null);
    // Clear transient browser memory state cleanly on logout
    triggerCleanWebReload();
  }, []);

  const deleteAccount = useCallback(async (currentPassword: string) => {
    const res = await deleteCurrentAccount(currentPassword);
    if (res.ok) {
      await AsyncStorage.removeItem('@pawcast/multi-region/v2.2').catch(() => {});
      setUser(null);
      setSyncStatus('idle');
      setLastSyncedAtMs(null);
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isFirebaseConfigured,
      syncStatus,
      lastSyncedAtMs,
      signIn,
      signUp,
      resetPassword,
      resendVerification,
      signOut,
      deleteAccount,
      pullCloudProfile,
      pushCloudProfile,
    }),
    [
      user,
      isInitializing,
      syncStatus,
      lastSyncedAtMs,
      signIn,
      signUp,
      resetPassword,
      resendVerification,
      signOut,
      deleteAccount,
      pullCloudProfile,
      pushCloudProfile,
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
