'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from './firebase';
import type { AppUser } from './types';

interface AuthCtx {
  ready: boolean;
  fbUser: User | null;
  user: AppUser | null;
  isOwner: boolean;
  isKarigar: boolean;
  noProfile: boolean;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  ready: false,
  fbUser: null,
  user: null,
  isOwner: false,
  isKarigar: false,
  noProfile: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setReady(true);
      return;
    }
    let unsubProfile: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth(), async (u) => {
      unsubProfile?.();
      unsubProfile = null;
      setFbUser(u);
      setNoProfile(false);
      if (!u) {
        setUser(null);
        setReady(true);
        return;
      }
      const ref = doc(db(), 'users', u.uid);
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          // Bootstrap: first ever user becomes the owner
          const ownerRef = doc(db(), 'meta', 'owner');
          const ownerSnap = await getDoc(ownerRef);
          if (!ownerSnap.exists()) {
            const b = writeBatch(db());
            b.set(ownerRef, { uid: u.uid, at: Date.now() });
            b.set(ref, {
              uid: u.uid,
              name: u.displayName || u.email?.split('@')[0] || 'Owner',
              email: u.email || '',
              role: 'owner',
              karigarId: null,
              active: true,
            });
            await b.commit();
          }
        }
      } catch (e) {
        console.warn('profile bootstrap failed', e);
      }
      unsubProfile = onSnapshot(
        ref,
        (s) => {
          if (s.exists()) {
            setUser({ ...(s.data() as AppUser), uid: u.uid });
            setNoProfile(false);
          } else {
            setUser(null);
            setNoProfile(true);
          }
          setReady(true);
        },
        () => {
          setUser(null);
          setNoProfile(true);
          setReady(true);
        },
      );
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  }, []);

  const active = user?.active !== false;
  const value: AuthCtx = {
    ready,
    fbUser,
    user,
    isOwner: !!user && user.role === 'owner' && active,
    isKarigar: !!user && user.role === 'karigar' && active,
    noProfile: noProfile || (!!user && !active),
    logout: async () => {
      await signOut(auth());
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
