'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff, HardHat, KeyRound, ShieldCheck } from 'lucide-react';
import { auth, db, firebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { validate } from '@/lib/schemas';
import { cn, errMsg } from '@/lib/utils';
import { Button, Field, Input, PageLoader } from '@/components/ui';
import { LanguageSwitch } from '@/components/language-switch';
import { InstallButton } from '@/components/install-app';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});
const setupSchema = loginSchema.extend({ name: z.string().trim().min(2, 'Name is required') });

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginInner />
    </Suspense>
  );
}

type Role = 'admin' | 'worker';

function LoginInner() {
  const { ready, fbUser, user, isKarigar, noProfile } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const t = useT();
  const [role, setRole] = useState<Role>(params.get('as') === 'worker' ? 'worker' : 'admin');
  /** true while we verify that the account matches the chosen tab */
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  /** null = checking; true = an admin already exists (sign in only); false = first-time setup allowed */
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!checking && ready && fbUser && (user || noProfile)) router.replace(isKarigar ? '/jobs' : '/');
  }, [checking, ready, fbUser, user, isKarigar, noProfile, router]);

  useEffect(() => {
    if (!firebaseConfigured) return;
    getDoc(doc(db(), 'meta', 'owner'))
      .then((s) => setHasAdmin(s.exists()))
      .catch(() => setHasAdmin(true));
  }, []);

  if (!firebaseConfigured) return <SetupNotice />;
  if (!ready) return <PageLoader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(mode === 'login' ? loginSchema : setupSchema, f);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    setBusy(true);
    try {
      if (mode === 'login') {
        setChecking(true);
        const cred = await signInWithEmailAndPassword(auth(), f.email.trim(), f.password);
        // keep admin and worker logins separate
        const prof = await getDoc(doc(db(), 'users', cred.user.uid)).catch(() => null);
        const accRole = prof?.exists() ? (prof.data().role as string) : null;
        if (accRole && ((role === 'admin' && accRole !== 'owner') || (role === 'worker' && accRole !== 'karigar'))) {
          await signOut(auth());
          toast.error(
            accRole === 'karigar'
              ? t('This is a worker account. Please use Worker login.')
              : t('This is an admin account. Please use Admin login.'),
          );
          setRole(accRole === 'karigar' ? 'worker' : 'admin');
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth(), f.email.trim(), f.password);
        await updateProfile(cred.user, { displayName: f.name.trim() });
        toast.success(t('Admin account created'));
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
      setChecking(false);
    }
  };

  const reset = async () => {
    if (!z.string().email().safeParse(f.email.trim()).success) return setErrors({ email: 'Enter your email first' });
    try {
      await sendPasswordResetEmail(auth(), f.email.trim());
      toast.success(t('Password reset link sent to your email'));
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-cream-100 to-wood-100">
      <div className="flex items-center justify-end gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <InstallButton />
        <LanguageSwitch />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-wood-600 to-wood-800 text-xl font-extrabold text-cream-50 shadow-lg shadow-wood-900/20">
              FC
            </div>
            <h1 className="mt-3 text-2xl font-bold text-wood-950">FurniCraft</h1>
            <p className="text-sm text-wood-600">{t('Furniture workshop management')} · Brighton Solution</p>
          </div>

          {mode === 'login' && (
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-wood-200 bg-white p-1" role="tablist">
              {(['admin', 'worker'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  onClick={() => {
                    setRole(r);
                    setErrors({});
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold transition',
                    role === r ? 'bg-wood-700 text-white shadow-sm' : 'text-wood-700 hover:bg-wood-50',
                  )}
                >
                  {r === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <HardHat className="h-4 w-4" />}
                  {r === 'admin' ? t('Admin login') : t('Worker login')}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="space-y-3 rounded-2xl border border-wood-100 bg-white p-5 shadow-soft">
            <div>
              <h2 className="text-lg font-semibold text-wood-950">
                {mode === 'setup' ? t('Set up admin account') : role === 'admin' ? t('Admin sign in') : t('Worker sign in')}
              </h2>
              <p className="text-xs text-wood-600">
                {mode === 'setup'
                  ? t('This first account will be the workshop admin.')
                  : role === 'admin'
                    ? t('Full access: orders, payments, workers, reports and settings.')
                    : t('See your assigned jobs, update the stage and add photos and videos.')}
              </p>
            </div>
            {mode === 'setup' && (
              <Field label={t('Your name')} error={errors.name}>
                <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} autoComplete="name" />
              </Field>
            )}
            <Field label={t('Email')} error={errors.email}>
              <Input
                type="email"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                invalid={!!errors.email}
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
              />
            </Field>
            <Field label={t('Password')} error={errors.password}>
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
                  aria-label={show ? t('Hide password') : t('Show password')}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" className="w-full" size="lg" loading={busy}>
              {mode === 'login' ? t('Sign in') : t('Create admin account')}
            </Button>
            {mode === 'login' && role === 'admin' && (
              <button type="button" onClick={reset} className="flex w-full items-center justify-center gap-1 text-xs text-wood-600 hover:underline">
                <KeyRound className="h-3.5 w-3.5" /> {t('Forgot password?')}
              </button>
            )}
          </form>

          {hasAdmin === false && role === 'admin' && (
            <p className="mt-4 text-center text-sm text-wood-700">
              {mode === 'login' ? (
                <>
                  {t('First time here?')}{' '}
                  <button className="font-semibold underline" onClick={() => setMode('setup')}>
                    {t('Set up admin account')}
                  </button>
                </>
              ) : (
                <button className="font-semibold underline" onClick={() => setMode('login')}>
                  {t('Back to sign in')}
                </button>
              )}
            </p>
          )}
          {role === 'worker' && mode === 'login' && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-wood-600">
              <HardHat className="h-3.5 w-3.5" /> {t('Workers: ask the admin for your email and password.')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-lg rounded-2xl border border-wood-100 bg-white p-6 shadow-soft">
        <h1 className="text-xl font-bold text-wood-950">Firebase is not configured</h1>
        <p className="mt-2 text-sm text-wood-700">
          Add your Firebase web config to <code>.env.local</code> (Firebase Console → Project settings → Your apps → Web app) and restart.
        </p>
      </div>
    </div>
  );
}
