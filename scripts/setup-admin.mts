/**
 * One-time workshop setup: creates the ADMIN login (and optionally demo data + a demo WORKER login).
 *
 *   npm run setup:admin -- --email admin@example.com --password "Secret123" [--name "Admin"]
 *                          [--demo] [--worker-email w@example.com --worker-password "Secret456"]
 *
 * Reads Firebase web config from .env.local. Safe to re-run: it refuses to change an existing admin.
 */
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, collection, writeBatch, addDoc, terminate } from 'firebase/firestore';
import { seedDemoData } from '../src/lib/seed.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function getOrCreateUser(app: ReturnType<typeof initializeApp>, email: string, password: string, name: string) {
  const a = getAuth(app);
  try {
    const c = await createUserWithEmailAndPassword(a, email, password);
    await updateProfile(c.user, { displayName: name });
    return { user: c.user, created: true };
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/email-already-in-use') throw e;
    const c = await signInWithEmailAndPassword(a, email, password);
    return { user: c.user, created: false };
  }
}

async function main() {
  const email = arg('email');
  const password = arg('password');
  const name = arg('name') || 'Admin';
  if (!cfg.apiKey || !cfg.projectId) throw new Error('Firebase config missing - fill .env.local first');
  if (!email || !password) throw new Error('Usage: --email <email> --password <password> [--demo] [--worker-email .. --worker-password ..]');

  const app = initializeApp(cfg);
  const db = getFirestore(app);

  // 1) Admin account + one-time owner bootstrap
  const { user, created } = await getOrCreateUser(app, email, password, name);
  const meta = await getDoc(doc(db, 'meta', 'owner'));
  if (meta.exists() && meta.data().uid !== user.uid) {
    throw new Error('An admin already exists for this workshop. Sign in with that account instead.');
  }
  if (!meta.exists()) {
    const b = writeBatch(db);
    b.set(doc(db, 'meta', 'owner'), { uid: user.uid, at: Date.now() });
    b.set(doc(db, 'users', user.uid), { uid: user.uid, name, email, role: 'owner', karigarId: null, active: true });
    await b.commit();
  }
  console.log(`Admin ready: ${email} (${created ? 'created' : 'already existed'})`);

  // 2) Demo data
  if (has('demo')) {
    const res = await seedDemoData(db, { by: name });
    console.log('Demo data added:', JSON.stringify(res));
  }

  // 3) Demo worker login
  const wEmail = arg('worker-email');
  const wPass = arg('worker-password');
  if (wEmail && wPass) {
    const ks = await getDocs(collection(db, 'karigars'));
    let k = ks.docs.find((d) => !d.data().deleted && !d.data().uid);
    let kid = k?.id;
    let kName = (k?.data().name as string) || 'Demo Worker';
    if (!kid) {
      const r = await addDoc(collection(db, 'karigars'), {
        name: kName, phone: '9000000000', skill: 'Carpenter', active: true, email: null, uid: null, deleted: false, createdAt: Date.now(),
      });
      kid = r.id;
    }
    const sec = initializeApp(cfg, 'worker');
    const w = await getOrCreateUser(sec, wEmail, wPass, kName);
    await signOut(getAuth(sec));
    await deleteApp(sec);
    const b = writeBatch(db);
    b.set(doc(db, 'users', w.user.uid), { uid: w.user.uid, name: kName, email: wEmail, role: 'karigar', karigarId: kid, active: true });
    b.update(doc(db, 'karigars', kid), { email: wEmail, uid: w.user.uid });
    await b.commit();
    console.log(`Worker login ready: ${wEmail} -> worker "${kName}"`);
  }

  await terminate(db);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Setup failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
