'use client';

import { initializeApp, getApps, getApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured =
  !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('your-');

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

/** Lazily initialise Firebase (client only) so SSR/build never touches it. */
export function app(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function auth(): Auth {
  return getAuth(app());
}

/** Firestore with offline persistence (IndexedDB) for offline-friendly reads. */
export function db(): Firestore {
  if (_db) return _db;
  try {
    _db = initializeFirestore(app(), {
      localCache:
        typeof window !== 'undefined'
          ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
          : undefined,
    });
  } catch {
    _db = getFirestore(app());
  }
  return _db;
}

export function storage(): FirebaseStorage {
  return getStorage(app());
}

/**
 * Create a login for a karigar without signing out the owner:
 * uses a temporary secondary Firebase app instance.
 */
export async function createLoginForStaff(email: string, password: string): Promise<string> {
  const name = `staff-${Date.now()}`;
  const secondary = initializeApp(firebaseConfig, name);
  try {
    const secAuth = getAuth(secondary);
    const cred = await createUserWithEmailAndPassword(secAuth, email, password);
    const uid = cred.user.uid;
    await signOut(secAuth);
    return uid;
  } finally {
    await deleteApp(secondary);
  }
}
