'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  CircleCheckBig,
  Hammer,
  IndianRupee,
  PackageMinus,
  Plus,
  Sparkles,
  TriangleAlert,
  Truck,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { daysLeft, fmtDate, money, num, PAY_MODE_LABEL, todayStr } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageLoader, StatCard } from '@/components/ui';
import { OrderCard } from '@/components/order-bits';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Section({
  title,
  icon,
  count,
  href,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  href?: string;
  tone?: 'red';
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className={`flex items-center gap-2 font-semibold ${tone === 'red' ? 'text-red-700' : 'text-wood-950'}`}>
          {icon}
          {title}
          {count !== undefined && <Badge tone={tone === 'red' ? 'red' : 'wood'}>{count}</Badge>}
        </h2>
        {href && (
          <Link href={href} className="inline-flex items-center text-sm font-medium text-wood-700 hover:text-wood-900">
            {t('View all')} <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DashboardPage() {
  const { user, isOwner } = useAuth();
  const { loading, orders, finance, payments, stock, settings, customers } = useData();
  const t = useT();

  const stats = useMemo(() => {
    const last = settings.stages.length - 1;
    const active = orders.filter((o) => o.stageIndex < last);
    const withDays = active.map((o) => ({ o, d: daysLeft(o.deliveryDate) }));
    const byDate = (a: Order, b: Order) => (a.deliveryDate || '').localeCompare(b.deliveryDate || '');
    const overdue = withDays.filter((x) => x.d !== null && x.d < 0).map((x) => x.o).sort(byDate);
    const today = withDays.filter((x) => x.d === 0).map((x) => x.o);
    const week = withDays
      .filter((x) => x.d !== null && x.d >= 0 && x.d <= 7)
      .map((x) => x.o)
      .sort(byDate);
    const ready = active.filter((o) => o.stageIndex === last - 1).sort(byDate);
    const inProgress = active.filter((o) => o.stageIndex < last - 1);
    const dues = Object.values(finance).filter((f) => f.balance > 0);
    const pendingTotal = dues.reduce((a, f) => a + f.balance, 0);
    const topDues = [...dues].sort((a, b) => b.balance - a.balance).slice(0, 5);
    const lowStock = stock.filter((s) => (Number(s.qty) || 0) <= (Number(s.minQty) || 0));
    const today0 = todayStr();
    const receivedToday = payments.filter((p) => p.date === today0).reduce((a, p) => a + p.amount, 0);
    return { overdue, today, week, ready, inProgress, pendingTotal, dues, topDues, lowStock, receivedToday };
  }, [orders, finance, stock, payments, settings.stages.length]);

  if (!isOwner) return <PageLoader />;
  if (loading) return <PageLoader />;

  const firstName = (user?.name || '').split(' ')[0];
  const isNew = orders.length === 0 && customers.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-wood-600">{fmtDate(todayStr(), 'EEEE, dd MMMM yyyy')}</p>
          <h1 className="text-2xl font-bold text-wood-950">
            {t(greeting())}
            {firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm text-wood-700">{settings.name}</p>
        </div>
        <LinkButton href="/orders/new" size="lg" icon={<Plus className="h-5 w-5" />}>
          {t('New Order')}
        </LinkButton>
      </div>

      {isNew ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={t('Your workshop is ready!')}
            description={t('Create your first order, or load demo data to see how WoodBook works. Also add your workshop name, logo and phone in Settings.')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/orders/new" icon={<Plus className="h-4 w-4" />}>
                  {t('First Order')}
                </LinkButton>
                <LinkButton href="/settings#demo" variant="outline">
                  {t('Load demo data')}
                </LinkButton>
                <LinkButton href="/settings" variant="ghost">
                  {t('Settings')}
                </LinkButton>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-tour="dash-stats">
            <StatCard label={t("Today's deliveries")} value={stats.today.length} icon={<Truck className="h-5 w-5" />} tone="amber" href="/delivery" />
            <StatCard label={t('This week')} value={stats.week.length} icon={<CalendarDays className="h-5 w-5" />} tone="blue" href="/delivery" sub={t('Next 7 days')} />
            <StatCard
              label={t('Overdue')}
              value={stats.overdue.length}
              icon={<TriangleAlert className="h-5 w-5" />}
              tone={stats.overdue.length ? 'red' : 'green'}
              href="/delivery"
            />
            <StatCard label={t('In progress')} value={stats.inProgress.length} icon={<Hammer className="h-5 w-5" />} href="/board" />
            <StatCard label={t('Ready, not delivered')} value={stats.ready.length} icon={<CircleCheckBig className="h-5 w-5" />} tone="green" href="/board" />
            <StatCard
              label={t('Pending payments')}
              value={money(stats.pendingTotal)}
              icon={<IndianRupee className="h-5 w-5" />}
              tone="red"
              href="/payments"
              sub={t('{n} orders', { n: stats.dues.length })}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {stats.overdue.length > 0 && (
                <Section title={t('Overdue orders')} icon={<TriangleAlert className="h-5 w-5" />} count={stats.overdue.length} href="/delivery" tone="red">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {stats.overdue.slice(0, 6).map((o) => (
                      <OrderCard key={o.id} order={o} href={`/orders/${o.id}`} className="border-red-200 bg-red-50/40" />
                    ))}
                  </div>
                </Section>
              )}

              <Section title={t('Deliveries: today + this week')} icon={<CalendarClock className="h-5 w-5" />} count={stats.week.length} href="/delivery">
                {stats.week.length ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {stats.week.slice(0, 8).map((o) => (
                      <OrderCard key={o.id} order={o} href={`/orders/${o.id}`} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={t('No deliveries this week')} className="py-8" />
                  </Card>
                )}
              </Section>

              <Section title={t('Ready, not delivered')} icon={<CircleCheckBig className="h-5 w-5" />} count={stats.ready.length} href="/board">
                {stats.ready.length ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {stats.ready.slice(0, 6).map((o) => (
                      <OrderCard key={o.id} order={o} href={`/orders/${o.id}`} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <EmptyState icon={<CircleCheckBig className="h-6 w-6" />} title={t('No orders ready yet')} className="py-8" />
                  </Card>
                )}
              </Section>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> {t('Highest dues')}
                    </span>
                  }
                  action={
                    <Link href="/payments" className="text-sm font-medium text-wood-700">
                      {t('Payments')}
                    </Link>
                  }
                />
                {stats.topDues.length ? (
                  <ul className="divide-y divide-wood-50">
                    {stats.topDues.map((f) => (
                      <li key={f.id}>
                        <Link href={`/orders/${f.orderId}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-wood-50/60">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-wood-950">{f.customerName}</span>
                            <span className="block text-xs text-wood-600">{f.orderNo}</span>
                          </span>
                          <span className="text-sm font-semibold text-red-600">{money(f.balance)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-wood-600">{t('No pending payments')} 🎉</p>
                )}
              </Card>

              <Card className={stats.lowStock.length ? 'border-amber-200' : undefined}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <PackageMinus className="h-4 w-4" /> {t('Low stock')}
                      {stats.lowStock.length > 0 && <Badge tone="amber">{stats.lowStock.length}</Badge>}
                    </span>
                  }
                  action={
                    <Link href="/stock" className="text-sm font-medium text-wood-700">
                      {t('Stock')}
                    </Link>
                  }
                />
                {stats.lowStock.length ? (
                  <ul className="divide-y divide-wood-50">
                    {stats.lowStock.slice(0, 6).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                        <span className="min-w-0 truncate font-medium text-wood-950">{s.name}</span>
                        <span className="shrink-0 text-amber-700">
                          <span className="font-semibold">{num(s.qty)}</span> / {t('min')} {num(s.minQty)} {s.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-wood-600">{t('All stock levels are fine')}</p>
                )}
              </Card>

              <Card>
                <CardHeader
                  title={t('Recent payments')}
                  action={
                    stats.receivedToday > 0 ? <Badge tone="green">{t('Today')} {money(stats.receivedToday)}</Badge> : undefined
                  }
                />
                {payments.length ? (
                  <ul className="divide-y divide-wood-50">
                    {payments.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <Link href={`/orders/${p.orderId}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-wood-50/60">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-wood-950">{p.customerName}</span>
                            <span className="block text-xs text-wood-600">
                              {p.orderNo} · {fmtDate(p.date, 'dd MMM')} · {t(PAY_MODE_LABEL[p.mode] || p.mode)}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-emerald-700">+{money(p.amount)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-wood-600">{t('No payments yet')}</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
