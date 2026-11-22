'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { KeyRound } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useT } from '@/lib/i18n';
import { validate } from '@/lib/schemas';
import { errMsg } from '@/lib/utils';
import { Button, Card, CardHeader, Field, Input } from './ui';

const schema = z
  .object({
    current: z.string().min(1, 'Enter your current password'),
    next: z.string().min(6, 'Minimum 6 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });

/** Lets the signed-in user change their password (re-authenticates first). */
export function ChangePasswordCard() {
  const t = useT();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const v = validate(schema, f);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    const user = auth().currentUser;
    if (!user?.email) return;
    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, f.current));
      await updatePassword(user, f.next);
      setF({ current: '', next: '', confirm: '' });
      toast.success(t('Password changed'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> {t('Change password')}
          </span>
        }
      />
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <Field label={t('Current password')} error={errors.current}>
          <Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        </Field>
        <Field label={t('New password')} error={errors.next}>
          <Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        </Field>
        <Field label={t('Confirm new password')} error={errors.confirm}>
          <Input type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        </Field>
        <div className="sm:col-span-3">
          <Button onClick={save} loading={busy}>
            {t('Update password')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
