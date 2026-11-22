'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Database,
  ImagePlus,
  LogOut,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
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
  Spinner,
  Textarea,
  useConfirm,
} from '@/components/ui';
import { ListEditor } from '@/components/list-editor';
import { StoredImg } from '@/components/stored-image';

/* ------------------------------ Profile ------------------------------ */

function ProfileSection({ settings }: { settings: WorkshopSettings }) {
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
      toast.error('Form mein galti hai');
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
      toast.success('Workshop profile save ho gaya');
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
      toast.success('Logo update ho gaya');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    const ok = await confirm({ title: 'Logo hatayein?', danger: true, confirmText: 'Hatayein' });
    if (!ok) return;
    try {
      await saveSettings({ logoUrl: '' });
      toast.success('Logo hata diya');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <Card>
      <CardHeader title="Workshop profile" />
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
              {settings.logoUrl ? 'Logo badlein' : 'Logo upload'}
            </ImagePickButton>
            {settings.logoUrl && (
              <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={removeLogo}>
                Hatayein
              </Button>
            )}
            <p className="w-full text-xs text-wood-600">Bill, receipt aur status page par dikhega. Square logo best rahega.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Workshop ka naam" required error={errors.name}>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} />
          </Field>
          <Field label="Tagline" error={errors.tagline}>
            <Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} placeholder="Brighton Solution" />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input value={f.phone} inputMode="tel" onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          <Field label="GSTIN (optional)" error={errors.gst} hint="Khaali chhod sakte hain">
            <Input
              value={f.gst}
              onChange={(e) => setF({ ...f, gst: e.target.value.toUpperCase() })}
              invalid={!!errors.gst}
              maxLength={15}
              placeholder="23ABCDE1234F1Z5"
            />
          </Field>
          <Field label="Address" error={errors.address} className="sm:col-span-2">
            <Textarea value={f.address} rows={2} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </Field>
          <Field label="Bill / estimate terms" error={errors.billTerms} className="sm:col-span-2" hint="Bill ke neeche print hoga">
            <Textarea value={f.billTerms} rows={3} onChange={(e) => setF({ ...f, billTerms: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            Profile save karein
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
  const saved = settings[field] || [];
  const [items, setItems] = useState<string[]>(saved);
  const [saving, setSaving] = useState(false);
  const savedKey = JSON.stringify(saved);
  useEffect(() => {
    setItems(JSON.parse(savedKey) as string[]);
  }, [savedKey]);
  const dirty = JSON.stringify(items) !== savedKey;

  const save = async () => {
    if (!items.length) return toast.error('Kam se kam 1 item rakhein');
    setSaving(true);
    try {
      await saveSettings({ [field]: items } as Partial<WorkshopSettings>);
      toast.success(`${title} save ho gaya`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title={title} action={dirty ? <Badge tone="amber">Unsaved</Badge> : undefined} />
      <div className="space-y-3 p-4">
        <p className="text-xs text-wood-600">{hint}</p>
        <ListEditor items={items} onChange={setItems} placeholder={placeholder} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setItems(DEFAULT_SETTINGS[field])}>
            Default
          </Button>
          {dirty && (
            <Button variant="outline" size="sm" onClick={() => setItems(saved)}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ Stages ------------------------------ */

function StagesSection({ settings }: { settings: WorkshopSettings }) {
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
    if (parsed.length < 3) return 'Kam se kam 3 stage chahiye';
    const names = new Set<string>();
    for (let i = 0; i < parsed.length; i++) {
      const s = parsed[i];
      if (!s.name) return `Stage ${i + 1} ka naam khaali hai`;
      if (names.has(s.name.toLowerCase())) return `"${s.name}" do baar hai`;
      names.add(s.name.toLowerCase());
      if (!Number.isFinite(s.percent) || s.percent < 0 || s.percent > 100 || rows[i].percent.trim() === '')
        return `"${s.name}" ka % 0 se 100 ke beech ho`;
      if (i > 0 && s.percent <= parsed[i - 1].percent) return `"${s.name}" ka % pichhli stage se zyada hona chahiye`;
    }
    if (parsed[parsed.length - 1].percent !== 100) return 'Aakhri stage (Delivered) 100% honi chahiye';
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
        title: 'Stages badalne hain?',
        message: (
          <>
            <b>{activeOrders}</b> active orders apni stage <b>number</b> ke hisaab se nayi list se match honge (jaise stage 3 = nayi list ki
            3rd stage). Order ka stage naam agle update par badlega.
          </>
        ),
        confirmText: 'Haan, save karein',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await saveSettings({ stages: parsed.map((s) => ({ name: s.name, percent: Math.round(s.percent) })) });
      toast.success('Stages save ho gaye');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Kaam ki stages" action={dirty ? <Badge tone="amber">Unsaved</Badge> : undefined} />
      <div className="space-y-3 p-4">
        <p className="text-xs text-wood-600">
          Har stage ka % progress bar mein dikhta hai. <b>Aakhri stage = Delivered</b>, aur usse <b>pehle wali = Ready</b> maani jaati hai
          (dashboard aur delivery list isi se chalti hai). % hamesha badhta hua ho.
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
                  <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Stage naam" maxLength={30} />
                  {tag && (
                    <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 sm:block">
                      <Badge tone={tag === 'Delivered' ? 'green' : 'purple'}>{tag}</Badge>
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
                    aria-label="Upar"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    className="rounded-lg p-1.5 text-wood-600 hover:bg-wood-100 disabled:opacity-30"
                    aria-label="Neeche"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, k) => k !== i))}
                    disabled={rows.length <= 3}
                    className="rounded-lg p-1.5 text-wood-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                    aria-label="Hatayein"
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
            Stage jodein
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => setRows(toDraft(DEFAULT_SETTINGS.stages))}
            >
              Default
            </Button>
            {dirty && (
              <Button variant="outline" size="sm" onClick={() => setRows(toDraft(settings.stages))}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
              Save stages
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
  { col: 'customers', label: 'Grahak', line: (r) => `${r.name || ''} · ${r.phone || ''}` },
  { col: 'karigars', label: 'Karigar', line: (r) => `${r.name || ''}${r.skill ? ` · ${r.skill}` : ''}` },
  { col: 'stock', label: 'Stock items', line: (r) => `${r.name || ''} · ${r.qty ?? 0} ${r.unit || ''}` },
  {
    col: 'expenses',
    label: 'Kharcha',
    line: (r) => `${fmtDate(String(r.date || ''))} · ${r.category || ''} · ${money(Number(r.amount) || 0)}`,
  },
];

function TrashSection({ settings }: { settings: WorkshopSettings }) {
  const [data, setData] = useState<Record<TrashCol, Rec[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(TRASH_COLS.map(async (t) => [t.col, (await listDeleted(t.col)) as Rec[]] as const));
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
      toast.success('Wapas aa gaya');
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
            <Trash2 className="h-4 w-4" /> Recycle bin
          </span>
        }
        action={
          <Button variant="outline" size="sm" onClick={load} loading={loading} icon={<RotateCcw className="h-3.5 w-3.5" />}>
            {data ? 'Refresh' : 'Deleted items dekhein'}
          </Button>
        }
      />
      <div className="p-4">
        {!data ? (
          <p className="text-sm text-wood-600">
            Delete kiye gaye orders, grahak, karigar, stock aur kharcha yahan se wapas la sakte hain. Order wapas laane par uske payments bhi wapas
            aate hain.
          </p>
        ) : total === 0 ? (
          <p className="py-4 text-center text-sm text-wood-600">Recycle bin khaali hai</p>
        ) : (
          <div className="space-y-4">
            {TRASH_COLS.filter((t) => data[t.col].length).map((t) => (
              <div key={t.col}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-wood-500">
                  {t.label} ({data[t.col].length})
                </p>
                <ul className="divide-y divide-wood-50 rounded-xl border border-wood-100">
                  {data[t.col].map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0 truncate text-sm text-wood-900">{t.line(r)}</span>
                      <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => restore(t.col, r)}>
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {data.karigars.length > 0 && (
              <p className="text-xs text-wood-600">Karigar restore ke baad Karigar page se unhe dobara active karein.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------ Demo data ------------------------------ */

function DemoSection() {
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
      title: 'Demo data daalein?',
      message: 'Kuch sample grahak, karigar, orders (alag-alag stages), payments, stock aur kharcha jud jayenge. Baad mein "Demo data hatayein" se hata sakte hain.',
      confirmText: 'Haan, daalein',
    });
    if (!ok) return;
    setBusy('add');
    try {
      const r = await seedDemoData(db(), { by: user?.name });
      toast.success(`Demo data taiyaar: ${r.orders} orders, ${r.customers} grahak, ${r.payments} payments`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: 'Demo data hatayein?',
      message: 'Sirf demo wale records hamesha ke liye delete honge. Aapka asli data safe rahega.',
      confirmText: 'Hatayein',
      danger: true,
    });
    if (!ok) return;
    setBusy('remove');
    try {
      const n = await removeDemoData(db());
      toast.success(n ? `${n} demo records hata diye` : 'Koi demo data nahi mila');
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
              <Database className="h-4 w-4" /> Demo data
            </span>
          }
        />
        <div className="space-y-3 p-4">
          <p className="text-sm text-wood-700">
            App try karne ke liye sample data daalein - overdue, aaj ki delivery, ready orders, baaki payments, low stock sab dikhega.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={add} loading={busy === 'add'} disabled={!!busy} icon={<Sparkles className="h-4 w-4" />}>
              Demo data daalein
            </Button>
            <Button variant="outline" onClick={remove} loading={busy === 'remove'} disabled={!!busy} icon={<Trash2 className="h-4 w-4" />}>
              Demo data hatayein
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ Account ------------------------------ */

function AccountSection() {
  const { user, logout } = useAuth();
  return (
    <Card>
      <CardHeader title="Mera account" />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-wood-950">{user?.name}</p>
          <p className="truncate text-sm text-wood-600">{user?.email}</p>
          <Badge tone="wood" className="mt-1">
            {user?.role === 'owner' ? 'Owner / Admin' : 'Karigar'}
          </Badge>
        </div>
        <Button variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
          Logout
        </Button>
      </div>
      <div className="border-t border-wood-100 px-4 py-3 text-xs text-wood-600">
        Karigar ka login Karigar page se banayein - woh sirf apne assign kiye kaam dekh payenge (price/payment nahi).
      </div>
    </Card>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function SettingsPage() {
  const { isOwner } = useAuth();
  const { loading, settings } = useData();

  if (!isOwner) return <PageLoader />;
  if (loading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Workshop profile, lists, stages aur data" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <ProfileSection settings={settings} />
          <StagesSection settings={settings} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <AccountSection />
          <DemoSection />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ListSection
          settings={settings}
          field="itemTypes"
          title="Item types"
          hint="Order banate waqt yeh options dikhenge (Almaari, Bed, Table...)."
          placeholder="jaise Dressing Table"
        />
        <ListSection
          settings={settings}
          field="woodTypes"
          title="Lakdi / material"
          hint="Wood type dropdown ke options."
          placeholder="jaise Oak"
        />
        <ListSection
          settings={settings}
          field="expenseCategories"
          title="Kharcha categories"
          hint="Expenses mein category ke options."
          placeholder="jaise Petrol"
        />
        <ListSection
          settings={settings}
          field="skills"
          title="Karigar skills"
          hint="Karigar ki skill ke options."
          placeholder="jaise Welder"
        />
      </div>
      <TrashSection settings={settings} />
    </div>
  );
}
