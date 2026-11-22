'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ClipboardList, Download, Funnel, Plus } from 'lucide-react';
import { useData } from '@/lib/data';
import type { Order } from '@/lib/types';
import { cn, downloadCSV, fmtDate, money, PRIORITY_LABEL, todayStr } from '@/lib/utils';
import {
  Badge,
  Button,
  DataTable,
  DeliveryBadge,
  EmptyState,
  LinkButton,
  PageHeader,
  PageLoader,
  PriorityBadge,
  ProgressBar,
  SearchInput,
  Segmented,
  Select,
  Toggle,
  type Column,
} from '@/components/ui';
import { OrderCard, useKarigarNames } from '@/components/order-bits';

type Status = 'active' | 'ready' | 'delivered' | 'all';
type Sort = 'delivery' | 'newest';

export default function OrdersPage() {
  const router = useRouter();
  const { loading, orders, finance, settings, karigars } = useData();
  const names = useKarigarNames();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status>('active');
  const [stage, setStage] = useState('');
  const [item, setItem] = useState('');
  const [karigar, setKarigar] = useState('');
  const [priority, setPriority] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('delivery');
  const [showFilters, setShowFilters] = useState(false);

  const last = settings.stages.length - 1;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    const r = orders.filter((o) => {
      if (status === 'active' && o.stageIndex >= last) return false;
      if (status === 'ready' && o.stageIndex !== last - 1) return false;
      if (status === 'delivered' && o.stageIndex < last) return false;
      if (stage !== '' && String(o.stageIndex) !== stage) return false;
      if (item && o.itemType !== item) return false;
      if (karigar === '__none__' && o.karigarIds?.length) return false;
      if (karigar && karigar !== '__none__' && !o.karigarIds?.includes(karigar)) return false;
      if (priority && o.priority !== priority) return false;
      if (dueOnly && !((finance[o.id]?.balance || 0) > 0)) return false;
      if (s) {
        const hit =
          o.orderNo.toLowerCase().includes(s) ||
          o.customerName.toLowerCase().includes(s) ||
          o.itemType.toLowerCase().includes(s) ||
          (o.title || '').toLowerCase().includes(s) ||
          (digits.length >= 3 && o.customerPhone.replace(/\D/g, '').includes(digits)) ||
          (digits.length > 0 && digits.length < 5 && o.orderNo.replace(/\D/g, '').replace(/^0+/, '') === digits.replace(/^0+/, ''));
        if (!hit) return false;
      }
      return true;
    });
    if (sort === 'delivery') {
      r.sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || '') || b.createdAt - a.createdAt);
    } else {
      r.sort((a, b) => b.createdAt - a.createdAt);
    }
    return r;
  }, [orders, finance, q, status, stage, item, karigar, priority, dueOnly, sort, last]);

  const activeFilterCount = [stage, item, karigar, priority].filter(Boolean).length + (dueOnly ? 1 : 0);

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['Order No', 'Order Date', 'Grahak', 'Phone', 'Item', 'Qty', 'Title', 'Stage', 'Progress %', 'Delivery Date', 'Karigar', 'Priority', 'Total', 'Paid', 'Balance'],
      ...filtered.map((o) => {
        const f = finance[o.id];
        return [
          o.orderNo,
          o.orderDate,
          o.customerName,
          o.customerPhone,
          o.itemType,
          o.quantity,
          o.title || '',
          o.stage,
          o.progress,
          o.deliveryDate,
          names(o.karigarIds),
          PRIORITY_LABEL[o.priority] || o.priority,
          f ? f.price - (f.discount || 0) : 0,
          f?.paid || 0,
          f?.balance || 0,
        ];
      }),
    ];
    downloadCSV(`woodbook-orders-${todayStr()}.csv`, rows);
  };

  const columns: Column<Order>[] = [
    {
      key: 'no',
      header: 'Order',
      cell: (o) => (
        <div>
          <p className="font-semibold text-wood-950">{o.orderNo}</p>
          <p className="text-xs text-wood-500">{fmtDate(o.orderDate, 'dd MMM yy')}</p>
        </div>
      ),
    },
    {
      key: 'item',
      header: 'Item',
      cell: (o) => (
        <div className="min-w-0">
          <p className="font-medium">
            {o.itemType}
            {o.quantity > 1 ? ` x${o.quantity}` : ''} <PriorityBadge priority={o.priority} />
          </p>
          {o.title && <p className="max-w-[200px] truncate text-xs text-wood-600">{o.title}</p>}
        </div>
      ),
    },
    {
      key: 'cust',
      header: 'Grahak',
      cell: (o) => (
        <div>
          <p className="font-medium">{o.customerName}</p>
          <p className="text-xs text-wood-500">{o.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      className: 'min-w-[150px]',
      cell: (o) => (
        <div>
          <p className="text-xs font-medium text-wood-800">{o.stage}</p>
          <ProgressBar value={o.progress} className="mt-1" showLabel />
        </div>
      ),
    },
    {
      key: 'delivery',
      header: 'Delivery',
      cell: (o) => (
        <div className="space-y-1">
          <p className="text-xs text-wood-700">{fmtDate(o.deliveryDate, 'dd MMM yy')}</p>
          <DeliveryBadge date={o.deliveryDate} delivered={o.stageIndex >= last} />
        </div>
      ),
    },
    {
      key: 'money',
      header: 'Total / Baaki',
      align: 'right',
      cell: (o) => {
        const f = finance[o.id];
        if (!f) return <span className="text-wood-400">-</span>;
        return (
          <div>
            <p className="font-medium">{money(f.price - (f.discount || 0))}</p>
            <p className={cn('text-xs font-semibold', f.balance > 0 ? 'text-red-600' : 'text-emerald-700')}>
              {f.balance > 0 ? `Baaki ${money(f.balance)}` : 'Poora mila'}
            </p>
          </div>
        );
      },
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${filtered.length} order${filtered.length === 1 ? '' : 's'}`}
        actions={
          <>
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportCSV} disabled={!filtered.length}>
              CSV
            </Button>
            <LinkButton href="/orders/new" icon={<Plus className="h-4 w-4" />}>
              Naya Order
            </LinkButton>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Order no, grahak, phone, item..." className="flex-1" />
          <div className="flex items-center gap-2">
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto">
              <option value="delivery">Delivery date se</option>
              <option value="newest">Naye pehle</option>
            </Select>
            <Button
              variant={showFilters || activeFilterCount ? 'secondary' : 'outline'}
              icon={<Funnel className="h-4 w-4" />}
              onClick={() => setShowFilters((v) => !v)}
            >
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
          </div>
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'active', label: 'Chalu' },
              { value: 'ready', label: 'Ready' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'all', label: 'Sab' },
            ]}
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-wood-100 bg-white p-3 sm:grid-cols-4">
            <Select value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Sab stage">
              {settings.stages.map((s, i) => (
                <option key={s.name + i} value={String(i)}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={item} onChange={(e) => setItem(e.target.value)} placeholder="Sab item" options={settings.itemTypes} />
            <Select value={karigar} onChange={(e) => setKarigar(e.target.value)} placeholder="Sab karigar">
              <option value="__none__">Bina karigar</option>
              {karigars.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </Select>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Sab priority">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
            <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-4">
              <Toggle checked={dueOnly} onChange={setDueOnly} label="Sirf baaki wale" />
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStage('');
                    setItem('');
                    setKarigar('');
                    setPriority('');
                    setDueOnly(false);
                  }}
                >
                  Filters hatayein
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(o) => o.id}
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        rowClassName={(o) =>
          o.stageIndex < last && o.deliveryDate && o.deliveryDate < todayStr() ? 'bg-red-50/60' : undefined
        }
        mobileCard={(o) => {
          const f = finance[o.id];
          return (
            <OrderCard
              order={o}
              className="cursor-pointer"
              extra={
                f ? (
                  <div className="mt-2 flex items-center justify-between border-t border-wood-50 pt-2 text-xs">
                    <span className="text-wood-600">Total {money(f.price - (f.discount || 0))}</span>
                    {f.balance > 0 ? (
                      <Badge tone="red">Baaki {money(f.balance)}</Badge>
                    ) : (
                      <Badge tone="green">Poora mila</Badge>
                    )}
                  </div>
                ) : null
              }
            />
          );
        }}
        empty={
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title={orders.length ? 'Is filter mein koi order nahi' : 'Abhi koi order nahi hai'}
            description={orders.length ? 'Filter ya search badal kar dekhein.' : 'Pehla order banayein - naap, design aur advance ek saath.'}
            action={
              !orders.length ? (
                <LinkButton href="/orders/new" icon={<Plus className="h-4 w-4" />}>
                  Naya Order
                </LinkButton>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
