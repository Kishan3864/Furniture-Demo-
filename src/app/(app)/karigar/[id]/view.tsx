'use client';

import { useRouteParam } from '@/lib/route-param';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Banknote, Hammer, KeyRound, Pencil, Phone, Plus, Trash2, Wallet } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useData } from '@/lib/data';
import { createKarigarLogin, deleteKarigar, payLabour, saveLabour, setKarigarLoginActive, softDelete } from '@/lib/actions';
import { karigarLoginSchema, labourSchema, validate } from '@/lib/schemas';
import type { Karigar, Labour } from '@/lib/types';
import { errMsg, fmtDate, money, waLink } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  PageHeader,
  PageLoader,
  Select,
  StatCard,
  useConfirm,
  type Column,
} from '@/components/ui';
import { OrderCard } from '@/components/order-bits';
import { KarigarModal } from '../karigar-modal';

export default function KarigarDetailPage() {
  const params = { id: useRouteParam('id', 2) };
  const id = params?.id as string;
  const router = useRouter();
  const confirm = useConfirm();
  const { loading, karigarById, orders, labour, settings } = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [labourOpen, setLabourOpen] = useState(false);
  const [editLabour, setEditLabour] = useState<Labour | null>(null);
  const [payFor, setPayFor] = useState<Labour | null>(null);

  const k = karigarById[id];
  const lastIdx = settings.stages.length - 1;
  const activeJobs = useMemo(
    () => orders.filter((o) => (o.karigarIds || []).includes(id) && o.stageIndex < lastIdx),
    [orders, id, lastIdx],
  );
  const doneJobs = useMemo(
    () => orders.filter((o) => (o.karigarIds || []).includes(id) && o.stageIndex >= lastIdx).length,
    [orders, id, lastIdx],
  );
  const entries = useMemo(() => labour.filter((l) => l.karigarId === id), [labour, id]);
  const totals = useMemo(() => {
    const amount = entries.reduce((a, l) => a + (l.amount || 0), 0);
    const paid = entries.reduce((a, l) => a + (l.paid || 0), 0);
    return { amount, paid, due: Math.max(0, amount - paid) };
  }, [entries]);

  if (loading) return <PageLoader />;
  if (!k)
    return (
      <EmptyState title="Karigar nahi mila" description="Ho sakta hai delete ho gaya ho." action={<LinkButton href="/karigar">Karigar list</LinkButton>} />
    );

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Karigar delete karein?',
      message: (
        <>
          <b>{k.name}</b> list se hat jayega aur unka login band ho jayega. Purane orders aur labour hisaab safe rahenge.
        </>
      ),
      danger: true,
      confirmText: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteKarigar(k);
      toast.success('Karigar delete ho gaya');
      router.replace('/karigar');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const onDeleteLabour = async (l: Labour) => {
    const ok = await confirm({ title: 'Labour entry delete karein?', message: `${l.orderNo} · ${money(l.amount)}`, danger: true, confirmText: 'Delete' });
    if (!ok) return;
    try {
      await softDelete('labour', l.id);
      toast.success('Entry delete ho gayi');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const columns: Column<Labour>[] = [
    {
      key: 'order',
      header: 'Order',
      cell: (l) => (
        <div className="flex items-center justify-between gap-2">
          <Link href={`/orders/${l.orderId}`} className="font-semibold text-wood-800 underline">
            {l.orderNo}
          </Link>
          <span className="text-sm font-normal text-wood-700 md:hidden">{l.itemType}</span>
        </div>
      ),
    },
    { key: 'item', header: 'Item', hideOnMobile: true, cell: (l) => l.itemType },
    { key: 'amount', header: 'Amount', align: 'right', cell: (l) => money(l.amount) },
    { key: 'paid', header: 'Diya', align: 'right', cell: (l) => <span className="text-emerald-700">{money(l.paid)}</span> },
    {
      key: 'due',
      header: 'Baaki',
      align: 'right',
      cell: (l) => {
        const due = Math.max(0, (l.amount || 0) - (l.paid || 0));
        return due > 0 ? <span className="font-semibold text-red-600">{money(due)}</span> : <Badge tone="green">Clear</Badge>;
      },
    },
    { key: 'note', header: 'Note', cell: (l) => <span className="text-wood-700">{l.note || '-'}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (l) => {
        const due = Math.max(0, (l.amount || 0) - (l.paid || 0));
        return (
          <div className="flex justify-end gap-1">
            {due > 0 && (
              <Button size="sm" variant="success" icon={<Banknote className="h-4 w-4" />} onClick={() => setPayFor(l)}>
                Pay
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              aria-label="Edit"
              onClick={() => {
                setEditLabour(l);
                setLabourOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete" className="text-red-600 hover:bg-red-50" onClick={() => onDeleteLabour(l)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        back="/karigar"
        title={
          <span className="inline-flex items-center gap-2">
            {k.name} {k.active === false && <Badge>Inactive</Badge>}
          </span>
        }
        subtitle={k.skill || 'Karigar'}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} className="text-red-600 hover:bg-red-50">
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-wood-500" />
              <a href={`tel:${k.phone}`} className="font-semibold hover:underline">
                {k.phone}
              </a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <LinkButton href={`tel:${k.phone}`} target="_self" variant="outline" size="sm" icon={<Phone className="h-4 w-4" />}>
                Call
              </LinkButton>
              <a
                href={waLink(k.phone, `Namaste ${k.name} ji,`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center rounded-xl bg-[#25D366] px-3 text-sm font-medium text-white hover:brightness-95"
              >
                WhatsApp
              </a>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Chalu jobs" value={activeJobs.length} tone="blue" />
            <StatCard label="Delivered jobs" value={doneJobs} tone="green" />
            <StatCard label="Labour total" value={money(totals.amount)} />
            <StatCard label="Dena baaki" value={money(totals.due)} tone={totals.due > 0 ? 'red' : 'green'} sub={`Diya ${money(totals.paid)}`} />
          </div>

          <LoginSection karigar={k} />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={`Chalu kaam (${activeJobs.length})`} />
            <div className="p-3">
              {activeJobs.length ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {activeJobs.map((o) => (
                    <OrderCard key={o.id} order={o} href={`/orders/${o.id}`} showKarigar={false} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Hammer className="h-6 w-6" />} title="Abhi koi chalu kaam nahi" description="Order banate/edit karte waqt karigar assign karein" />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Labour hisaab (per job)"
              action={
                <Button
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setEditLabour(null);
                    setLabourOpen(true);
                  }}
                >
                  Entry jodein
                </Button>
              }
            />
            <div className="p-3">
              <DataTable
                rows={entries}
                columns={columns}
                rowKey={(l) => l.id}
                empty={<EmptyState icon={<Wallet className="h-6 w-6" />} title="Koi labour entry nahi" description="Har job ki mazdoori yahan jodein" />}
              />
            </div>
          </Card>
        </div>
      </div>

      <KarigarModal open={editOpen} onClose={() => setEditOpen(false)} karigar={k} />
      <LabourModal open={labourOpen} onClose={() => setLabourOpen(false)} karigar={k} entry={editLabour} />
      <PayLabourModal entry={payFor} onClose={() => setPayFor(null)} />
    </div>
  );
}

/* ------------------------------ Login ------------------------------ */

function LoginSection({ karigar }: { karigar: Karigar }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadActive = useCallback(async () => {
    if (!karigar.uid) return;
    try {
      const s = await getDoc(doc(db(), 'users', karigar.uid));
      setActive(s.exists() ? (s.data() as { active?: boolean }).active !== false : false);
    } catch {
      setActive(null);
    }
  }, [karigar.uid]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  const create = async () => {
    const v = validate(karigarLoginSchema, f);
    if (!v.ok) return setErrors(v.errors);
    setSaving(true);
    try {
      await createKarigarLogin(karigar, v.data.email, v.data.password);
      setCreated({ email: v.data.email.toLowerCase(), password: v.data.password });
      setF({ email: '', password: '' });
      setErrors({});
      toast.success('Karigar ka login ban gaya');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (next: boolean) => {
    setToggling(true);
    try {
      await setKarigarLoginActive(karigar, next);
      setActive(next);
      toast.success(next ? 'Login chalu ho gaya' : 'Login band ho gaya');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setToggling(false);
    }
  };

  return (
    <Card>
      <CardHeader title={<span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4" /> App login</span>} />
      <div className="space-y-3 p-4 text-sm">
        {created && (
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">
            <p className="font-semibold">Yeh email/password karigar ko de dein:</p>
            <p className="mt-1">
              Email: <b>{created.email}</b>
            </p>
            <p>
              Password: <b>{created.password}</b>
            </p>
            <a
              href={waLink(
                karigar.phone,
                `WoodBook app login\nLink: ${typeof window !== 'undefined' ? window.location.origin : ''}/login\nEmail: ${created.email}\nPassword: ${created.password}`,
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-medium underline"
            >
              WhatsApp par bhejein
            </a>
          </div>
        )}
        {karigar.uid ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-wood-500">Email</p>
                <p className="truncate font-medium">{karigar.email}</p>
              </div>
              {active === null ? <Badge>...</Badge> : active ? <Badge tone="green">Chalu</Badge> : <Badge tone="red">Band</Badge>}
            </div>
            <p className="text-xs text-wood-600">Karigar sirf apne assign kiye gaye kaam dekh sakta hai - price/payment nahi.</p>
            {active !== null &&
              (active ? (
                <Button variant="outline" className="w-full" loading={toggling} onClick={() => toggle(false)}>
                  Login band karein
                </Button>
              ) : (
                <Button className="w-full" loading={toggling} onClick={() => toggle(true)}>
                  Login chalu karein
                </Button>
              ))}
          </>
        ) : (
          <>
            <p className="text-xs text-wood-600">Login banane par karigar apne phone par apna kaam dekh sakega aur stage/photo update kar sakega.</p>
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                autoComplete="off"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                invalid={!!errors.email}
                placeholder="karigar@example.com"
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <Input
                type="text"
                autoComplete="new-password"
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
                invalid={!!errors.password}
                placeholder="Kam se kam 6 character"
              />
            </Field>
            <Button className="w-full" loading={saving} onClick={create} icon={<KeyRound className="h-4 w-4" />}>
              Login banayein
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------ Labour modal ------------------------------ */

function LabourModal({ open, onClose, karigar, entry }: { open: boolean; onClose: () => void; karigar: Karigar; entry: Labour | null }) {
  const { orders, orderById } = useData();
  const [f, setF] = useState({ orderId: '', amount: '', paid: '0', note: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF({
        orderId: entry?.orderId || '',
        amount: entry ? String(entry.amount) : '',
        paid: entry ? String(entry.paid || 0) : '0',
        note: entry?.note || '',
      });
      setErrors({});
    }
  }, [open, entry]);

  const options = useMemo(() => {
    const mine = orders.filter((o) => (o.karigarIds || []).includes(karigar.id));
    const others = orders.filter((o) => !(o.karigarIds || []).includes(karigar.id));
    return [...mine, ...others].map((o) => ({
      value: o.id,
      label: `${o.orderNo} · ${o.itemType} · ${o.customerName}${(o.karigarIds || []).includes(karigar.id) ? '' : ' (assign nahi)'}`,
    }));
  }, [orders, karigar.id]);

  const save = async () => {
    const v = validate(labourSchema, { ...f, karigarId: karigar.id });
    if (!v.ok) return setErrors(v.errors);
    if (v.data.paid > v.data.amount) return setErrors({ paid: 'Diya hua amount se zyada nahi ho sakta' });
    const order = orderById[v.data.orderId];
    if (!order) return setErrors({ orderId: 'Order nahi mila' });
    setSaving(true);
    try {
      await saveLabour(v.data, { karigar, order }, entry?.id);
      toast.success(entry ? 'Entry update ho gayi' : 'Labour entry jud gayi');
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
      title={entry ? 'Labour entry edit' : `Labour entry · ${karigar.name}`}
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
        <Field label="Order" required error={errors.orderId}>
          <Select
            value={f.orderId}
            onChange={(e) => setF({ ...f, orderId: e.target.value })}
            invalid={!!errors.orderId}
            placeholder="Order chunein"
            options={options}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mazdoori (₹)" required error={errors.amount}>
            <Input type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} invalid={!!errors.amount} />
          </Field>
          <Field label="Diya (₹)" error={errors.paid}>
            <Input type="number" inputMode="decimal" value={f.paid} onChange={(e) => setF({ ...f, paid: e.target.value })} invalid={!!errors.paid} />
          </Field>
        </div>
        <Field label="Note">
          <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Polish ka kaam, 2 din..." />
        </Field>
      </div>
    </Modal>
  );
}

function PayLabourModal({ entry, onClose }: { entry: Labour | null; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const due = entry ? Math.max(0, (entry.amount || 0) - (entry.paid || 0)) : 0;

  useEffect(() => {
    if (entry) {
      setAmount(String(due));
      setError('');
    }
  }, [entry, due]);

  const save = async () => {
    if (!entry) return;
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || n <= 0) return setError('Amount daalein');
    if (n > due + 0.5) return setError(`Baaki sirf ${money(due)} hai`);
    setSaving(true);
    try {
      await payLabour(entry, n);
      toast.success(`${money(n)} diya - ${entry.karigarName}`);
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
      title="Karigar ko payment"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" onClick={save} loading={saving}>
            Pay
          </Button>
        </>
      }
    >
      {entry && (
        <div className="space-y-3 text-sm">
          <p>
            {entry.orderNo} · {entry.itemType} · Baaki <b className="text-red-600">{money(due)}</b>
          </p>
          <p className="text-xs text-wood-600">Added on {fmtDate(entry.createdAt)}</p>
          <Field label="Amount (₹)" error={error}>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!error} autoFocus />
          </Field>
        </div>
      )}
    </Modal>
  );
}
