import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from '@react-native-firebase/auth';
import { doc, onSnapshot, updateDoc, FieldValue } from '@react-native-firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS, type FirestoreUser } from '../lib/firestore';
import { registerPushToken } from '../lib/push';

/**
 * Port of the web app's src/context/AuthContext.tsx. Two things differ from
 * the web version by necessity, not by choice:
 *  - No js-cookie session cookie: @react-native-firebase/auth persists the
 *    session natively, so onAuthStateChanged restores it on cold start.
 *  - Presence uses AppState (foreground/background) instead of window
 *    focus/blur — the same "online while the user can plausibly see this
 *    screen" semantics, just the RN equivalent signal.
 */
interface AuthContextValue {
  user: User | null;
  profile: FirestoreUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Auth state ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        registerPushToken(firebaseUser.uid);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // ─── Live profile sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fallbackTimer = setTimeout(() => {
      setLoading((current) => {
        if (current) console.warn('Profile snapshot loading timed out after 2s safety limit.');
        return false;
      });
    }, 2000);

    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.USERS, user.uid),
      (snap) => {
        clearTimeout(fallbackTimer);
        const nextProfile = snap.exists() ? (snap.data() as FirestoreUser) : null;
        if (nextProfile?.isSuspended) {
          signOut(auth);
          return;
        }
        setProfile(nextProfile);
        setLoading(false);
      },
      (error) => {
        clearTimeout(fallbackTimer);
        console.warn('Profile listener error:', error);
        setLoading(false);
      }
    );
    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [user]);

  // ─── Presence ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);

    const updateStatus = (status: 'online' | 'offline') => {
      updateDoc(userRef, { status, lastSeen: FieldValue.serverTimestamp() }).catch((error) => {
        console.warn('Presence update ignored during cleanup/error:', error);
      });
    };

    updateStatus('online');

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      updateStatus(state === 'active' ? 'online' : 'offline');
    });

    return () => {
      subscription.remove();
      updateStatus('offline');
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return <AuthContext.Provider value={{ user, profile, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
