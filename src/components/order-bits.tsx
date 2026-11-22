'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Check, Copy, ExternalLink, ImagePlus, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { tr, useT } from '@/lib/i18n';
import { addPayment, addProgressPhotos, removePhoto, saveCustomer, setStage } from '@/lib/actions';
import { uploadOrderPhotos } from '@/lib/upload';
import { customerSchema, paymentSchema, validate } from '@/lib/schemas';
import type { Customer, Order, PayMode, WorkshopSettings } from '@/lib/types';
import { appUrl, cn, errMsg, fmtDate, fmtDateTime, money, naapText, todayStr, waLink } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  DeliveryBadge,
  Field,
  ImagePickButton,
  Input,
  Modal,
  PhotoGrid,
  PriorityBadge,
  ProgressBar,
  Segmented,
  Select,
  Textarea,
  useConfirm,
} from './ui';

/* ------------------------------ helpers ------------------------------ */

export function statusUrl(token: string) {
  return `${appUrl()}/status/${token}`;
}

export function statusMessage(order: Order, settings: WorkshopSettings) {
  const item = order.title ? `${tr(order.itemType)} (${order.title})` : tr(order.itemType);
  const lines = [
    tr('Hello {name},', { name: order.customerName }),
    tr('Your {item} work status: *{stage}* ({progress}%)', { item, stage: tr(order.stage), progress: order.progress }),
    tr('Delivery: {date}', { date: fmtDate(order.deliveryDate) }),
    tr('See photos and status here: {url}', { url: statusUrl(order.statusToken) }),
    '',
    `- ${settings.name}${settings.phone ? ` (${settings.phone})` : ''}`,
  ];
  return lines.join('\n');
}

export function useKarigarNames() {
  const { karigarById } = useData();
  return (ids: string[] = []) =>
    ids
      .map((id) => karigarById[id]?.name)
      .filter(Boolean)
      .join(', ');
}

export function isDelivered(order: Order, settings: WorkshopSettings) {
  return order.stageIndex >= settings.stages.length - 1;
}

/* ------------------------------ OrderCard ------------------------------ */

export function OrderCard({
  order,
  href,
  showKarigar = true,
  showCustomer = true,
  extra,
  className,
}: {
  order: Order;
  href?: string;
  showKarigar?: boolean;
  showCustomer?: boolean;
  extra?: React.ReactNode;
  className?: string;
}) {
  const t = useT();
  const { settings } = useData();
  const names = useKarigarNames();
  const delivered = isDelivered(order, settings);
  const k = showKarigar ? names(order.karigarIds) : '';
  const body = (
    <Card className={cn('p-3.5 transition hover:border-wood-300', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-wood-600">{order.orderNo}</p>
          <p className="truncate font-semibold text-wood-950">
            {t(order.itemType)}
            {order.quantity > 1 ? ` x${order.quantity}` : ''}
            {order.title ? <span className="font-normal text-wood-700"> · {order.title}</span> : null}
          </p>
          {showCustomer && <p className="truncate text-sm text-wood-700">{order.customerName}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <DeliveryBadge date={order.deliveryDate} delivered={delivered} />
          <PriorityBadge priority={order.priority} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-wood-700">
        <span className="font-medium">{t(order.stage)}</span>
        <span>{fmtDate(order.deliveryDate, 'dd MMM')}</span>
      </div>
      <ProgressBar value={order.progress} className="mt-1" showLabel />
      {k && <p className="mt-2 truncate text-xs text-wood-600">{t('Workers: {names}', { names: k })}</p>}
      {extra}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ------------------------------ Job info (no prices) ------------------------------ */

export function JobSpecs({ order }: { order: Order }) {
  const t = useT();
  const rows: [string, React.ReactNode][] = [
    [t('Item'), `${t(order.itemType)}${order.quantity > 1 ? ` x ${order.quantity}` : ''}`],
    [t('Measurements (L x W x H)'), naapText(order.naap)],
    ...(order.naap?.extra || []).filter((e) => e.label || e.value).map((e) => [e.label || t('Extra'), e.value] as [string, string]),
    [t('Wood'), order.wood ? t(order.wood) : '-'],
    [t('Finish / Polish'), order.finish || '-'],
    [t('Hardware'), order.hardware || '-'],
    [t('Order date'), fmtDate(order.orderDate)],
    [t('Delivery date'), fmtDate(order.deliveryDate)],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
        {rows.map(([k, v], i) => (
          <div key={k + i} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-wood-500">{k}</dt>
            <dd className="break-words font-medium text-wood-950">{v}</dd>
          </div>
        ))}
      </dl>
      {order.naap?.notes && (
        <div className="rounded-xl bg-wood-50 p-3 text-sm text-wood-800">
          <span className="font-semibold">{t('Measurement notes:')} </span>
          {order.naap.notes}
        </div>
      )}
      {order.notes && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">{t('Notes:')} </span>
          {order.notes}
        </div>
      )}
      {order.refLink && (
        <a href={order.refLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-wood-700 underline">
          <ExternalLink className="h-4 w-4" /> {t('Reference design link')}
        </a>
      )}
    </div>
  );
}

/* ------------------------------ StageStepper ------------------------------ */

export function StageStepper({ order, editable }: { order: Order; editable: boolean }) {
  const t = useT();
  const { settings } = useData();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<number | null>(null);
  const stages = settings.stages;

  const lastAt = (idx: number) => {
    const ev = [...(order.stageHistory || [])].reverse().find((h) => h.index === idx);
    return ev?.at;
  };

  const set = async (idx: number) => {
    if (idx === order.stageIndex) return;
    if (idx < order.stageIndex) {
      const ok = await confirm({ title: t('Move stage back?'), message: t('Move back to stage "{stage}"?', { stage: t(stages[idx].name) }) });
      if (!ok) return;
    }
    if (idx === stages.length - 1) {
      const ok = await confirm({ title: t('Mark as delivered?'), message: t('Has this order been delivered?'), confirmText: t('Yes, delivered') });
      if (!ok) return;
    }
    setBusy(idx);
    try {
      await setStage(order, idx, settings, user?.name);
      toast.success(t('Stage: {stage}', { stage: t(stages[idx].name) }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <ProgressBar value={order.progress} showLabel className="mb-4" />
      <ol className="space-y-1.5">
        {stages.map((s, i) => {
          const done = i < order.stageIndex;
          const current = i === order.stageIndex;
          const at = lastAt(i);
          return (
            <li key={s.name + i}>
              <button
                type="button"
                disabled={!editable || busy !== null}
                onClick={() => set(i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                  current ? 'border-wood-600 bg-wood-700 text-white' : done ? 'border-emerald-200 bg-emerald-50' : 'border-wood-100 bg-white',
                  editable && !current && 'hover:border-wood-300',
                  !editable && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    current ? 'bg-white text-wood-800' : done ? 'bg-emerald-500 text-white' : 'bg-wood-100 text-wood-600',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t(s.name)}</span>
                  {at && (i <= order.stageIndex) && (
                    <span className={cn('block text-xs', current ? 'text-wood-100' : 'text-wood-600')}>{fmtDateTime(at)}</span>
                  )}
                </span>
                <span className={cn('text-xs font-semibold', current ? 'text-white' : 'text-wood-500')}>
                  {busy === i ? '...' : `${s.percent}%`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {editable && <p className="mt-2 text-xs text-wood-600">{t('Tap a stage to change it.')}</p>}
    </div>
  );
}

/* ------------------------------ Progress photos + share ------------------------------ */

export function ShareButtons({ order }: { order: Order }) {
  const t = useT();
  const { settings } = useData();
  const url = statusUrl(order.statusToken);
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={waLink(order.customerPhone, statusMessage(order, settings))}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white hover:brightness-95"
      >
        <MessageCircle className="h-4 w-4" /> {t('Send to customer')}
      </a>
      <Button
        variant="outline"
        icon={<Copy className="h-4 w-4" />}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast.success(t('Status link copied'));
          } catch {
            toast.error(t('Could not copy'));
          }
        }}
      >
        {t('Copy link')}
      </Button>
      <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-wood-700 hover:bg-wood-100">
        <ExternalLink className="h-4 w-4" /> {t('Status page')}
      </a>
    </div>
  );
}

export function ProgressPhotos({ order, canDelete }: { order: Order; canDelete: boolean }) {
  const t = useT();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState<string | null>(null);

  const onPick = async (files: File[]) => {
    setUploading(`0/${files.length}`);
    try {
      const photos = await uploadOrderPhotos(order.id, 'progress', files, user?.name, (d, t) => setUploading(`${d}/${t}`));
      await addProgressPhotos(order, photos);
      toast.success(t('{n} photo(s) uploaded', { n: photos.length }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(null);
    }
  };

  const photos = [...(order.progressPhotos || [])].sort((a, b) => b.at - a.at);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ImagePickButton onPick={onPick} capture multiple={false} variant="primary" icon={<Camera className="h-4 w-4" />} loading={!!uploading}>
          {uploading ? t('Uploading {progress}', { progress: uploading }) : t('Take photo')}
        </ImagePickButton>
        <ImagePickButton onPick={onPick} icon={<ImagePlus className="h-4 w-4" />} loading={!!uploading}>
          {t('From gallery')}
        </ImagePickButton>
      </div>
      {photos.length ? (
        <PhotoGrid
          photos={photos}
          onRemove={
            canDelete
              ? async (i) => {
                  const ok = await confirm({ title: t('Delete photo?'), danger: true, confirmText: t('Delete') });
                  if (!ok) return;
                  try {
                    await removePhoto(order, 'progress', photos[i]);
                    toast.success(t('Photo deleted'));
                  } catch (e) {
                    toast.error(errMsg(e));
                  }
                }
              : undefined
          }
        />
      ) : (
        <p className="rounded-xl border border-dashed border-wood-200 p-4 text-center text-sm text-wood-600">
          {t('No progress photos yet')}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ Customer modal ------------------------------ */

export function CustomerModal({
  open,
  onClose,
  customer,
  onSaved,
  initialName,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved?: (id: string) => void;
  initialName?: string;
}) {
  const t = useT();
  const { customers } = useData();
  const [f, setF] = useState({ name: '', phone: '', address: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({
        name: customer?.name || initialName || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        notes: customer?.notes || '',
      });
      setErrors({});
    }
  }, [open, customer, initialName]);

  const save = async () => {
    const v = validate(customerSchema, f);
    if (!v.ok) return setErrors(v.errors);
    const digits = v.data.phone.replace(/\D/g, '').slice(-10);
    const dup = customers.find((c) => c.id !== customer?.id && c.phone.replace(/\D/g, '').slice(-10) === digits);
    if (dup) return setErrors({ phone: t('This number is already saved for "{name}"', { name: dup.name }) });
    setSaving(true);
    try {
      const id = await saveCustomer(v.data, customer?.id);
      toast.success(customer ? t('Customer updated') : t('New customer added'));
      onSaved?.(id);
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
      title={customer ? t('Edit customer') : t('New customer')}
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
        <Field label={t('Name')} required error={errors.name}>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} autoFocus />
        </Field>
        <Field label={t('Phone')} required error={errors.phone}>
          <Input
            value={f.phone}
            inputMode="tel"
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            invalid={!!errors.phone}
            placeholder="98XXXXXXXX"
          />
        </Field>
        <Field label={t('Address')} error={errors.address}>
          <Textarea value={f.address} rows={2} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label={t('Notes')} error={errors.notes}>
          <Textarea value={f.notes} rows={2} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------ Payment modal ------------------------------ */

export function PaymentModal({
  open,
  onClose,
  orderId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  onSaved?: (paymentId: string) => void;
}) {
  const t = useT();
  const { orders, finance, settings, orderById } = useData();
  const [f, setF] = useState({ orderId: '', amount: '', mode: 'cash' as PayMode, date: todayStr(), note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ orderId: orderId || '', amount: '', mode: 'cash', date: todayStr(), note: '' });
      setErrors({});
    }
  }, [open, orderId]);

  const dueOrders = useMemo(
    () => orders.filter((o) => (finance[o.id]?.balance || 0) > 0 || o.id === orderId),
    [orders, finance, orderId],
  );
  const fin = f.orderId ? finance[f.orderId] : undefined;

  const save = async () => {
    const v = validate(paymentSchema, f);
    if (!v.ok) return setErrors(v.errors);
    const order = orderById[v.data.orderId];
    if (!order) return setErrors({ orderId: 'Order not found' });
    if (fin && v.data.amount > fin.balance + 0.5) {
      return setErrors({ amount: t('Only {amount} is due', { amount: money(fin.balance) }) });
    }
    setSaving(true);
    try {
      const id = await addPayment(order, { amount: v.data.amount, mode: v.data.mode, date: v.data.date, note: v.data.note }, settings);
      toast.success(t('Payment of {amount} saved', { amount: money(v.data.amount) }));
      onSaved?.(id);
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
      title={t('Receive payment')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {t('Save payment')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t('Order')} required error={errors.orderId}>
          <Select
            value={f.orderId}
            onChange={(e) => setF({ ...f, orderId: e.target.value })}
            disabled={!!orderId}
            invalid={!!errors.orderId}
            placeholder={t('Select an order')}
            options={dueOrders.map((o) => ({
              value: o.id,
              label: `${o.orderNo} · ${o.customerName} · ${t(o.itemType)} (${t('Due {amount}', { amount: money(finance[o.id]?.balance) })})`,
            }))}
          />
        </Field>
        {fin && (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-wood-50 p-3 text-center text-sm">
            <div>
              <p className="text-[11px] uppercase text-wood-500">{t('Total')}</p>
              <p className="font-semibold">{money(fin.price - (fin.discount || 0))}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-wood-500">{t('Paid')}</p>
              <p className="font-semibold text-emerald-700">{money(fin.paid)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-wood-500">{t('Balance')}</p>
              <p className="font-semibold text-red-600">{money(fin.balance)}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Amount (₹)')} required error={errors.amount}>
            <Input
              type="number"
              inputMode="decimal"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
              invalid={!!errors.amount}
              autoFocus
            />
          </Field>
          <Field label={t('Date')} required error={errors.date}>
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
        </div>
        {fin && fin.balance > 0 && (
          <button type="button" className="text-xs font-medium text-wood-700 underline" onClick={() => setF({ ...f, amount: String(fin.balance) })}>
            {t('Fill full balance {amount}', { amount: money(fin.balance) })}
          </button>
        )}
        <Field label={t('Mode')}>
          <Segmented
            value={f.mode}
            onChange={(v) => setF({ ...f, mode: v })}
            options={[
              { value: 'cash', label: t('Cash') },
              { value: 'upi', label: t('UPI') },
              { value: 'bank', label: t('Bank') },
            ]}
          />
        </Field>
        <Field label={t('Note')}>
          <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={t('UPI ref / cheque no.')} />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------ small bits ------------------------------ */

export function StageBadge({ order }: { order: Order }) {
  const t = useT();
  const { settings } = useData();
  const last = settings.stages.length - 1;
  if (order.stageIndex >= last) return <Badge tone="green">{t(order.stage)}</Badge>;
  if (order.stageIndex === last - 1) return <Badge tone="purple">{t(order.stage)}</Badge>;
  return <Badge tone="wood">{t(order.stage)}</Badge>;
}
