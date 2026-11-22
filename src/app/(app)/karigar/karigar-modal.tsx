'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useData } from '@/lib/data';
import { saveKarigar } from '@/lib/actions';
import { karigarSchema, validate } from '@/lib/schemas';
import type { Karigar } from '@/lib/types';
import { errMsg } from '@/lib/utils';
import { Button, Field, Input, Modal, Toggle } from '@/components/ui';

export function KarigarModal({
  open,
  onClose,
  karigar,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  karigar?: Karigar | null;
  onSaved?: (id: string) => void;
}) {
  const { settings, karigars } = useData();
  const [f, setF] = useState({ name: '', phone: '', skill: '', active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({
        name: karigar?.name || '',
        phone: karigar?.phone || '',
        skill: karigar?.skill || '',
        active: karigar ? karigar.active !== false : true,
      });
      setErrors({});
    }
  }, [open, karigar]);

  const save = async () => {
    const v = validate(karigarSchema, f);
    if (!v.ok) return setErrors(v.errors);
    const digits = v.data.phone.replace(/\D/g, '').slice(-10);
    const dup = karigars.find((k) => k.id !== karigar?.id && k.phone.replace(/\D/g, '').slice(-10) === digits);
    if (dup) return setErrors({ phone: `Yeh number "${dup.name}" ka hai` });
    setSaving(true);
    try {
      const id = await saveKarigar(v.data, karigar?.id);
      toast.success(karigar ? 'Karigar update ho gaya' : 'Naya karigar jud gaya');
      onSaved?.(id);
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const skills = settings.skills || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={karigar ? 'Karigar edit' : 'Naya Karigar'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Naam" required error={errors.name}>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} autoFocus />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <Input
            value={f.phone}
            inputMode="tel"
            placeholder="98XXXXXXXX"
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            invalid={!!errors.phone}
          />
        </Field>
        <Field label="Skill / Kaam" hint="List se chunein ya khud likhein" error={errors.skill}>
          <Input list="karigar-skills" value={f.skill} onChange={(e) => setF({ ...f, skill: e.target.value })} placeholder="Carpenter, Polish wala..." />
          <datalist id="karigar-skills">
            {skills.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setF({ ...f, skill: s })}
                className={
                  f.skill === s
                    ? 'rounded-full bg-wood-700 px-3 py-1 text-xs font-medium text-white'
                    : 'rounded-full bg-wood-100 px-3 py-1 text-xs font-medium text-wood-800 hover:bg-wood-200'
                }
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={f.active ? 'Active (kaam par hai)' : 'Inactive'} />
      </div>
    </Modal>
  );
}
