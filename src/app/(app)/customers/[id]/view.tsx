'use client';


import { useRouteParam } from '@/lib/route-param';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, MapPin, MessageCircle, Pencil, Phone, Plus, Printer, Trash2, Wallet } from 'lucide-react';
import { useData } from '@/lib/data';
import { softDelete } from '@/lib/actions';
import { errMsg, fmtDate, money, PAY_MODE_LABEL, waLink } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  PageLoader,
  StatCard,
  useConfirm,
} from '@/components/ui';
import { CustomerModal, OrderCard, PaymentModal } from '@/components/order-bits';

export default function CustomerDetailPage() {
  const params = { id: useRouteParam('id', 2) };
  const id = params?.id as string;
  const router = useRouter();
  const confirm = useConfirm();
  const { loading, customerById, orders, finance, payments, settings } = useData();
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const customer = customerById[id];
  const myOrders = useMemo(() => orders.filter((o) => o.customerId === id), [orders, id]);
  const myPayments = useMemo(() => payments.filter((p) => p.customerId === id), [payments, id]);

  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let due = 0;
    for (const o of myOrders) {
      const f = finance[o.id];
      if (!f) continue;
      total += f.price - (f.discount || 0);
      paid += f.paid || 0;
      due += Math.max(0, f.balance || 0);
    }
    return { total, paid, due };
  }, [myOrders, finance]);

  if (loading) return <PageLoader />;
  if (!customer)
    return (
      <EmptyState
        title="Grahak nahi mila"
        description="Ho sakta hai yeh delete ho gaya ho."
        action={<LinkButton href="/customers">Grahak list</LinkButton>}
      />
    );

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Grahak delete karein?',
      message: (
        <>
          <b>{customer.name}</b> ko list se hata diya jayega. Unke orders aur payments safe rahenge. Settings &gt; Trash se wapas la sakte hain.
        </>
      ),
      danger: true,
      confirmText: 'Delete',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await softDelete('customers', customer.id);
      toast.success('Grahak delete ho gaya');
      router.replace('/customers');
    } catch (e) {
      toast.error(errMsg(e));
      setDeleting(false);
    }
  };

  const reminder = `Namaste ${customer.name} ji,\n${settings.name} ki taraf se yaad dilana tha ki aapka ${money(stats.due)} baaki hai. Jab suvidha ho, kripya payment kar dein.\nDhanyavaad!`;
  const dueOrders = myOrders.filter((o) => (finance[o.id]?.balance || 0) > 0);

  return (
    <div>
      <PageHeader
        back="/customers"
        title={customer.name}
        subtitle={`Grahak since ${fmtDate(customer.createdAt)}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete} loading={deleting} className="text-red-600 hover:bg-red-50">
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-wood-900">
                <Phone className="h-4 w-4 text-wood-500" />
                <a href={`tel:${customer.phone}`} className="font-semibold hover:underline">
                  {customer.phone}
                </a>
              </div>
              {customer.address && (
                <div className="flex items-start gap-2 text-wood-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-wood-500" />
                  <span className="whitespace-pre-line">{customer.address}</span>
                </div>
              )}
              {customer.notes && <div className="rounded-xl bg-amber-50 p-3 text-amber-900">{customer.notes}</div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <LinkButton href={`tel:${customer.phone}`} target="_self" variant="outline" size="sm" icon={<Phone className="h-4 w-4" />}>
                Call
              </LinkButton>
              <a
                href={waLink(customer.phone, `Namaste ${customer.name} ji,`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-medium text-white hover:brightness-95"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <LinkButton href={`/orders/new?customer=${customer.id}`} size="sm" icon={<Plus className="h-4 w-4" />}>
                Naya Order
              </LinkButton>
              <Button size="sm" variant="secondary" icon={<Wallet className="h-4 w-4" />} onClick={() => setPayOpen(true)} disabled={stats.due <= 0}>
                Payment lein
              </Button>
            </div>
            {stats.due > 0 && (
              <a
                href={waLink(customer.phone, reminder)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-center text-xs font-medium text-wood-700 underline"
              >
                WhatsApp par baaki ka reminder bhejein
              </a>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Orders" value={myOrders.length} />
            <StatCard label="Total bill" value={money(stats.total)} />
            <StatCard label="Mila" value={money(stats.paid)} tone="green" />
            <StatCard label="Baaki" value={money(stats.due)} tone={stats.due > 0 ? 'red' : 'green'} />
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={`Order history (${myOrders.length})`} />
            <div className="p-3">
              {myOrders.length ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {myOrders.map((o) => {
                    const f = finance[o.id];
                    return (
                      <OrderCard
                        key={o.id}
                        order={o}
                        href={`/orders/${o.id}`}
                        showCustomer={false}
                        extra={
                          f && (
                            <div className="mt-2 flex items-center justify-between border-t border-wood-100 pt-2 text-xs">
                              <span className="text-wood-600">
                                Total <b className="text-wood-900">{money(f.price - (f.discount || 0))}</b>
                              </span>
                              {f.balance > 0 ? (
                                <span className="font-semibold text-red-600">Baaki {money(f.balance)}</span>
                              ) : (
                                <Badge tone="green">Paid</Badge>
                              )}
                            </div>
                          )
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<ClipboardList className="h-6 w-6" />}
                  title="Koi order nahi"
                  action={
                    <LinkButton href={`/orders/new?customer=${customer.id}`} size="sm" icon={<Plus className="h-4 w-4" />}>
                      Naya Order
                    </LinkButton>
                  }
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={`Payments (${myPayments.length})`} />
            {myPayments.length ? (
              <ul className="divide-y divide-wood-50">
                {myPayments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-wood-950">
                        {money(p.amount)} <Badge tone="wood" className="ml-1">{PAY_MODE_LABEL[p.mode] || p.mode}</Badge>
                        {p.type === 'advance' && <Badge tone="blue" className="ml-1">Advance</Badge>}
                      </p>
                      <p className="truncate text-xs text-wood-600">
                        {fmtDate(p.date)} · {p.receiptNo} ·{' '}
                        <Link href={`/orders/${p.orderId}`} className="underline" onClick={(e) => e.stopPropagation()}>
                          {p.orderNo}
                        </Link>
                        {p.note ? ` · ${p.note}` : ''}
                      </p>
                    </div>
                    <LinkButton href={`/print/receipt/${p.id}`} variant="ghost" size="sm" icon={<Printer className="h-4 w-4" />}>
                      Receipt
                    </LinkButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-wood-600">Abhi koi payment nahi</p>
            )}
          </Card>
        </div>
      </div>

      <CustomerModal open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />
      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        orderId={dueOrders.length === 1 ? dueOrders[0].id : undefined}
      />
    </div>
  );
}
