'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, MessageCircle, Printer, Trash2, Wallet } from 'lucide-react';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { deletePayment } from '@/lib/actions';
import { downloadCSV, errMsg, fmtDate, money, PAY_MODE_LABEL, todayStr, waLink } from '@/lib/utils';
import type { Order, Payment } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  DataTable,
  DeliveryBadge,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  PageLoader,
  SearchInput,
  Segmented,
  Select,
  useConfirm,
  type Column,
} from '@/components/ui';
import { PaymentModal } from '@/components/order-bits';

type Tab = 'payments' | 'dues';

export default function PaymentsPage() {
  const t = useT();
  const { loading, payments, orders, finance, orderById, settings } = useData();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('payments');
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [allTime, setAllTime] = useState(false);
  const [mode, setMode] = useState('');
  const [q, setQ] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payOrderId, setPayOrderId] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return payments.filter((p) => {
      if (!allTime && month && !(p.date || '').startsWith(month)) return false;
      if (mode && p.mode !== mode) return false;
      if (!s) return true;
      return (
        p.customerName.toLowerCase().includes(s) ||
        p.orderNo.toLowerCase().includes(s) ||
        (p.receiptNo || '').toLowerCase().includes(s) ||
        (p.note || '').toLowerCase().includes(s)
      );
    });
  }, [payments, allTime, month, mode, q]);

  const totals = useMemo(() => {
    const acc = { all: 0, cash: 0, upi: 0, bank: 0 } as Record<string, number>;
    for (const p of filtered) {
      acc.all += p.amount;
      acc[p.mode] = (acc[p.mode] || 0) + p.amount;
    }
    return acc;
  }, [filtered]);

  const dues = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orders
      .filter((o) => (finance[o.id]?.balance || 0) > 0)
      .filter(
        (o) =>
          !s ||
          o.customerName.toLowerCase().includes(s) ||
          o.orderNo.toLowerCase().includes(s) ||
          o.customerPhone.includes(s),
      )
      .sort((a, b) => (finance[b.id]?.balance || 0) - (finance[a.id]?.balance || 0));
  }, [orders, finance, q]);
  const totalDue = dues.reduce((a, o) => a + (finance[o.id]?.balance || 0), 0);

  const modeLabel = (m: string) => t(PAY_MODE_LABEL[m] || m);

  const onDelete = async (p: Payment) => {
    const ok = await confirm({
      title: t('Delete payment?'),
      message: t('{receipt} · {amount} ({customer}) will be deleted and the order balance will go back up.', {
        receipt: p.receiptNo,
        amount: money(p.amount),
        customer: p.customerName,
      }),
      danger: true,
      confirmText: t('Delete'),
    });
    if (!ok) return;
    try {
      await deletePayment(p, orderById[p.orderId]);
      toast.success(t('Payment deleted'));
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const openPay = (orderId?: string) => {
    setPayOrderId(orderId);
    setPayOpen(true);
  };

  const reminderText = (o: Order) => {
    const bal = finance[o.id]?.balance || 0;
    return t(
      'Hello {name},\nThis is a friendly reminder from {workshop} that {amount} is due on your order {orderNo} ({item}). Please make the payment when convenient.\nThank you!',
      { name: o.customerName, workshop: settings.name, orderNo: o.orderNo, item: t(o.itemType), amount: money(bal) },
    );
  };

  const exportCSV = () => {
    downloadCSV(`payments-${allTime ? 'all' : month}.csv`, [
      [t('Date'), t('Receipt'), t('Order'), t('Customer'), t('Mode'), t('Type'), t('Amount'), t('Note')],
      ...filtered.map((p) => [
        p.date,
        p.receiptNo,
        p.orderNo,
        p.customerName,
        modeLabel(p.mode),
        p.type === 'advance' ? t('Advance') : t('Instalment'),
        p.amount,
        p.note || '',
      ]),
    ]);
  };

  const payColumns: Column<Payment>[] = [
    {
      key: 'amount-title',
      header: t('Customer'),
      cell: (p) => (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{p.customerName}</span>
          <span className="font-bold text-emerald-700 md:hidden">{money(p.amount)}</span>
        </div>
      ),
    },
    { key: 'date', header: t('Date'), cell: (p) => fmtDate(p.date) },
    { key: 'receipt', header: t('Receipt'), cell: (p) => <span className="font-medium">{p.receiptNo}</span> },
    {
      key: 'order',
      header: t('Order'),
      cell: (p) => (
        <Link href={`/orders/${p.orderId}`} className="font-medium text-wood-700 underline">
          {p.orderNo}
        </Link>
      ),
    },
    {
      key: 'mode',
      header: t('Mode'),
      cell: (p) => (
        <span className="inline-flex gap-1">
          <Badge tone={p.mode === 'cash' ? 'green' : p.mode === 'upi' ? 'purple' : 'blue'}>{modeLabel(p.mode)}</Badge>
          {p.type === 'advance' && <Badge tone="wood">{t('Adv')}</Badge>}
        </span>
      ),
    },
    { key: 'amount', header: t('Amount'), align: 'right', hideOnMobile: true, cell: (p) => <span className="font-semibold">{money(p.amount)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <LinkButton href={`/print/receipt/${p.id}`} variant="ghost" size="sm" icon={<Printer className="h-4 w-4" />}>
            {t('Receipt')}
          </LinkButton>
          <Button variant="ghost" size="icon" onClick={() => onDelete(p)} aria-label={t('Delete')} className="text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const dueColumns: Column<Order>[] = [
    {
      key: 'cust',
      header: t('Customer'),
      cell: (o) => (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{o.customerName}</p>
            <p className="truncate text-xs font-normal text-wood-600">{o.customerPhone}</p>
          </div>
          <span className="font-bold text-red-600 md:hidden">{money(finance[o.id]?.balance)}</span>
        </div>
      ),
    },
    {
      key: 'order',
      header: t('Order'),
      cell: (o) => (
        <Link href={`/orders/${o.id}`} className="font-medium text-wood-700 underline">
          {o.orderNo} · {t(o.itemType)}
        </Link>
      ),
    },
    { key: 'stage', header: t('Stage'), cell: (o) => <span className="text-wood-800">{t(o.stage)}</span> },
    {
      key: 'delivery',
      header: t('Delivery'),
      cell: (o) => <DeliveryBadge date={o.deliveryDate} delivered={o.stageIndex >= settings.stages.length - 1} />,
    },
    {
      key: 'total',
      header: t('Total / Paid'),
      align: 'right',
      cell: (o) => {
        const f = finance[o.id];
        return (
          <span className="text-wood-700">
            {money((f?.price || 0) - (f?.discount || 0))} / <span className="text-emerald-700">{money(f?.paid)}</span>
          </span>
        );
      },
    },
    {
      key: 'bal',
      header: t('Due'),
      align: 'right',
      hideOnMobile: true,
      cell: (o) => <span className="font-bold text-red-600">{money(finance[o.id]?.balance)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (o) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <a
            href={waLink(o.customerPhone, reminderText(o))}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-medium text-white hover:brightness-95"
          >
            <MessageCircle className="h-4 w-4" /> {t('Reminder')}
          </a>
          <Button size="sm" onClick={() => openPay(o.id)} icon={<Wallet className="h-4 w-4" />}>
            {t('Payment')}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={t('Payments')}
        subtitle={t('Advance, instalments and dues')}
        actions={
          <>
            {tab === 'payments' && (
              <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportCSV} disabled={!filtered.length}>
                {t('CSV')}
              </Button>
            )}
            <Button icon={<Wallet className="h-4 w-4" />} onClick={() => openPay(undefined)}>
              {t('Receive Payment')}
            </Button>
          </>
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: 'payments', label: t('Payments') },
          { value: 'dues', label: t('Dues ({n})', { n: dues.length }) },
        ]}
      />

      {tab === 'payments' ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryTile label={t('Total received')} value={money(totals.all)} strong />
            <SummaryTile label={t('Cash')} value={money(totals.cash)} />
            <SummaryTile label={t('UPI')} value={money(totals.upi)} />
            <SummaryTile label={t('Bank')} value={money(totals.bank)} />
          </div>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder={t('Customer, order or receipt no...')} className="sm:min-w-[240px] sm:flex-1" />
            <div className="flex gap-2">
              <Input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setAllTime(false);
                }}
                disabled={allTime}
                className="w-auto"
              />
              <Button variant={allTime ? 'primary' : 'outline'} onClick={() => setAllTime((v) => !v)}>
                {t('All')}
              </Button>
              <Select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-auto"
                options={[
                  { value: '', label: t('All modes') },
                  { value: 'cash', label: t('Cash') },
                  { value: 'upi', label: t('UPI') },
                  { value: 'bank', label: t('Bank') },
                ]}
              />
            </div>
          </div>
          <DataTable
            rows={filtered}
            columns={payColumns}
            rowKey={(p) => p.id}
            empty={
              <EmptyState
                icon={<Wallet className="h-6 w-6" />}
                title={t('No payments')}
                description={allTime ? t('No payments recorded yet') : t('No payments this month - tap "All" to see older ones')}
              />
            }
          />
        </>
      ) : (
        <>
          <Card className="mb-3 flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-wood-600">{t('Total due')}</p>
              <p className="text-2xl font-bold text-red-600">{money(totalDue)}</p>
            </div>
            <p className="text-sm text-wood-700">{t('{n} orders', { n: dues.length })}</p>
          </Card>
          <SearchInput value={q} onChange={setQ} placeholder={t('Customer, phone or order no...')} className="mb-4" />
          <DataTable
            rows={dues}
            columns={dueColumns}
            rowKey={(o) => o.id}
            empty={<EmptyState icon={<Wallet className="h-6 w-6" />} title={t('All clear')} description={t('No order has a pending balance')} />}
          />
        </>
      )}

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} orderId={payOrderId} />
    </div>
  );
}

function SummaryTile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'rounded-2xl bg-wood-700 p-3 text-white' : 'rounded-2xl border border-wood-100 bg-white p-3'}>
      <p className={strong ? 'text-[11px] uppercase tracking-wide text-wood-100' : 'text-[11px] uppercase tracking-wide text-wood-500'}>{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
