'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { HandCoins, Package, Pencil, Plus, Printer, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { useData } from '@/lib/data';
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
  const { finance, payments } = useData();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const fin = finance[order.id];
  const list = useMemo(() => payments.filter((p) => p.orderId === order.id), [payments, order.id]);
  const total = fin ? fin.price - (fin.discount || 0) : 0;

  return (
    <Card>
      <CardHeader
        title="Payments"
        action={
          <Button size="sm" icon={<Wallet className="h-4 w-4" />} onClick={() => setOpen(true)} disabled={!fin || fin.balance <= 0}>
            Payment lein
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {fin ? (
          <div className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-wood-50 p-2.5">
              <p className="text-[11px] uppercase text-wood-500">Price</p>
              <p className="font-semibold">{money(fin.price)}</p>
              {fin.discount > 0 && <p className="text-[11px] text-wood-600">- {money(fin.discount)} discount</p>}
            </div>
            <div className="rounded-xl bg-wood-50 p-2.5">
              <p className="text-[11px] uppercase text-wood-500">Total</p>
              <p className="font-semibold">{money(total)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <p className="text-[11px] uppercase text-emerald-700">Mila</p>
              <p className="font-semibold text-emerald-700">{money(fin.paid)}</p>
            </div>
            <div className={cn('rounded-xl p-2.5', fin.balance > 0 ? 'bg-red-50' : 'bg-emerald-50')}>
              <p className={cn('text-[11px] uppercase', fin.balance > 0 ? 'text-red-600' : 'text-emerald-700')}>Baaki</p>
              <p className={cn('font-semibold', fin.balance > 0 ? 'text-red-600' : 'text-emerald-700')}>{money(fin.balance)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-wood-600">Is order ka hisaab nahi mila.</p>
        )}

        {list.length ? (
          <ul className="divide-y divide-wood-50 rounded-xl border border-wood-100">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-wood-950">
                    {money(p.amount)}{' '}
                    <Badge tone={p.type === 'advance' ? 'blue' : 'wood'} className="ml-1">
                      {p.type === 'advance' ? 'Advance' : 'Kisht'}
                    </Badge>
                  </p>
                  <p className="truncate text-xs text-wood-600">
                    {fmtDate(p.date)} · {PAY_MODE_LABEL[p.mode] || p.mode} · {p.receiptNo}
                    {p.note ? ` · ${p.note}` : ''}
                  </p>
                </div>
                <Link
                  href={`/print/receipt/${p.id}`}
                  className="rounded-lg p-2 text-wood-700 hover:bg-wood-100"
                  aria-label="Receipt"
                  title="Receipt print"
                >
                  <Printer className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label="Delete payment"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Payment delete karein?',
                      message: `${money(p.amount)} (${fmtDate(p.date)}) hata dein? Baaki amount wapas badh jayega.`,
                      danger: true,
                      confirmText: 'Delete',
                    });
                    if (!ok) return;
                    try {
                      await deletePayment(p, order);
                      toast.success('Payment delete ho gaya');
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
          <p className="rounded-xl border border-dashed border-wood-200 p-3 text-center text-sm text-wood-600">Abhi koi payment nahi</p>
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
    if (v.ok && v.data.paid > v.data.amount) errs.paid = 'Diya hua amount labour se zyada nahi';
    if (!v.ok || Object.keys(errs).length) return setErrors(errs);
    const karigar = karigarById[v.data.karigarId];
    if (!karigar) return setErrors({ karigarId: 'Karigar nahi mila' });
    setSaving(true);
    try {
      await saveLabour(v.data, { karigar, order }, entry?.id);
      toast.success('Labour save ho gaya');
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
      title={entry ? 'Labour edit' : 'Labour jodein'}
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
        <Field label="Karigar" required error={errors.karigarId}>
          <Select
            value={f.karigarId}
            onChange={(e) => setF({ ...f, karigarId: e.target.value })}
            placeholder="Karigar chunein"
            invalid={!!errors.karigarId}
            options={options.map((k) => ({
              value: k.id,
              label: `${k.name}${order.karigarIds?.includes(k.id) ? ' (assigned)' : ''}`,
            }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Labour amount (₹)" required error={errors.amount}>
            <Input type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} invalid={!!errors.amount} />
          </Field>
          <Field label="Diya (₹)" error={errors.paid}>
            <Input type="number" inputMode="decimal" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} invalid={!!errors.paid} />
          </Field>
        </div>
        <Field label="Note">
          <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="jaise: polish ka kaam" />
        </Field>
      </div>
    </Modal>
  );
}

function PayLabourModal({ entry, onClose }: { entry: Labour | null; onClose: () => void }) {
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
    if (!amount || Number.isNaN(n) || n <= 0) return setError('Amount daalein');
    if (n > due + 0.5) return setError(`Baaki sirf ${money(due)} hai`);
    setSaving(true);
    try {
      await payLabour(entry, n);
      toast.success(`${money(n)} karigar ko diya`);
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
      title={`Karigar ko payment - ${entry?.karigarName || ''}`}
      size="sm"
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
        <p className="text-sm text-wood-700">
          Labour {money(entry?.amount)} · Diya {money(entry?.paid)} · <span className="font-semibold text-red-600">Baaki {money(due)}</span>
        </p>
        <Field label="Amount (₹)" error={error}>
          <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!error} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}

export function LabourSection({ order }: { order: Order }) {
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
        title="Karigar & Labour"
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ open: true, entry: null })}>
            Labour
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        <p className="text-sm">
          <span className="text-wood-600">Assigned: </span>
          <span className="font-medium text-wood-950">{assigned || 'Koi nahi'}</span>
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
                          {money(l.amount)} · Diya {money(l.paid)}
                          {l.note ? ` · ${l.note}` : ''}
                        </p>
                      </div>
                      {due > 0 ? <Badge tone="red">Baaki {money(due)}</Badge> : <Badge tone="green">Clear</Badge>}
                    </div>
                    <div className="mt-2 flex gap-1">
                      {due > 0 && (
                        <Button size="sm" variant="secondary" icon={<HandCoins className="h-3.5 w-3.5" />} onClick={() => setPaying(l)}>
                          Pay
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit({ open: true, entry: l })}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          const ok = await confirm({ title: 'Labour entry delete karein?', danger: true, confirmText: 'Delete' });
                          if (!ok) return;
                          try {
                            await softDelete('labour', l.id);
                            toast.success('Delete ho gaya');
                          } catch (e) {
                            toast.error(errMsg(e));
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-right text-xs text-wood-700">
              Kul labour {money(totalAmt)} · Diya {money(totalPaid)} ·{' '}
              <span className="font-semibold text-red-600">Baaki {money(totalAmt - totalPaid)}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-wood-600">Labour amount abhi nahi joda.</p>
        )}
      </div>
      <LabourModal open={edit.open} entry={edit.entry} order={order} onClose={() => setEdit({ open: false, entry: null })} />
      <PayLabourModal entry={paying} onClose={() => setPaying(null)} />
    </Card>
  );
}

/* ------------------------------ Material used ------------------------------ */

function MaterialModal({ open, onClose, order }: { open: boolean; onClose: () => void; order: Order }) {
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
    if (v.ok && item && v.data.qty > item.qty) errs.qty = `Stock mein sirf ${item.qty} ${item.unit} hai`;
    if (!v.ok || Object.keys(errs).length) return setErrors(errs);
    if (!item) return setErrors({ itemId: 'Item chunein' });
    setSaving(true);
    try {
      await moveStock(v.data, item, order);
      toast.success(`${v.data.qty} ${item.unit} ${item.name} use hua`);
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
      title="Material use karein"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!stock.length}>
            Save
          </Button>
        </>
      }
    >
      {stock.length ? (
        <div className="space-y-3">
          <Field label="Stock item" required error={errors.itemId}>
            <Select
              value={f.itemId}
              onChange={(e) => setF({ ...f, itemId: e.target.value })}
              placeholder="Item chunein"
              invalid={!!errors.itemId}
              options={stock.map((s) => ({ value: s.id, label: `${s.name} (${s.qty} ${s.unit} bacha)` }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Qty${item ? ` (${item.unit})` : ''}`} required error={errors.qty}>
              <Input type="number" inputMode="decimal" step="any" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} invalid={!!errors.qty} />
            </Field>
            <Field label="Date" required error={errors.date}>
              <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </Field>
          </div>
          <Field label="Note">
            <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </Field>
        </div>
      ) : (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="Stock mein koi item nahi"
          description="Pehle Stock page par item jodein."
          action={
            <Link href="/stock" className="text-sm font-medium text-wood-700 underline">
              Stock page
            </Link>
          }
        />
      )}
    </Modal>
  );
}

export function MaterialSection({ order }: { order: Order }) {
  const { stockMoves } = useData();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const list = useMemo(() => stockMoves.filter((m) => m.orderId === order.id), [stockMoves, order.id]);

  return (
    <Card>
      <CardHeader
        title="Material use hua"
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Material
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
                  aria-label="Delete"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Entry hatayein?',
                      message: 'Yeh qty wapas stock mein jud jayegi.',
                      danger: true,
                      confirmText: 'Hatayein',
                    });
                    if (!ok) return;
                    try {
                      await deleteStockMove(m.id, m);
                      toast.success('Entry hata di');
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
          <p className="text-sm text-wood-600">Is order mein abhi koi material entry nahi.</p>
        )}
      </div>
      <MaterialModal open={open} onClose={() => setOpen(false)} order={order} />
    </Card>
  );
}

/* ------------------------------ Status page ------------------------------ */

export function StatusSection({ order }: { order: Order }) {
  const { settings, finance } = useData();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const fin = finance[order.id];

  const toggle = async (v: boolean) => {
    setBusy(true);
    try {
      await setShowPriceOnStatus(order, v, settings, fin);
      toast.success(v ? 'Status page par price dikhega' : 'Price chhupa diya');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const regen = async () => {
    const ok = await confirm({
      title: 'Naya link banayein?',
      message: 'Purana status link band ho jayega. Grahak ko naya link bhejna padega.',
      confirmText: 'Naya link',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await regenerateStatusToken(order, settings, fin);
      toast.success('Naya status link ban gaya');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Grahak status page" />
      <div className="space-y-3 p-4">
        <p className="text-sm text-wood-700">
          Grahak bina login ke item, stage, photos aur delivery date dekh sakta hai.
        </p>
        <ShareButtons order={order} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-wood-50 pt-3">
          <Toggle checked={!!order.showPriceOnStatus} onChange={toggle} disabled={busy} label="Price / baaki dikhayein" />
          <Button size="sm" variant="ghost" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={regen} disabled={busy}>
            Naya link
          </Button>
        </div>
      </div>
    </Card>
  );
}
