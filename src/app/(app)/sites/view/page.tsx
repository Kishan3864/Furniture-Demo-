'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  CalendarDays,
  ClipboardList,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Ruler,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import {
  addSiteMedia,
  newEntryId,
  removeSiteMedia,
  saveSiteEntries,
  softDeleteSite,
  updateSite,
} from '@/lib/actions-sites';
import { validate } from '@/lib/schemas';
import type { LengthUnit, Media, Site, SiteEntry } from '@/lib/types';
import { convertLen, errMsg, fmtDate, naapText, waLink } from '@/lib/utils';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  PageLoader,
  Segmented,
  Textarea,
  useConfirm,
} from '@/components/ui';
import { OrderCard } from '@/components/order-bits';
import { MediaGrid, MediaUploader } from '@/components/media';

const optNum = z
  .union([z.literal(''), z.null(), z.coerce.number().min(0, 'Cannot be negative')])
  .transform((v) => (v === '' || v === null || Number.isNaN(v) ? null : Number(v)));

const entrySchema = z.object({
  label: z.string().trim().min(1, 'Name is required'),
  unit: z.enum(['ft', 'inch']),
  l: optNum,
  w: optNum,
  h: optNum,
  notes: z.string().trim().optional().or(z.literal('')),
});

const editSchema = z.object({
  title: z.string().trim().min(2, 'Name must be at least 2 characters'),
  address: z.string().trim().optional().or(z.literal('')),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date'),
});

function sizeText(e: Pick<SiteEntry, 'unit' | 'l' | 'w' | 'h'>) {
  return naapText({ unit: e.unit, l: e.l, w: e.w, h: e.h, extra: [] });
}

function SiteView() {
  const t = useT();
  const sp = useSearchParams();
  const id = sp.get('id') || '';
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { loading, sites, orderById } = useData();
  const site = sites.find((s) => s.id === id);

  const [entryModal, setEntryModal] = useState<{ open: boolean; entry?: SiteEntry }>({ open: false });
  const [editOpen, setEditOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(site?.notes || '');
  }, [site?.id, site?.notes]);

  if (loading) return <PageLoader />;
  if (!site)
    return (
      <Card>
        <EmptyState
          title={t('Site visit not found')}
          action={
            <LinkButton href="/sites" variant="outline">
              {t('Back to site visits')}
            </LinkButton>
          }
        />
      </Card>
    );

  const entries = site.entries || [];
  const media = site.media || [];
  const photos = media.filter((m) => m.kind !== 'video').length;
  const videos = media.filter((m) => m.kind === 'video').length;
  const orders = (site.orderIds || []).map((oid) => orderById[oid]).filter(Boolean);

  const onDelete = async () => {
    const ok = await confirm({
      title: t('Delete site visit?'),
      message: t('The site visit moves to the recycle bin. Orders made from it are not affected.'),
      danger: true,
      confirmText: t('Delete'),
    });
    if (!ok) return;
    try {
      await softDeleteSite(site.id);
      toast.success(t('Site visit deleted'));
      router.push('/sites');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const removeEntry = async (e: SiteEntry) => {
    const ok = await confirm({ title: t('Delete this size?'), message: e.label, danger: true, confirmText: t('Delete') });
    if (!ok) return;
    try {
      await saveSiteEntries(site.id, entries.filter((x) => x.id !== e.id));
      toast.success(t('Size deleted'));
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const removeMedia = async (m: Media) => {
    const ok = await confirm({
      title: m.kind === 'video' ? t('Delete this video?') : t('Delete this photo?'),
      danger: true,
      confirmText: t('Delete'),
    });
    if (!ok) return;
    try {
      await removeSiteMedia(site, m);
      toast.success(t('Deleted'));
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateSite(site.id, { notes: notes.trim() });
      toast.success(t('Notes saved'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div>
      <PageHeader
        back="/sites"
        title={site.title}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-wood-800">{site.customerName}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(site.visitDate)}
            </span>
          </span>
        }
        actions={
          <>
            <LinkButton href={`/orders/new?site=${site.id}`} icon={<ClipboardList className="h-4 w-4" />}>
              {t('Create order')}
            </LinkButton>
            <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              {t('Edit')}
            </Button>
            <Button variant="ghost" size="icon" aria-label={t('Delete')} onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </>
        }
      />

      {/* Contact + address strip */}
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        {site.customerPhone && (
          <>
            <a
              href={`tel:${site.customerPhone}`}
              className="inline-flex h-9 items-center gap-1.5 rounded border border-wood-200 px-3 text-sm font-medium text-wood-900 hover:bg-wood-50"
            >
              <Phone className="h-4 w-4" /> {site.customerPhone}
            </a>
            <a
              href={waLink(site.customerPhone, '')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded border border-wood-200 px-3 text-sm font-medium text-[#128C7E] hover:bg-wood-50"
            >
              <MessageCircle className="h-4 w-4" /> {t('WhatsApp')}
            </a>
          </>
        )}
        {site.address ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded border border-wood-200 px-3 py-1.5 text-sm text-wood-900 hover:bg-wood-50"
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{site.address}</span>
            <span className="shrink-0 text-xs font-semibold text-wood-600">· {t('Open in Maps')}</span>
          </a>
        ) : (
          <span className="text-sm text-wood-500">{t('No address added')}</span>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sizes */}
        <Card tour="site-sizes">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Ruler className="h-4 w-4" /> {t('Sizes')} <span className="text-sm font-normal text-wood-500">({entries.length})</span>
              </span>
            }
            action={
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEntryModal({ open: true })}>
                {t('Add size')}
              </Button>
            }
          />
          <div className="p-3">
            {!entries.length ? (
              <EmptyState
                className="py-8"
                icon={<Ruler className="h-6 w-6" />}
                title={t('No sizes yet')}
                description={t('Add each room or item with Length × Width × Height.')}
                action={
                  <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEntryModal({ open: true })}>
                    {t('Add size')}
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-wood-100">
                {entries.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-start gap-2 py-3 first:pt-1 last:pb-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-wood-950">{e.label}</p>
                      <p className="mt-0.5 font-mono text-[15px] text-wood-800">
                        {sizeText(e)} <span className="text-xs text-wood-500">({e.unit === 'inch' ? t('inch') : t('feet')})</span>
                      </p>
                      {e.notes && <p className="mt-0.5 text-sm text-wood-600">{e.notes}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <LinkButton href={`/orders/new?site=${site.id}&entry=${e.id}`} size="sm" variant="secondary" icon={<ClipboardList className="h-3.5 w-3.5" />}>
                        {t('Create order')}
                      </LinkButton>
                      <Button size="icon" variant="ghost" aria-label={t('Edit')} onClick={() => setEntryModal({ open: true, entry: e })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={t('Delete')} onClick={() => removeEntry(e)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Photos & videos */}
        <Card tour="site-media">
          <CardHeader
            title={t('Site photos & videos')}
            action={
              <span className="text-xs text-wood-600">
                {t('{n} photos', { n: photos })} · {t('{n} videos', { n: videos })}
              </span>
            }
          />
          <div className="space-y-3 p-3">
            <MediaUploader folder={`sites/${site.id}`} source="site" by={user?.name} onUploaded={(items) => addSiteMedia(site.id, items)} />
            <MediaGrid
              items={[...media].sort((a, b) => b.at - a.at)}
              onRemove={removeMedia}
              empty={
                <p className="rounded border border-dashed border-wood-200 p-4 text-center text-sm text-wood-600">
                  {t('No photos or videos yet')}
                </p>
              }
            />
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader title={t('Notes')} />
          <div className="space-y-2 p-3">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Wall condition, electric points, customer wishes...')} />
            <div className="flex justify-end">
              <Button size="sm" onClick={saveNotes} loading={savingNotes} disabled={notes.trim() === (site.notes || '').trim()}>
                {t('Save notes')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Orders */}
        <Card>
          <CardHeader title={t('Orders from this visit')} />
          <div className="space-y-2 p-3">
            {orders.length ? (
              orders.map((o) => <OrderCard key={o!.id} order={o!} href={`/orders/${o!.id}`} showCustomer={false} />)
            ) : (
              <p className="text-sm text-wood-600">{t('No orders yet. Use "Create order" on any size to start one.')}</p>
            )}
          </div>
        </Card>
      </div>

      <EntryModal
        open={entryModal.open}
        entry={entryModal.entry}
        onClose={() => setEntryModal({ open: false })}
        onSave={async (entry) => {
          const exists = entries.some((x) => x.id === entry.id);
          const next = exists ? entries.map((x) => (x.id === entry.id ? entry : x)) : [...entries, entry];
          await saveSiteEntries(site.id, next);
          toast.success(exists ? t('Size updated') : t('Size added'));
        }}
      />
      <EditSiteModal open={editOpen} site={site} onClose={() => setEditOpen(false)} />
    </div>
  );
}

const numStr = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '' : String(v));

function EntryModal({
  open,
  entry,
  onClose,
  onSave,
}: {
  open: boolean;
  entry?: SiteEntry;
  onClose: () => void;
  onSave: (e: SiteEntry) => Promise<void>;
}) {
  const t = useT();
  const [f, setF] = useState({ label: '', unit: 'ft' as LengthUnit, l: '', w: '', h: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [addAnother, setAddAnother] = useState(false);

  useEffect(() => {
    if (open) {
      setF({
        label: entry?.label || '',
        unit: entry?.unit || 'ft',
        l: numStr(entry?.l),
        w: numStr(entry?.w),
        h: numStr(entry?.h),
        notes: entry?.notes || '',
      });
      setErrors({});
    }
  }, [open, entry]);

  const changeUnit = (unit: LengthUnit) => {
    if (unit === f.unit) return;
    const conv = (s: string) => {
      if (!s.trim()) return s;
      const n = Number(s);
      return Number.isNaN(n) ? s : numStr(convertLen(n, f.unit, unit));
    };
    setF((p) => ({ ...p, unit, l: conv(p.l), w: conv(p.w), h: conv(p.h) }));
  };

  const save = async (again: boolean) => {
    const v = validate(entrySchema, f);
    if (!v.ok) return setErrors(v.errors);
    setSaving(true);
    setAddAnother(again);
    try {
      await onSave({
        id: entry?.id || newEntryId(),
        label: v.data.label,
        unit: v.data.unit,
        l: v.data.l,
        w: v.data.w,
        h: v.data.h,
        notes: v.data.notes || '',
      });
      if (again) {
        setF((p) => ({ label: '', unit: p.unit, l: '', w: '', h: '', notes: '' }));
        setErrors({});
      } else onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const u = f.unit === 'ft' ? t('ft') : t('inch');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? t('Edit size') : t('Add size')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          {!entry && (
            <Button variant="secondary" onClick={() => save(true)} loading={saving && addAnother}>
              {t('Save & add another')}
            </Button>
          )}
          <Button onClick={() => save(false)} loading={saving && !addAnother}>
            {t('Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('Room / item')} required error={errors.label} hint={t('e.g. Master bedroom wardrobe, Kitchen wall A')}>
          <Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} invalid={!!errors.label} autoFocus />
        </Field>
        <Field label={t('Unit')}>
          <Segmented
            value={f.unit}
            onChange={changeUnit}
            options={[
              { value: 'ft', label: t('Feet') },
              { value: 'inch', label: t('Inch') },
            ]}
          />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label={`${t('Length')} (${u})`} error={errors.l}>
            <Input type="number" inputMode="decimal" step="any" value={f.l} onChange={(e) => setF({ ...f, l: e.target.value })} invalid={!!errors.l} />
          </Field>
          <Field label={`${t('Width')} (${u})`} error={errors.w}>
            <Input type="number" inputMode="decimal" step="any" value={f.w} onChange={(e) => setF({ ...f, w: e.target.value })} invalid={!!errors.w} />
          </Field>
          <Field label={`${t('Height')} (${u})`} error={errors.h}>
            <Input type="number" inputMode="decimal" step="any" value={f.h} onChange={(e) => setF({ ...f, h: e.target.value })} invalid={!!errors.h} />
          </Field>
        </div>
        <Field label={t('Notes')}>
          <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={t('Skirting, switch board, window position...')} />
        </Field>
      </div>
    </Modal>
  );
}

function EditSiteModal({ open, site, onClose }: { open: boolean; site: Site; onClose: () => void }) {
  const t = useT();
  const [f, setF] = useState({ title: '', address: '', visitDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ title: site.title, address: site.address || '', visitDate: site.visitDate });
      setErrors({});
    }
  }, [open, site]);

  const save = async () => {
    const v = validate(editSchema, f);
    if (!v.ok) return setErrors(v.errors);
    setSaving(true);
    try {
      await updateSite(site.id, { title: v.data.title, address: v.data.address || '', visitDate: v.data.visitDate });
      toast.success(t('Site visit updated'));
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Edit site visit')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button onClick={save} loading={saving}>
            {t('Save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('Site name')} required error={errors.title}>
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} invalid={!!errors.title} />
        </Field>
        <Field label={t('Site address')} error={errors.address}>
          <Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label={t('Visit date')} required error={errors.visitDate}>
          <Input type="date" value={f.visitDate} onChange={(e) => setF({ ...f, visitDate: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

export default function SiteViewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SiteView />
    </Suspense>
  );
}
