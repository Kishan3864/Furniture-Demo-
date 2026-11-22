'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Eye, EyeOff, Hammer, KeyRound } from 'lucide-react';
import { auth, firebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { validate } from '@/lib/schemas';
import { errMsg } from '@/lib/utils';
import { Button, Field, Input, PageLoader } from '@/components/ui';

const loginSchema = z.object({
  email: z.string().trim().email('Email sahi nahi hai'),
  password: z.string().min(6, 'Password kam se kam 6 character'),
});
const signupSchema = loginSchema.extend({ name: z.string().trim().min(2, 'Naam daalein') });

export default function LoginPage() {
  const { ready, fbUser, user, isKarigar, noProfile } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && fbUser && (user || noProfile)) router.replace(isKarigar ? '/jobs' : '/');
  }, [ready, fbUser, user, isKarigar, noProfile, router]);

  if (!firebaseConfigured) return <SetupNotice />;
  if (!ready) return <PageLoader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(mode === 'login' ? loginSchema : signupSchema, f);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth(), f.email.trim(), f.password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth(), f.email.trim(), f.password);
        await updateProfile(cred.user, { displayName: f.name.trim() });
        toast.success('Account ban gaya');
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!z.string().email().safeParse(f.email.trim()).success) return setErrors({ email: 'Pehle apna email daalein' });
    try {
      await sendPasswordResetEmail(auth(), f.email.trim());
      toast.success('Password reset link email par bhej diya');
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-cream-100 to-wood-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-wood-600 to-wood-800 text-xl font-extrabold text-cream-50 shadow-lg shadow-wood-900/20">
            WB
          </div>
          <h1 className="mt-3 text-2xl font-bold text-wood-950">WoodBook</h1>
          <p className="text-sm text-wood-600">Furniture workshop ka poora hisaab · Brighton Solution</p>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-wood-100 bg-white p-5 shadow-soft">
          <h2 className="font-semibold text-wood-950">{mode === 'login' ? 'Login karein' : 'Owner account banayein'}</h2>
          {mode === 'signup' && (
            <Field label="Aapka naam" error={errors.name}>
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} autoComplete="name" />
            </Field>
          )}
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              invalid={!!errors.email}
              autoComplete="email"
              inputMode="email"
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
                invalid={!!errors.password}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-wood-500"
                aria-label="Show password"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={busy}>
            {mode === 'login' ? 'Login' : 'Account banayein'}
          </Button>
          {mode === 'login' && (
            <button type="button" onClick={reset} className="flex w-full items-center justify-center gap-1 text-xs text-wood-600 hover:underline">
              <KeyRound className="h-3.5 w-3.5" /> Password bhool gaye?
            </button>
          )}
        </form>
        <p className="mt-4 text-center text-sm text-wood-700">
          {mode === 'login' ? (
            <>
              Pehli baar?{' '}
              <button className="font-semibold underline" onClick={() => setMode('signup')}>
                Owner account banayein
              </button>
            </>
          ) : (
            <>
              Account hai?{' '}
              <button className="font-semibold underline" onClick={() => setMode('login')}>
                Login karein
              </button>
            </>
          )}
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-wood-600">
          <Hammer className="h-3.5 w-3.5" /> Karigar: owner se apna email/password lein
        </p>
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-lg rounded-2xl border border-wood-100 bg-white p-6 shadow-soft">
        <h1 className="text-xl font-bold text-wood-950">Firebase setup baaki hai</h1>
        <p className="mt-2 text-sm text-wood-700">
          <code>.env.local</code> mein Firebase web config daalein (Firebase Console → Project settings → Your apps → Web app), phir
          server restart karein.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-wood-950 p-3 text-xs text-cream-100">
{`NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=furniture-webs.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=furniture-webs
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=furniture-webs.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...`}
        </pre>
      </div>
    </div>
  );
}
