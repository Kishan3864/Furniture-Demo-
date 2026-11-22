'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, Users } from 'lucide-react';
import { useData } from '@/lib/data';
import { downloadCSV, money, todayStr } from '@/lib/utils';
import { Badge, Button, DataTable, EmptyState, PageHeader, PageLoader, SearchInput, Toggle, type Column } from '@/components/ui';
import { CustomerModal } from '@/components/order-bits';
import type { Customer } from '@/lib/types';

interface Row extends Customer {
  orderCount: number;
  total: number;
  paid: number;
  due: number;
}

export default function CustomersPage() {
  const { loading, customers, orders, finance } = useData();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [onlyDue, setOnlyDue] = useState(false);
  const [open, setOpen] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const stats: Record<string, { orderCount: number; total: number; paid: number; due: number }> = {};
    for (const o of orders) {
      const s = (stats[o.customerId] ||= { orderCount: 0, total: 0, paid: 0, due: 0 });
      s.orderCount++;
      const f = finance[o.id];
      if (f) {
        s.total += f.price - (f.discount || 0);
        s.paid += f.paid || 0;
        s.due += Math.max(0, f.balance || 0);
      }
    }
    return customers.map((c) => ({ ...c, ...(stats[c.id] || { orderCount: 0, total: 0, paid: 0, due: 0 }) }));
  }, [customers, orders, finance]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    return rows.filter((r) => {
      if (onlyDue && r.due <= 0) return false;
      if (!s) return true;
      return (
        r.name.toLowerCase().includes(s) ||
        (digits.length >= 2 && r.phone.replace(/\D/g, '').includes(digits)) ||
        (r.address || '').toLowerCase().includes(s)
      );
    });
  }, [rows, q, onlyDue]);

  const totalDue = filtered.reduce((a, r) => a + r.due, 0);

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Naam',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-wood-950">{r.name}</p>
          {r.address && <p className="truncate text-xs font-normal text-wood-600">{r.address}</p>}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone },
    { key: 'orders', header: 'Orders', align: 'center', cell: (r) => r.orderCount },
    { key: 'total', header: 'Total', align: 'right', cell: (r) => money(r.total) },
    { key: 'paid', header: 'Mila', align: 'right', cell: (r) => <span className="text-emerald-700">{money(r.paid)}</span> },
    {
      key: 'due',
      header: 'Baaki',
      align: 'right',
      cell: (r) => (r.due > 0 ? <span className="font-semibold text-red-600">{money(r.due)}</span> : <Badge tone="green">Clear</Badge>),
    },
  ];

  const exportCSV = () => {
    downloadCSV(`grahak-${todayStr()}.csv`, [
      ['Naam', 'Phone', 'Address', 'Notes', 'Orders', 'Total', 'Mila', 'Baaki'],
      ...filtered.map((r) => [r.name, r.phone, r.address || '', r.notes || '', r.orderCount, r.total, r.paid, r.due]),
    ]);
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Grahak"
        subtitle={`${customers.length} grahak${totalDue > 0 ? ` · Baaki ${money(totalDue)}` : ''}`}
        actions={
          <>
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={exportCSV} disabled={!filtered.length}>
              CSV
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Naya Grahak
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Naam ya phone se dhoondein..." className="flex-1" />
        <Toggle checked={onlyDue} onChange={setOnlyDue} label="Sirf baaki wale" />
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/customers/${r.id}`)}
        empty={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={customers.length ? 'Koi grahak nahi mila' : 'Abhi koi grahak nahi hai'}
            description={customers.length ? 'Search ya filter badal kar dekhein' : 'Pehla grahak jodein ya naya order banayein'}
            action={
              !customers.length && (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
                  Naya Grahak
                </Button>
              )
            }
          />
        }
      />

      <CustomerModal open={open} onClose={() => setOpen(false)} onSaved={(id) => router.push(`/customers/${id}`)} />
    </div>
  );
}
