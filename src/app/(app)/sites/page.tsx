'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { CalendarDays, Camera, MapPin, Plus, Ruler, UserPlus, Video } from 'lucide-react';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { createSite } from '@/lib/actions-sites';
import { validate } from '@/lib/schemas';
import type { Site } from '@/lib/types';
import { errMsg, fmtDate, todayStr } from '@/lib/utils';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, PageLoader, SearchInput, Select, Textarea } from '@/components/ui';
import { CustomerModal } from '@/components/order-bits';

const siteSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  title: z.string().trim().min(2, 'Name must be at least 2 characters'),
  address: z.string().trim().optional().or(z.literal('')),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date'),
  notes: z.string().trim().optional().or(z.literal('')),
});

function counts(s: Site) {
  const media = s.media || [];
  return {
    sizes: (s.entries || []).length,
    photos: media.filter((m) => m.kind !== 'video').length,
    videos: media.filter((m) => m.kind === 'video').length,
  };
}

export default function SitesPage() {
  const t = useT();
  const router = useRouter();
  const { loading, sites, orderById } = useData();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sites;
    const digits = s.replace(/\D/g, '');
    return sites.filter(
      (x) =>
        x.title.toLowerCase().includes(s) ||
        x.customerName.toLowerCase().includes(s) ||
        (x.address || '').toLowerCase().includes(s) ||
        (digits.length >= 3 && (x.customerPhone || '').replace(/\D/g, '').includes(digits)),
    );
  }, [sites, q]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={t('Site Visits')}
        subtitle={t("Sizes, photos and videos from the customer's site")}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            {t('New site visit')}
          </Button>
        }
      />

      {sites.length > 0 && (
        <SearchInput value={q} onChange={setQ} placeholder={t('Search customer, phone, site or address...')} className="mb-4" />
      )}

      {!sites.length ? (
        <Card>
          <EmptyState
            icon={<Ruler className="h-6 w-6" />}
            title={t('No site visits yet')}
            description={t('Visit the customer, save all sizes room by room, take site photos and record videos. Later turn any size into an order.')}
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
                {t('New site visit')}
              </Button>
            }
          />
        </Card>
      ) : !list.length ? (
        <Card>
          <EmptyState title={t('Nothing found')} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const c = counts(s);
            const orders = (s.orderIds || []).map((id) => orderById[id]).filter(Boolean);
            return (
              <Card key={s.id} onClick={() => router.push(`/sites/view?id=${s.id}`)} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-wood-950">{s.title}</p>
                    <p className="truncate text-sm text-wood-700">{s.customerName}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-wood-600">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {fmtDate(s.visitDate, 'dd MMM')}
                  </span>
                </div>
                {s.address && (
                  <p className="mt-1.5 flex items-start gap-1 text-xs text-wood-600">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-2">{s.address}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-wood-50 pt-3 text-xs text-wood-800">
                  <span className="inline-flex items-center gap-1 rounded bg-wood-50 px-2 py-1">
                    <Ruler className="h-3.5 w-3.5" /> {t('{n} sizes', { n: c.sizes })}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-wood-50 px-2 py-1">
                    <Camera className="h-3.5 w-3.5" /> {t('{n} photos', { n: c.photos })}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-wood-50 px-2 py-1">
                    <Video className="h-3.5 w-3.5" /> {t('{n} videos', { n: c.videos })}
                  </span>
                </div>
                {orders.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {orders.map((o) => (
                      <Badge key={o!.id} tone="green">
                        {o!.orderNo}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <NewSiteModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(id) => {
          setOpen(false);
          router.push(`/sites/view?id=${id}`);
        }}
      />
    </div>
  );
}

function NewSiteModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const t = useT();
  const { customers, customerById } = useData();
  const [f, setF] = useState({ customerId: '', title: '', address: '', visitDate: todayStr(), notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [custOpen, setCustOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ customerId: '', title: '', address: '', visitDate: todayStr(), notes: '' });
      setErrors({});
    }
  }, [open]);

  const pickCustomer = (id: string) => {
    const c = customerById[id];
    setF((p) => ({ ...p, customerId: id, address: p.address || c?.address || '' }));
  };

  const save = async () => {
    const v = validate(siteSchema, f);
    if (!v.ok) return setErrors(v.errors);
    const customer = customerById[v.data.customerId];
    if (!customer) return setErrors({ customerId: 'Select a customer' });
    setSaving(true);
    try {
      const id = await createSite({
        customer,
        title: v.data.title,
        address: v.data.address || '',
        visitDate: v.data.visitDate,
        notes: v.data.notes || '',
      });
      toast.success(t('Site visit created'));
      onCreated(id);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t('New site visit')}
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button onClick={save} loading={saving}>
              {t('Create')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('Customer')} required error={errors.customerId}>
            <div className="flex gap-2">
              <Select
                className="flex-1"
                value={f.customerId}
                onChange={(e) => pickCustomer(e.target.value)}
                invalid={!!errors.customerId}
                placeholder={t('Select a customer')}
                options={customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.phone}` }))}
              />
              <Button variant="outline" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCustOpen(true)}>
                {t('New')}
              </Button>
            </div>
          </Field>
          <Field label={t('Site name')} required error={errors.title} hint={t('e.g. Kitchen + 2 bedrooms, Sharma house')}>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} invalid={!!errors.title} />
          </Field>
          <Field label={t('Site address')} error={errors.address}>
            <Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </Field>
          <Field label={t('Visit date')} required error={errors.visitDate}>
            <Input type="date" value={f.visitDate} onChange={(e) => setF({ ...f, visitDate: e.target.value })} />
          </Field>
          <Field label={t('Notes')}>
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
        </div>
      </Modal>
      <CustomerModal open={custOpen} onClose={() => setCustOpen(false)} onSaved={(id) => pickCustomer(id)} />
    </>
  );
}
