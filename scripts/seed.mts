/**
 * WoodBook demo data seeder (CLI).
 *
 *   npm run seed
 *
 * Reads Firebase config + SEED_EMAIL / SEED_PASSWORD from .env.local
 * (the npm script passes --env-file=.env.local). The account must be the
 * workshop OWNER (sign in to the app once first - the first user becomes owner).
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, terminate } from 'firebase/firestore';
import { seedDemoData } from '../src/lib/seed.ts';

const env = process.env;
const config = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const missing = Object.entries({
  NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
  NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
  SEED_EMAIL: env.SEED_EMAIL,
  SEED_PASSWORD: env.SEED_PASSWORD,
})
  .filter(([, v]) => !v || String(v).startsWith('your-'))
  .map(([k]) => k);

if (missing.length) {
  fail(
    `Missing env values: ${missing.join(', ')}\n` +
      '  Fill them in .env.local (Firebase web config + owner login SEED_EMAIL / SEED_PASSWORD) and run `npm run seed` again.',
  );
}

async function main() {
  const app = initializeApp(config);
  const auth = getAuth(app);
  console.log(`→ Signing in as ${env.SEED_EMAIL} ...`);
  try {
    await signInWithEmailAndPassword(auth, String(env.SEED_EMAIL), String(env.SEED_PASSWORD));
  } catch (e) {
    fail(`Login failed: ${(e as Error).message}\n  Pehle app mein is email se signup/login karein (pehla user owner banta hai).`);
  }
  const db = getFirestore(app);
  console.log('→ Writing demo data ...');
  try {
    const counts = await seedDemoData(db, { by: 'Seed script' });
    console.log('\n✔ Demo data ready:');
    for (const [k, v] of Object.entries(counts)) console.log(`   ${k.padEnd(11)} ${v}`);
  } catch (e) {
    fail(
      `Seeding failed: ${(e as Error).message}\n  Check that this account is the OWNER and firestore.rules are deployed (firebase deploy --only firestore).`,
    );
  }
  await signOut(auth).catch(() => {});
  await terminate(db).catch(() => {});
  process.exit(0);
}

main().catch((e) => fail(String(e?.message || e)));
