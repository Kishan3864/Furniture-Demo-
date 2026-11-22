'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Database,
  ImagePlus,
  Languages,
  LogOut,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { LANGUAGES, useLang, useT } from '@/lib/i18n';
import { db } from '@/lib/firebase';
import { listDeleted, restoreDoc, restoreOrder, saveSettings } from '@/lib/actions';
import { uploadImage } from '@/lib/upload';
import { settingsSchema, validate } from '@/lib/schemas';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { removeDemoData, seedDemoData } from '@/lib/seed';
import type { Order, StageDef, WorkshopSettings } from '@/lib/types';
import { errMsg, fmtDate, money } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  ImagePickButton,
  Input,
  PageHeader,
  PageLoader,
  Segmented,
  Spinner,
  Textarea,
  useConfirm,
} from '@/components/ui';
import { ListEditor } from '@/components/list-editor';
import { StoredImg } from '@/components/stored-image';
import { ChangePasswordCard } from '@/components/change-password';
import { InstallButton } from '@/components/install-app';
import { TourButton } from '@/components/tour';

/* ------------------------------ Profile ------------------------------ */

function ProfileSection({ settings }: { settings: WorkshopSettings }) {
  const t = useT();
  const confirm = useConfirm();
  const [f, setF] = useState({
    name: settings.name || '',
    tagline: settings.tagline || '',
    address: settings.address || '',
    phone: settings.phone || '',
    gst: settings.gst || '',
    billTerms: settings.billTerms || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    const v = validate(settingsSchema, f);
    if (!v.ok) {
      setErrors(v.errors);
      toast.error(t('Please fix the errors in the form'));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await saveSettings({
        name: v.data.name,
        tagline: v.data.tagline || '',
        address: v.data.address || '',
        phone: v.data.phone || '',
        gst: (v.data.gst || '').toUpperCase(),
        billTerms: v.data.billTerms || '',
      });
      toast.success(t('Workshop profile saved'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const photo = await uploadImage(`workshop/logo-${Date.now()}.jpg`, file, { maxSide: 512 });
      await saveSettings({ logoUrl: photo.url });
      toast.success(t('Logo updated'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    const ok = await confirm({ title: t('Remove logo?'), danger: true, confirmText: t('Remove') });
    if (!ok) return;
    try {
      await saveSettings({ logoUrl: '' });
      toast.success(t('Logo removed'));
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Card>
      <CardHeader title={t('Workshop profile')} />
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <StoredImg src={settings.logoUrl} alt="Logo" className="h-20 w-20 rounded-2xl border border-wood-100 bg-white object-contain" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-wood-600 to-wood-800 text-xl font-extrabold text-cream-50">
              WB
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <ImagePickButton onPick={onLogo} multiple={false} icon={<ImagePlus className="h-4 w-4" />} loading={uploading} size="sm">
              {settings.logoUrl ? t('Change logo') : t('Upload logo')}
            </ImagePickButton>
            {settings.logoUrl && (
              <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={removeLogo}>
                {t('Remove')}
              </Button>
            )}
            <p className="w-full text-xs text-wood-600">{t('Shown on bills, receipts and the customer status page. A square logo works best.')}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Workshop name')} required error={errors.name}>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} />
          </Field>
          <Field label={t('Tagline')} error={errors.tagline}>
            <Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} placeholder="Brighton Solution" />
          </Field>
          <Field label={t('Phone')} error={errors.phone}>
            <Input value={f.phone} inputMode="tel" onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          <Field label={t('GSTIN (optional)')} error={errors.gst} hint={t('You can leave this empty')}>
            <Input
              value={f.gst}
              onChange={(e) => setF({ ...f, gst: e.target.value.toUpperCase() })}
              invalid={!!errors.gst}
              maxLength={15}
              placeholder="23ABCDE1234F1Z5"
            />
          </Field>
          <Field label={t('Address')} error={errors.address} className="sm:col-span-2">
            <Textarea value={f.address} rows={2} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </Field>
          <Field label={t('Bill / estimate terms')} error={errors.billTerms} className="sm:col-span-2" hint={t('Printed at the bottom of bills')}>
            <Textarea value={f.billTerms} rows={3} onChange={(e) => setF({ ...f, billTerms: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            {t('Save profile')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ String lists ------------------------------ */

type ListField = 'itemTypes' | 'woodTypes' | 'expenseCategories' | 'skills';

function ListSection({
  settings,
  field,
  title,
  hint,
  placeholder,
}: {
  settings: WorkshopSettings;
  field: ListField;
  title: string;
  hint: string;
  placeholder: string;
}) {
  const t = useT();
  const saved = settings[field] || [];
  const [items, setItems] = useState<string[]>(saved);
  const [saving, setSaving] = useState(false);
  const savedKey = JSON.stringify(saved);
  useEffect(() => {
    setItems(JSON.parse(savedKey) as string[]);
  }, [savedKey]);
  const dirty = JSON.stringify(items) !== savedKey;

  const save = async () => {
    if (!items.length) return toast.error(t('Keep at least 1 item'));
    setSaving(true);
    try {
      await saveSettings({ [field]: items } as Partial<WorkshopSettings>);
      toast.success(t('{name} saved', { name: title }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title={title} action={dirty ? <Badge tone="amber">{t('Unsaved')}</Badge> : undefined} />
      <div className="space-y-3 p-4">
        <p className="text-xs text-wood-600">{hint}</p>
        <ListEditor items={items} onChange={setItems} placeholder={placeholder} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setItems(DEFAULT_SETTINGS[field])}>
            {t('Default')}
          </Button>
          {dirty && (
            <Button variant="outline" size="sm" onClick={() => setItems(saved)}>
              {t('Cancel')}
            </Button>
          )}
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
            {t('Save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ Stages ------------------------------ */

function StagesSection({ settings }: { settings: WorkshopSettings }) {
  const t = useT();
  const { orders } = useData();
  const confirm = useConfirm();
  const toDraft = (s: StageDef[]) => s.map((x) => ({ name: x.name, percent: String(x.percent) }));
  const savedKey = JSON.stringify(settings.stages);
  const [rows, setRows] = useState(toDraft(settings.stages));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setRows(toDraft(JSON.parse(savedKey) as StageDef[]));
  }, [savedKey]);

  const parsed: StageDef[] = rows.map((r) => ({ name: r.name.trim(), percent: Number(r.percent) }));
  const dirty = JSON.stringify(parsed) !== savedKey;
  const last = settings.stages.length - 1;
  const activeOrders = useMemo(() => orders.filter((o) => o.stageIndex < last).length, [orders, last]);

  const update = (i: number, patch: Partial<{ name: string; percent: string }>) =>
    setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  const check = (): string => {
    if (parsed.length < 3) return t('At least 3 stages are needed');
    const names = new Set<string>();
    for (let i = 0; i < parsed.length; i++) {
      const s = parsed[i];
      if (!s.name) return t('Stage {n} has no name', { n: i + 1 });
      if (names.has(s.name.toLowerCase())) return t('"{name}" is used twice', { name: s.name });
      names.add(s.name.toLowerCase());
      if (!Number.isFinite(s.percent) || s.percent < 0 || s.percent > 100 || rows[i].percent.trim() === '')
        return t('"{name}" % must be between 0 and 100', { name: s.name });
      if (i > 0 && s.percent <= parsed[i - 1].percent) return t('"{name}" % must be higher than the previous stage', { name: s.name });
    }
    if (parsed[parsed.length - 1].percent !== 100) return t('The last stage (Delivered) must be 100%');
    return '';
  };

  const save = async () => {
    const err = check();
    setError(err);
    if (err) return;
    const structural =
      parsed.length !== settings.stages.length || parsed.some((s, i) => s.name !== settings.stages[i]?.name);
    if (structural && activeOrders > 0) {
      const ok = await confirm({
        title: t('Change stages?'),
        message: t(
          '{n} active orders will be matched to the new list by stage number (for example stage 3 = the 3rd stage in the new list). The stage name on each order changes at its next update.',
          { n: activeOrders },
        ),
        confirmText: t('Yes, save'),
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await saveSettings({ stages: parsed.map((s) => ({ name: s.name, percent: Math.round(s.percent) })) });
      toast.success(t('Stages saved'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title={t('Work stages')} action={dirty ? <Badge tone="amber">{t('Unsaved')}</Badge> : undefined} />
      <div className="space-y-3 p-4">
        <p className="text-xs text-wood-600">
          {t('Each stage % is shown in the progress bar. The last stage means Delivered and the one before it means Ready (used by the dashboard and delivery list). The % must keep increasing.')}
        </p>
        <div className="space-y-2">
          {rows.map((r, i) => {
            const tag = i === rows.length - 1 ? 'Delivered' : i === rows.length - 2 ? 'Ready' : null;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wood-100 text-xs font-bold text-wood-700">
                  {i + 1}
                </span>
                <div className="relative min-w-0 flex-1">
                  <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder={t('Stage name')} maxLength={30} />
                  {tag && (
                    <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 sm:block">
                      <Badge tone={tag === 'Delivered' ? 'green' : 'purple'}>{t(tag)}</Badge>
                    </span>
                  )}
                </div>
                <div className="relative w-20 shrink-0">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={r.percent}
                    onChange={(e) => update(i, { percent: e.target.value })}
                    className="pr-6 text-right"
                    min={0}
                    max={100}
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-wood-500">%</span>
                </div>
                <div className="flex shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="rounded-lg p-1.5 text-wood-600 hover:bg-wood-100 disabled:opacity-30"
                    aria-label={t('Move up')}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    className="rounded-lg p-1.5 text-wood-600 hover:bg-wood-100 disabled:opacity-30"
                    aria-label={t('Move down')}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, k) => k !== i))}
                    disabled={rows.length <= 3}
                    className="rounded-lg p-1.5 text-wood-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    aria-label={t('Remove')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              // insert before the last (Delivered) stage
              const next = [...rows];
              const prev = Number(next[next.length - 2]?.percent) || 0;
              const lastPct = Number(next[next.length - 1]?.percent) || 100;
              next.splice(Math.max(0, next.length - 1), 0, {
                name: '',
                percent: String(Math.min(lastPct - 1, Math.round((prev + lastPct) / 2))),
              });
              setRows(next);
            }}
          >
            {t('Add stage')}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => setRows(toDraft(DEFAULT_SETTINGS.stages))}
            >
              {t('Default')}
            </Button>
            {dirty && (
              <Button variant="outline" size="sm" onClick={() => setRows(toDraft(settings.stages))}>
                {t('Cancel')}
              </Button>
            )}
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
              {t('Save stages')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ Trash ------------------------------ */

type TrashCol = 'orders' | 'customers' | 'karigars' | 'stock' | 'expenses';
type Rec = Record<string, unknown> & { id: string };

const TRASH_COLS: { col: TrashCol; label: string; line: (r: Rec) => string }[] = [
  {
    col: 'orders',
    label: 'Orders',
    line: (r) => `${r.orderNo || ''} · ${r.itemType || ''}${r.title ? ` - ${r.title}` : ''} · ${r.customerName || ''}`,
  },
  { col: 'customers', label: 'Customers', line: (r) => `${r.name || ''} · ${r.phone || ''}` },
  { col: 'karigars', label: 'Workers', line: (r) => `${r.name || ''}${r.skill ? ` · ${r.skill}` : ''}` },
  { col: 'stock', label: 'Stock items', line: (r) => `${r.name || ''} · ${r.qty ?? 0} ${r.unit || ''}` },
  {
    col: 'expenses',
    label: 'Expenses',
    line: (r) => `${fmtDate(String(r.date || ''))} · ${r.category || ''} · ${money(Number(r.amount) || 0)}`,
  },
];

function TrashSection({ settings }: { settings: WorkshopSettings }) {
  const t = useT();
  const [data, setData] = useState<Record<TrashCol, Rec[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(TRASH_COLS.map(async (c) => [c.col, (await listDeleted(c.col)) as Rec[]] as const));
      const out = Object.fromEntries(entries) as Record<TrashCol, Rec[]>;
      (Object.keys(out) as TrashCol[]).forEach((k) =>
        out[k].sort((a, b) => (Number(b.deletedAt) || 0) - (Number(a.deletedAt) || 0)),
      );
      setData(out);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const restore = async (col: TrashCol, r: Rec) => {
    setBusy(r.id);
    try {
      if (col === 'orders') await restoreOrder(r as unknown as Order, settings);
      else await restoreDoc(col, r.id);
      setData((d) => (d ? { ...d, [col]: d[col].filter((x) => x.id !== r.id) } : d));
      toast.success(t('Restored'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const total = data ? Object.values(data).reduce((a, l) => a + l.length, 0) : 0;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> {t('Recycle bin')}
          </span>
        }
        action={
          <Button variant="outline" size="sm" onClick={load} loading={loading} icon={<RotateCcw className="h-3.5 w-3.5" />}>
            {data ? t('Refresh') : t('Show deleted items')}
          </Button>
        }
      />
      <div className="p-4">
        {!data ? (
          <p className="text-sm text-wood-600">
            {t('Deleted orders, customers, workers, stock items and expenses can be restored from here. Restoring an order also restores its payments.')}
          </p>
        ) : total === 0 ? (
          <p className="py-4 text-center text-sm text-wood-600">{t('The recycle bin is empty')}</p>
        ) : (
          <div className="space-y-4">
            {TRASH_COLS.filter((c) => data[c.col].length).map((c) => (
              <div key={c.col}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-wood-500">
                  {t(c.label)} ({data[c.col].length})
                </p>
                <ul className="divide-y divide-wood-50 rounded-xl border border-wood-100">
                  {data[c.col].map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0 truncate text-sm text-wood-900">{c.line(r)}</span>
                      <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => restore(c.col, r)}>
                        {t('Restore')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {data.karigars.length > 0 && (
              <p className="text-xs text-wood-600">{t('After restoring a worker, set them as active again from the Workers page.')}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------ Demo data ------------------------------ */

function DemoSection() {
  const t = useT();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<'add' | 'remove' | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#demo') {
      setTimeout(() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, []);

  const add = async () => {
    const ok = await confirm({
      title: t('Load demo data?'),
      message: t('Sample customers, workers, orders (at different stages), payments, stock and expenses will be added. You can remove them later with "Remove demo data".'),
      confirmText: t('Yes, load it'),
    });
    if (!ok) return;
    setBusy('add');
    try {
      const r = await seedDemoData(db(), { by: user?.name });
      toast.success(t('Demo data ready: {orders} orders, {customers} customers, {payments} payments', { orders: r.orders, customers: r.customers, payments: r.payments }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('Remove demo data?'),
      message: t('Only the demo records will be deleted permanently. Your real data stays safe.'),
      confirmText: t('Remove'),
      danger: true,
    });
    if (!ok) return;
    setBusy('remove');
    try {
      const n = await removeDemoData(db());
      toast.success(n ? t('{n} demo records removed', { n }) : t('No demo data found'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="demo" className="scroll-mt-20">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" /> {t('Demo data')}
            </span>
          }
        />
        <div className="space-y-3 p-4">
          <p className="text-sm text-wood-700">
            {t("Load sample data to try the app - you will see overdue orders, today's deliveries, ready orders, pending payments and low stock.")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={add} loading={busy === 'add'} disabled={!!busy} icon={<Sparkles className="h-4 w-4" />}>
              {t('Load demo data')}
            </Button>
            <Button variant="outline" onClick={remove} loading={busy === 'remove'} disabled={!!busy} icon={<Trash2 className="h-4 w-4" />}>
              {t('Remove demo data')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ Account ------------------------------ */

function AccountSection() {
  const t = useT();
  const { user, logout } = useAuth();
  return (
    <Card>
      <CardHeader title={t('My account')} />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-wood-950">{user?.name}</p>
          <p className="truncate text-sm text-wood-600">{user?.email}</p>
          <Badge tone="wood" className="mt-1">
            {user?.role === 'owner' ? t('Owner / Admin') : t('Worker')}
          </Badge>
        </div>
        <Button variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
          {t('Sign out')}
        </Button>
      </div>
      <div className="border-t border-wood-100 px-4 py-3 text-xs text-wood-600">
        {t('Create worker logins from the Workers page. Workers only see the jobs assigned to them (no prices or payments).')}
      </div>
    </Card>
  );
}

/* ------------------------------ Language ------------------------------ */

function LanguageSection() {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Languages className="h-4 w-4" /> {t('Language')}
          </span>
        }
      />
      <div className="space-y-2 p-4">
        <Segmented value={lang} onChange={setLang} options={LANGUAGES.map((l) => ({ value: l.value, label: l.label }))} />
        <p className="text-xs text-wood-600">{t('English is the default. Hinglish is optional. This choice is saved on this device.')}</p>
      </div>
    </Card>
  );
}

/* ------------------------------ App (install + tour) ------------------------------ */

function AppSection() {
  const t = useT();
  return (
    <Card>
      <CardHeader title={t('App')} />
      <div className="space-y-3 p-4">
        <p className="text-xs text-wood-600">
          {t('Install WoodBook on your phone or computer. It opens full screen like a normal app, starts faster and keeps working with weak internet.')}
        </p>
        <div className="flex flex-wrap gap-2">
          <InstallButton size="md" variant="primary" />
          <TourButton size="md" variant="outline" />
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function SettingsPage() {
  const { isOwner } = useAuth();
  const { loading, settings } = useData();
  const t = useT();

  if (!isOwner) return <PageLoader />;
  if (loading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader title={t('Settings')} subtitle={t('Workshop profile, lists, stages and data')} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <ProfileSection settings={settings} />
          <StagesSection settings={settings} />
          <ChangePasswordCard />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <LanguageSection />
          <AppSection />
          <AccountSection />
          <DemoSection />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ListSection
          settings={settings}
          field="itemTypes"
          title={t('Item types')}
          hint={t('These options appear when you create an order (Wardrobe, Bed, Table...).')}
          placeholder={t('e.g. Dressing Table')}
        />
        <ListSection
          settings={settings}
          field="woodTypes"
          title={t('Wood / material types')}
          hint={t('Options for the wood type dropdown.')}
          placeholder={t('e.g. Oak')}
        />
        <ListSection
          settings={settings}
          field="expenseCategories"
          title={t('Expense categories')}
          hint={t('Category options for expenses.')}
          placeholder={t('e.g. Petrol')}
        />
        <ListSection
          settings={settings}
          field="skills"
          title={t('Worker skills')}
          hint={t('Skill options for workers.')}
          placeholder={t('e.g. Welder')}
        />
      </div>
      <TrashSection settings={settings} />
    </div>
  );
}
