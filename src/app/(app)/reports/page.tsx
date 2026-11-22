'use client';

import { useMemo, useState } from 'react';
import { Download, IndianRupee, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { cn, downloadCSV, money, num } from '@/lib/utils';
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, PageHeader, PageLoader, Select, StatCard } from '@/components/ui';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthRow {
  key: string;
  month: number;
  label: string;
  orders: number;
  value: number;
  income: number;
  expenses: number;
  net: number;
}

function CsvButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <Button variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={onClick}>
      {t('CSV')}
    </Button>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const w = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-wood-100">
      <div className={cn('h-full rounded-full', className || 'bg-wood-500')} style={{ width: `${w}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const { isOwner } = useAuth();
  const { loading, orders, finance, payments, expenses, karigars, labour, settings } = useData();
  const t = useT();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState<number | 'all'>('all');

  const years = useMemo(() => {
    const s = new Set<number>([thisYear]);
    const add = (d?: string) => {
      const y = Number((d || '').slice(0, 4));
      if (y > 2000) s.add(y);
    };
    orders.forEach((o) => add(o.orderDate));
    payments.forEach((p) => add(p.date));
    expenses.forEach((e) => add(e.date));
    return [...s].sort((a, b) => b - a);
  }, [orders, payments, expenses, thisYear]);

  const inPeriod = (d?: string) => {
    if (!d || Number(d.slice(0, 4)) !== year) return false;
    return month === 'all' || Number(d.slice(5, 7)) - 1 === month;
  };

  const data = useMemo(() => {
    const y = String(year);
    const rows: MonthRow[] = MONTHS.map((label, i) => ({
      key: `${y}-${String(i + 1).padStart(2, '0')}`,
      month: i,
      label: `${label} ${y}`,
      orders: 0,
      value: 0,
      income: 0,
      expenses: 0,
      net: 0,
    }));
    const idx = (d?: string) => (d && d.startsWith(y) ? Number(d.slice(5, 7)) - 1 : -1);

    orders.forEach((o) => {
      const i = idx(o.orderDate);
      if (i < 0) return;
      rows[i].orders++;
      const f = finance[o.id];
      if (f) rows[i].value += f.price - (f.discount || 0);
    });
    payments.forEach((p) => {
      const i = idx(p.date);
      if (i >= 0) rows[i].income += p.amount;
    });
    expenses.forEach((e) => {
      const i = idx(e.date);
      if (i >= 0) rows[i].expenses += e.amount;
    });
    rows.forEach((r) => (r.net = r.income - r.expenses));

    const sel = month === 'all' ? rows : rows.filter((r) => r.month === month);
    const total = sel.reduce(
      (a, r) => ({
        orders: a.orders + r.orders,
        value: a.value + r.value,
        income: a.income + r.income,
        expenses: a.expenses + r.expenses,
        net: a.net + r.net,
      }),
      { orders: 0, value: 0, income: 0, expenses: 0, net: 0 },
    );
    const maxBar = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expenses)));
    return { rows, total, maxBar };
  }, [year, month, orders, finance, payments, expenses]);

  // Dues (all-time outstanding)
  const dues = useMemo(() => {
    const byCust = new Map<string, { id: string; name: string; orders: number; due: number }>();
    let total = 0;
    Object.values(finance).forEach((f) => {
      if (f.balance <= 0) return;
      total += f.balance;
      const cur = byCust.get(f.customerId) || { id: f.customerId, name: f.customerName, orders: 0, due: 0 };
      cur.orders++;
      cur.due += f.balance;
      byCust.set(f.customerId, cur);
    });
    const list = [...byCust.values()].sort((a, b) => b.due - a.due);
    return { total, list };
  }, [finance]);

  // Expenses by category for period
  const expCats = useMemo(() => {
    const m = new Map<string, number>();
    expenses.filter((e) => inPeriod(e.date)).forEach((e) => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    const list = [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
    const total = list.reduce((a, x) => a + x.amount, 0);
    return { list, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, year, month]);

  // Item types for period
  const itemTypes = useMemo(() => {
    const m = new Map<string, { item: string; count: number; value: number }>();
    orders
      .filter((o) => inPeriod(o.orderDate))
      .forEach((o) => {
        const cur = m.get(o.itemType) || { item: o.itemType, count: 0, value: 0 };
        cur.count += o.quantity || 1;
        const f = finance[o.id];
        if (f) cur.value += f.price - (f.discount || 0);
        m.set(o.itemType, cur);
      });
    return [...m.values()].sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, finance, year, month]);

  // Karigar workload
  const workload = useMemo(() => {
    const last = settings.stages.length - 1;
    return karigars
      .map((k) => {
        const mine = orders.filter((o) => (o.karigarIds || []).includes(k.id));
        const active = mine.filter((o) => o.stageIndex < last).length;
        const completed = mine.filter((o) => {
          if (o.stageIndex < last) return false;
          const d = o.deliveredAt ? new Date(o.deliveredAt) : null;
          if (d) return d.getFullYear() === year && (month === 'all' || d.getMonth() === month);
          return inPeriod(o.deliveryDate);
        }).length;
        const lab = labour.filter((l) => l.karigarId === k.id);
        const total = lab.reduce((a, l) => a + (l.amount || 0), 0);
        const paid = lab.reduce((a, l) => a + (l.paid || 0), 0);
        return { id: k.id, name: k.name, skill: k.skill || '', active, completed, total, paid, due: total - paid };
      })
      .sort((a, b) => b.active - a.active || b.due - a.due);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [karigars, orders, labour, settings.stages.length, year, month]);

  if (!isOwner) return <PageLoader />;
  if (loading) return <PageLoader />;

  const periodLabel = month === 'all' ? String(year) : `${MONTHS[month]} ${year}`;
  const fileTag = month === 'all' ? String(year) : `${year}-${String(month + 1).padStart(2, '0')}`;
  const maxWork = Math.max(1, ...workload.map((w) => w.active));
  const maxItem = Math.max(1, ...itemTypes.map((x) => x.value));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Reports')}
        subtitle={t('Business summary · {period}', { period: periodLabel })}
        actions={
          <>
            <Select
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28"
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
              aria-label={t('Year')}
            />
            <Select
              value={String(month)}
              onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-36"
              options={[{ value: 'all', label: t('Full year') }, ...MONTHS.map((m, i) => ({ value: String(i), label: m }))]}
              aria-label={t('Month')}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('Orders')} value={num(data.total.orders)} icon={<TrendingUp className="h-5 w-5" />} sub={t('Value {amount}', { amount: money(data.total.value) })} />
        <StatCard label={t('Income received')} value={money(data.total.income)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label={t('Expenses')} value={money(data.total.expenses)} icon={<Receipt className="h-5 w-5" />} tone="amber" />
        <StatCard
          label={t('Net (income - expenses)')}
          value={money(data.total.net)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone={data.total.net < 0 ? 'red' : 'green'}
          sub={t('Total due: {amount}', { amount: money(dues.total) })}
        />
      </div>

      {/* Monthly */}
      <Card>
        <CardHeader
          title={t('Month-wise - {year}', { year })}
          action={
            <CsvButton
              onClick={() =>
                downloadCSV(`woodbook-monthly-${year}.csv`, [
                  ['Month', 'Orders', 'Order value', 'Income received', 'Expenses', 'Net'],
                  ...data.rows.map((r) => [r.label, r.orders, r.value, r.income, r.expenses, r.net]),
                ])
              }
            />
          }
        />
        <div className="px-4 pt-4">
          <div className="flex h-40 items-end gap-1.5 sm:gap-3">
            {data.rows.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setMonth(month === r.month ? 'all' : r.month)}
                className={cn(
                  'group flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-lg pb-0.5',
                  month === r.month && 'bg-wood-50',
                )}
                title={t('{month}: income {income}, expenses {expenses}', { month: r.label, income: money(r.income), expenses: money(r.expenses) })}
              >
                <div className="flex h-full w-full items-end justify-center gap-0.5">
                  <div className="w-1/2 max-w-[14px] rounded-t bg-emerald-500" style={{ height: `${(r.income / data.maxBar) * 100}%` }} />
                  <div className="w-1/2 max-w-[14px] rounded-t bg-wood-400" style={{ height: `${(r.expenses / data.maxBar) * 100}%` }} />
                </div>
                <span className={cn('text-[10px] font-medium', month === r.month ? 'text-wood-900' : 'text-wood-500')}>
                  {MONTHS[r.month]}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-wood-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> {t('Income')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-wood-400" /> {t('Expenses')}
            </span>
            <span className="ml-auto">{t('Tap a month to filter')}</span>
          </div>
        </div>
        <div className="p-4">
          <DataTable
            rows={data.rows}
            rowKey={(r) => r.key}
            onRowClick={(r) => setMonth(month === r.month ? 'all' : r.month)}
            rowClassName={(r) => (month === r.month ? 'bg-wood-50' : undefined)}
            columns={[
              { key: 'm', header: t('Month'), cell: (r) => r.label },
              { key: 'o', header: t('Orders'), cell: (r) => num(r.orders), align: 'right' },
              { key: 'v', header: t('Order value'), cell: (r) => money(r.value), align: 'right' },
              { key: 'i', header: t('Income'), cell: (r) => <span className="text-emerald-700">{money(r.income)}</span>, align: 'right' },
              { key: 'e', header: t('Expenses'), cell: (r) => money(r.expenses), align: 'right' },
              {
                key: 'n',
                header: t('Net'),
                cell: (r) => <span className={cn('font-semibold', r.net < 0 ? 'text-red-600' : 'text-wood-950')}>{money(r.net)}</span>,
                align: 'right',
              },
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dues */}
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                {t('Pending dues')} <Badge tone="red">{money(dues.total)}</Badge>
              </span>
            }
            action={
              <CsvButton
                onClick={() =>
                  downloadCSV('woodbook-dues.csv', [
                    ['Customer', 'Orders with due', 'Due amount'],
                    ...dues.list.map((d) => [d.name, d.orders, d.due]),
                  ])
                }
              />
            }
          />
          <div className="p-4">
            <DataTable
              rows={dues.list.slice(0, 15)}
              rowKey={(r) => r.id}
              empty={<EmptyState title={t('No dues') + ' 🎉'} className="py-8" />}
              columns={[
                { key: 'n', header: t('Customer'), cell: (r) => r.name },
                { key: 'o', header: t('Orders'), cell: (r) => r.orders, align: 'right' },
                { key: 'd', header: t('Due'), cell: (r) => <span className="font-semibold text-red-600">{money(r.due)}</span>, align: 'right' },
              ]}
            />
            {dues.list.length > 15 && <p className="mt-2 text-xs text-wood-600">{t('+{n} more customers - full list in CSV', { n: dues.list.length - 15 })}</p>}
          </div>
        </Card>

        {/* Expenses by category */}
        <Card>
          <CardHeader
            title={t('Expenses by category · {period}', { period: periodLabel })}
            action={
              <CsvButton
                onClick={() =>
                  downloadCSV(`woodbook-expenses-${fileTag}.csv`, [
                    ['Category', 'Amount', 'Share %'],
                    ...expCats.list.map((x) => [x.category, x.amount, expCats.total ? Math.round((x.amount / expCats.total) * 100) : 0]),
                  ])
                }
              />
            }
          />
          <div className="space-y-3 p-4">
            {expCats.list.length ? (
              expCats.list.map((x) => (
                <div key={x.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-wood-900">{t(x.category)}</span>
                    <span className="text-wood-700">
                      {money(x.amount)}{' '}
                      <span className="text-xs text-wood-500">({expCats.total ? Math.round((x.amount / expCats.total) * 100) : 0}%)</span>
                    </span>
                  </div>
                  <Bar value={x.amount} max={expCats.list[0].amount} className="bg-wood-400" />
                </div>
              ))
            ) : (
              <EmptyState title={t('No expenses in this period')} className="py-8" />
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Karigar workload */}
        <Card>
          <CardHeader
            title={t('Worker workload')}
            action={
              <CsvButton
                onClick={() =>
                  downloadCSV(`woodbook-karigar-${fileTag}.csv`, [
                    ['Worker', 'Skill', 'Active jobs', `Completed (${periodLabel})`, 'Labour total', 'Paid', 'Due'],
                    ...workload.map((w) => [w.name, w.skill, w.active, w.completed, w.total, w.paid, w.due]),
                  ])
                }
              />
            }
          />
          <div className="p-4">
            <DataTable
              rows={workload}
              rowKey={(r) => r.id}
              empty={<EmptyState title={t('No workers yet')} className="py-8" />}
              columns={[
                {
                  key: 'n',
                  header: t('Worker'),
                  cell: (r) => (
                    <div className="min-w-[8rem]">
                      <p className="font-medium">{r.name}</p>
                      <div className="mt-1 hidden md:block">
                        <Bar value={r.active} max={maxWork} />
                      </div>
                    </div>
                  ),
                },
                { key: 'a', header: t('Active'), cell: (r) => r.active, align: 'right' },
                { key: 'c', header: t('Completed'), cell: (r) => r.completed, align: 'right' },
                { key: 't', header: t('Labour'), cell: (r) => money(r.total), align: 'right' },
                {
                  key: 'd',
                  header: t('Due'),
                  cell: (r) => <span className={r.due > 0 ? 'font-semibold text-red-600' : ''}>{money(r.due)}</span>,
                  align: 'right',
                },
              ]}
            />
          </div>
        </Card>

        {/* Item types */}
        <Card>
          <CardHeader
            title={t('By item type · {period}', { period: periodLabel })}
            action={
              <CsvButton
                onClick={() =>
                  downloadCSV(`woodbook-items-${fileTag}.csv`, [
                    ['Item type', 'Quantity', 'Order value'],
                    ...itemTypes.map((x) => [x.item, x.count, x.value]),
                  ])
                }
              />
            }
          />
          <div className="space-y-3 p-4">
            {itemTypes.length ? (
              itemTypes.map((x) => (
                <div key={x.item}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-wood-900">
                      {t(x.item)} <span className="text-xs text-wood-500">x{x.count}</span>
                    </span>
                    <span className="text-wood-700">{money(x.value)}</span>
                  </div>
                  <Bar value={x.value} max={maxItem} />
                </div>
              ))
            ) : (
              <EmptyState title={t('No orders in this period')} className="py-8" />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
