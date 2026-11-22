'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { HandCoins, Package, Pencil, Plus, Printer, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import {
  deletePayment,
  deleteStockMove,
  moveStock,
  payLabour,
  regenerateStatusToken,
  saveLabour,
  softDelete,
} from '@/lib/actions';
import { setShowPriceOnStatus } from '@/lib/actions-orders';
import { labourSchema, stockMoveSchema, validate } from '@/lib/schemas';
import type { Labour, Order } from '@/lib/types';
import { cn, errMsg, fmtDate, money, PAY_MODE_LABEL, todayStr } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Toggle,
  useConfirm,
} from './ui';
import { PaymentModal, ShareButtons, useKarigarNames } from './order-bits';

/* ------------------------------ Payments ------------------------------ */

export function PaymentsSection({ order }: { order: Order }) {
  const t = useT();
  const { finance, payments } = useData();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const fin = finance[order.id];
  const list = useMemo(() => payments.filter((p) => p.orderId === order.id), [payments, order.id]);
  const total = fin ? fin.price - (fin.discount || 0) : 0;

  return (
    <Card tour="od-payments">
      <CardHeader
        title={t('Payments')}
        action={
          <Button size="sm" icon={<Wallet className="h-4 w-4" />} onClick={() => setOpen(true)} disabled={!fin || fin.balance <= 0}>
            {t('Receive payment')}
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {fin ? (
          <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-wood-50 p-2.5">
              <p className="text-[11px] uppercase text-wood-500">{t('Price')}</p>
              <p className="font-semibold">{money(fin.price)}</p>
              {fin.discount > 0 && <p className="text-[11px] text-wood-600">{t('- {amount} discount', { amount: money(fin.discount) })}</p>}
            </div>
            <div className="rounded-xl bg-wood-50 p-2.5">
              <p className="text-[11px] uppercase text-wood-500">{t('Total')}</p>
              <p className="font-semibold">{money(total)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <p className="text-[11px] uppercase text-emerald-700">{t('Paid')}</p>
              <p className="font-semibold text-emerald-700">{money(fin.paid)}</p>
            </div>
            <div className={cn('rounded-xl p-2.5', fin.balance > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
              <p className={cn('text-[11px] uppercase', fin.balance > 0 ? 'text-red-600' : 'text-emerald-700')}>{t('Balance')}</p>
              <p className={cn('font-semibold', fin.balance > 0 ? 'text-red-600' : 'text-emerald-700')}>{money(fin.balance)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-wood-600">{t('No payment record found for this order.')}</p>
        )}

        {list.length ? (
          <ul className="divide-y divide-wood-50 rounded-xl border border-wood-100">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-wood-950">
                    {money(p.amount)}{' '}
                    <Badge tone={p.type === 'advance' ? 'blue' : 'wood'} className="ml-1">
                      {p.type === 'advance' ? t('Advance') : t('Instalment')}
                    </Badge>
                  </p>
                  <p className="truncate text-xs text-wood-600">
                    {fmtDate(p.date)} · {t(PAY_MODE_LABEL[p.mode] || p.mode)} · {p.receiptNo}
                    {p.note ? ` · ${p.note}` : ''}
                  </p>
                </div>
                <Link
                  href={`/print/receipt/${p.id}`}
                  className="rounded-lg p-2 text-wood-700 hover:bg-wood-100"
                  aria-label={t('Receipt')}
                  title={t('Print receipt')}
                >
                  <Printer className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label={t('Delete payment')}
                  onClick={async () => {
                    const ok = await confirm({
                      title: t('Delete payment?'),
                      message: t('Remove {amount} ({date})? The balance will go up again.', { amount: money(p.amount), date: fmtDate(p.date) }),
                      danger: true,
                      confirmText: t('Delete'),
                    });
                    if (!ok) return;
                    try {
                      await deletePayment(p, order);
                      toast.success(t('Payment deleted'));
                    } catch (e) {
                      toast.error(errMsg(e));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-wood-200 p-3 text-center text-sm text-wood-600">{t('No payments yet')}</p>
        )}
      </div>
      <PaymentModal open={open} onClose={() => setOpen(false)} orderId={order.id} />
    </Card>
  );
}

/* ------------------------------ Labour ------------------------------ */

function LabourModal({
  open,
  onClose,
  order,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
  entry?: Labour | null;
}) {
  const t = useT();
  const { karigars, karigarById } = useData();
  const [f, setF] = useState({ karigarId: '', amount: '', paid: '', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      karigarId: entry?.karigarId || (order.karigarIds?.length === 1 ? order.karigarIds[0] : ''),
      amount: entry ? String(entry.amount) : '',
      paid: entry ? String(entry.paid || '') : '',
      note: entry?.note || '',
    });
    setErrors({});
  }, [open, entry, order.karigarIds]);

  const options = useMemo(() => {
    const assigned = karigars.filter((k) => order.karigarIds?.includes(k.id));
    const others = karigars.filter((k) => !order.karigarIds?.includes(k.id) && (k.active || k.id === entry?.karigarId));
    return [...assigned, ...others];
  }, [karigars, order.karigarIds, entry]);

  const save = async () => {
    const v = validate(labourSchema, { ...f, orderId: order.id, paid: f.paid || 0 });
    const errs = { ...v.errors };
    if (v.ok && v.data.paid > v.data.amount) errs.paid = 'Paid amount cannot be more than the labour amount';
    if (!v.ok || Object.keys(errs).length) return setErrors(errs);
    const karigar = karigarById[v.data.karigarId];
    if (!karigar) return setErrors({ karigarId: 'Worker not found' });
    setSaving(true);
    try {
      await saveLabour(v.data, { karigar, order }, entry?.id);
      toast.success(t('Labour saved'));
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
      title={entry ? t('Edit labour') : t('Add labour')}
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
        <Field label={t('Worker')} required error={errors.karigarId}>
          <Select
            value={f.karigarId}
            onChange={(e) => setF({ ...f, karigarId: e.target.value })}
            placeholder={t('Select a worker')}
            invalid={!!errors.karigarId}
            options={options.map((k) => ({
              value: k.id,
              label: order.karigarIds?.includes(k.id) ? t('{name} (assigned)', { name: k.name }) : k.name,
            }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Labour amount (₹)')} required error={errors.amount}>
            <Input type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} invalid={!!errors.amount} />
          </Field>
          <Field label={t('Paid (₹)')} error={errors.paid}>
            <Input type="number" inputMode="decimal" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} invalid={!!errors.paid} />
          </Field>
        </div>
        <Field label={t('Note')}>
          <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={t('e.g. polish work')} />
        </Field>
      </div>
    </Modal>
  );
}

function PayLabourModal({ entry, onClose }: { entry: Labour | null; onClose: () => void }) {
  const t = useT();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const due = entry ? entry.amount - (entry.paid || 0) : 0;

  useEffect(() => {
    if (entry) {
      setAmount(String(Math.max(0, entry.amount - (entry.paid || 0))));
      setError('');
    }
  }, [entry]);

  const save = async () => {
    if (!entry) return;
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || n <= 0) return setError('Enter an amount');
    if (n > due + 0.5) return setError(t('Only {amount} is due', { amount: money(due) }));
    setSaving(true);
    try {
      await payLabour(entry, n);
      toast.success(t('{amount} paid to worker', { amount: money(n) }));
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!entry}
      onClose={onClose}
      title={t('Pay worker - {name}', { name: entry?.karigarName || '' })}
      size="sm"
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
        <p className="text-sm text-wood-700">
          {t('Labour {amount}', { amount: money(entry?.amount) })} · {t('Paid {amount}', { amount: money(entry?.paid) })} ·{' '}
          <span className="font-semibold text-red-600">{t('Due {amount}', { amount: money(due) })}</span>
        </p>
        <Field label={t('Amount (₹)')} error={error}>
          <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!error} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}

export function LabourSection({ order }: { order: Order }) {
  const t = useT();
  const { labour } = useData();
  const names = useKarigarNames();
  const confirm = useConfirm();
  const [edit, setEdit] = useState<{ open: boolean; entry: Labour | null }>({ open: false, entry: null });
  const [paying, setPaying] = useState<Labour | null>(null);
  const list = useMemo(() => labour.filter((l) => l.orderId === order.id), [labour, order.id]);
  const assigned = names(order.karigarIds);
  const totalAmt = list.reduce((a, l) => a + (l.amount || 0), 0);
  const totalPaid = list.reduce((a, l) => a + (l.paid || 0), 0);

  return (
    <Card>
      <CardHeader
        title={t('Workers & Labour')}
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ open: true, entry: null })}>
            {t('Labour')}
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        <p className="text-sm">
          <span className="text-wood-600">{t('Assigned:')} </span>
          <span className="font-medium text-wood-950">{assigned || t('None')}</span>
        </p>
        {list.length ? (
          <>
            <ul className="divide-y divide-wood-50 rounded-xl border border-wood-100">
              {list.map((l) => {
                const due = l.amount - (l.paid || 0);
                return (
                  <li key={l.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-wood-950">{l.karigarName}</p>
                        <p className="text-xs text-wood-600">
                          {money(l.amount)} · {t('Paid {amount}', { amount: money(l.paid) })}
                          {l.note ? ` · ${l.note}` : ''}
                        </p>
                      </div>
                      {due > 0 ? <Badge tone="red">{t('Due {amount}', { amount: money(due) })}</Badge> : <Badge tone="green">{t('Clear')}</Badge>}
                    </div>
                    <div className="mt-2 flex gap-1">
                      {due > 0 && (
                        <Button size="sm" variant="secondary" icon={<HandCoins className="h-3.5 w-3.5" />} onClick={() => setPaying(l)}>
                          {t('Pay')}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit({ open: true, entry: l })}>
                        {t('Edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          const ok = await confirm({ title: t('Delete labour entry?'), danger: true, confirmText: t('Delete') });
                          if (!ok) return;
                          try {
                            await softDelete('labour', l.id);
                            toast.success(t('Deleted'));
                          } catch (e) {
                            toast.error(errMsg(e));
                          }
                        }}
                      >
                        {t('Delete')}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-right text-xs text-wood-700">
              {t('Total labour {amount}', { amount: money(totalAmt) })} · {t('Paid {amount}', { amount: money(totalPaid) })} ·{' '}
              <span className="font-semibold text-red-600">{t('Due {amount}', { amount: money(totalAmt - totalPaid) })}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-wood-600">{t('No labour amount added yet.')}</p>
        )}
      </div>
      <LabourModal open={edit.open} entry={edit.entry} order={order} onClose={() => setEdit({ open: false, entry: null })} />
      <PayLabourModal entry={paying} onClose={() => setPaying(null)} />
    </Card>
  );
}

/* ------------------------------ Material used ------------------------------ */

function MaterialModal({ open, onClose, order }: { open: boolean; onClose: () => void; order: Order }) {
  const t = useT();
  const { stock, stockById } = useData();
  const [f, setF] = useState({ itemId: '', qty: '', date: todayStr(), note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ itemId: '', qty: '', date: todayStr(), note: '' });
      setErrors({});
    }
  }, [open]);

  const item = f.itemId ? stockById[f.itemId] : undefined;

  const save = async () => {
    const v = validate(stockMoveSchema, { ...f, type: 'out', orderId: order.id });
    const errs = { ...v.errors };
    if (v.ok && item && v.data.qty > item.qty) errs.qty = t('Only {qty} {unit} in stock', { qty: item.qty, unit: item.unit });
    if (!v.ok || Object.keys(errs).length) return setErrors(errs);
    if (!item) return setErrors({ itemId: 'Select an item' });
    setSaving(true);
    try {
      await moveStock(v.data, item, order);
      toast.success(t('{qty} {unit} {name} used', { qty: v.data.qty, unit: item.unit, name: item.name }));
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
      title={t('Use material')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!stock.length}>
            {t('Save')}
          </Button>
        </>
      }
    >
      {stock.length ? (
        <div className="space-y-3">
          <Field label={t('Stock item')} required error={errors.itemId}>
            <Select
              value={f.itemId}
              onChange={(e) => setF({ ...f, itemId: e.target.value })}
              placeholder={t('Select an item')}
              invalid={!!errors.itemId}
              options={stock.map((s) => ({ value: s.id, label: t('{name} ({qty} {unit} left)', { name: s.name, qty: s.qty, unit: s.unit }) }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={item ? t('Qty ({unit})', { unit: item.unit }) : t('Qty')} required error={errors.qty}>
              <Input type="number" inputMode="decimal" step="any" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} invalid={!!errors.qty} />
            </Field>
            <Field label={t('Date')} required error={errors.date}>
              <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
          </div>
          <Field label={t('Note')}>
            <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </Field>
        </div>
      ) : (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title={t('No items in stock')}
          description={t('Add items on the Stock page first.')}
          action={
            <Link href="/stock" className="text-sm font-medium text-wood-700 underline">
              {t('Stock page')}
            </Link>
          }
        />
      )}
    </Modal>
  );
}

export function MaterialSection({ order }: { order: Order }) {
  const t = useT();
  const { stockMoves } = useData();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const list = useMemo(() => stockMoves.filter((m) => m.orderId === order.id), [stockMoves, order.id]);

  return (
    <Card>
      <CardHeader
        title={t('Material used')}
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            {t('Material')}
          </Button>
        }
      />
      <div className="p-4">
        {list.length ? (
          <ul className="divide-y divide-wood-50 rounded-xl border border-wood-100">
            {list.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-wood-950">{m.itemName}</p>
                  <p className="truncate text-xs text-wood-600">
                    {fmtDate(m.date)}
                    {m.note ? ` · ${m.note}` : ''}
                  </p>
                </div>
                <Badge tone={m.type === 'out' ? 'amber' : 'green'}>
                  {m.type === 'out' ? '-' : '+'}
                  {m.qty} {m.unit}
                </Badge>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                  aria-label={t('Delete')}
                  onClick={async () => {
                    const ok = await confirm({
                      title: t('Remove entry?'),
                      message: t('This quantity will be added back to stock.'),
                      danger: true,
                      confirmText: t('Remove'),
                    });
                    if (!ok) return;
                    try {
                      await deleteStockMove(m.id, m);
                      toast.success(t('Entry removed'));
                    } catch (e) {
                      toast.error(errMsg(e));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-wood-600">{t('No material entries for this order yet.')}</p>
        )}
      </div>
      <MaterialModal open={open} onClose={() => setOpen(false)} order={order} />
    </Card>
  );
}

/* ------------------------------ Status page ------------------------------ */

export function StatusSection({ order }: { order: Order }) {
  const t = useT();
  const { settings, finance } = useData();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const fin = finance[order.id];

  const toggle = async (v: boolean) => {
    setBusy(true);
    try {
      await setShowPriceOnStatus(order, v, settings, fin);
      toast.success(v ? t('Price will show on the status page') : t('Price hidden'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const regen = async () => {
    const ok = await confirm({
      title: t('Create a new link?'),
      message: t('The old status link will stop working. You will need to send the new link to the customer.'),
      confirmText: t('New link'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      await regenerateStatusToken(order, settings, fin);
      toast.success(t('New status link created'));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title={t('Customer status page')} />
      <div className="space-y-3 p-4">
        <p className="text-sm text-wood-700">
          {t('The customer can see the item, stage, photos and delivery date without logging in.')}
        </p>
        <ShareButtons order={order} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-wood-50 pt-3">
          <Toggle checked={!!order.showPriceOnStatus} onChange={toggle} disabled={busy} label={t('Show price / balance')} />
          <Button size="sm" variant="ghost" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={regen} disabled={busy}>
            {t('New link')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
