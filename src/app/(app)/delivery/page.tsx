'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, List, MessageCircle, Phone, Truck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { setStage } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { cn, daysLeft, errMsg, fmtDate, money, naapText, toDateStr, todayStr, waLink } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  DeliveryBadge,
  EmptyState,
  PageHeader,
  PageLoader,
  PriorityBadge,
  ProgressBar,
  Segmented,
  useConfirm,
} from '@/components/ui';
import { statusMessage } from '@/components/order-bits';

type View = 'list' | 'calendar';
type Filter = 'overdue' | 'today' | 'week' | 'pending' | 'delivered';

function DeliveryRow({ order }: { order: Order }) {
  const t = useT();
  const { settings, finance } = useData();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const last = settings.stages.length - 1;
  const delivered = order.stageIndex >= last;
  const fin = finance[order.id];
  const overdue = !delivered && (daysLeft(order.deliveryDate) ?? 0) < 0;

  const markDelivered = async () => {
    const ok = await confirm({
      title: t('Mark as delivered?'),
      message: (
        <span>
          {order.orderNo} · {t(order.itemType)} - {order.customerName}
          {fin && fin.balance > 0 ? (
            <span className="mt-2 block font-semibold text-red-600">{t('Note: {amount} is still due.', { amount: money(fin.balance) })}</span>
          ) : null}
        </span>
      ),
      confirmText: t('Yes, delivered'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      await setStage(order, last, settings, user?.name);
      toast.success(t('{no} delivered', { no: order.orderNo }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn('p-3.5', overdue && 'border-red-200 bg-red-50/40')}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/orders/${order.id}`} className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-wood-600">
            {order.orderNo} · {fmtDate(order.deliveryDate, 'EEE, dd MMM')}
          </p>
          <p className="truncate font-semibold text-wood-950">
            {t(order.itemType)}
            {order.quantity > 1 ? ` x${order.quantity}` : ''}
            {order.title ? <span className="font-normal text-wood-700"> · {order.title}</span> : null}
          </p>
          <p className="truncate text-sm text-wood-700">
            {order.customerName}
            {order.customerAddress ? ` · ${order.customerAddress}` : ''}
          </p>
          <p className="text-xs text-wood-500">{t('Size: {size}', { size: naapText(order.naap) })}</p>
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <DeliveryBadge date={order.deliveryDate} delivered={delivered} />
          <PriorityBadge priority={order.priority} />
          {fin && fin.balance > 0 && <Badge tone="red">{t('Due {amount}', { amount: money(fin.balance) })}</Badge>}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-wood-700">
        <span className="font-medium">{t(order.stage)}</span>
      </div>
      <ProgressBar value={order.progress} showLabel className="mt-1" />
      <div className="mt-3 flex flex-wrap gap-2">
        {!delivered && (
          <Button size="sm" variant="success" icon={<CheckCircle2 className="h-4 w-4" />} loading={busy} onClick={markDelivered}>
            {t('Delivered')}
          </Button>
        )}
        <a
          href={waLink(order.customerPhone, statusMessage(order, settings))}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-medium text-white hover:brightness-95"
        >
          <MessageCircle className="h-4 w-4" /> {t('WhatsApp')}
        </a>
        <a
          href={`tel:${order.customerPhone}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-wood-200 bg-white px-3 text-sm font-medium text-wood-900 hover:bg-wood-50"
        >
          <Phone className="h-4 w-4" /> {t('Call')}
        </a>
      </div>
    </Card>
  );
}

export default function DeliveryPage() {
  const t = useT();
  const { loading, orders, settings } = useData();
  const [view, setView] = useState<View>('list');
  const [filter, setFilter] = useState<Filter>('pending');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string>(todayStr());
  const last = settings.stages.length - 1;

  const pending = useMemo(
    () =>
      orders
        .filter((o) => o.stageIndex < last)
        .sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999')),
    [orders, last],
  );
  const delivered = useMemo(
    () =>
      orders
        .filter((o) => o.stageIndex >= last)
        .sort((a, b) => (b.deliveredAt || 0) - (a.deliveredAt || 0) || (b.deliveryDate || '').localeCompare(a.deliveryDate || '')),
    [orders, last],
  );

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let week = 0;
    pending.forEach((o) => {
      const d = daysLeft(o.deliveryDate);
      if (d === null) return;
      if (d < 0) overdue++;
      if (d === 0) today++;
      if (d >= 0 && d <= 6) week++;
    });
    return { overdue, today, week };
  }, [pending]);

  const list = useMemo(() => {
    if (filter === 'delivered') return delivered.slice(0, 100);
    return pending.filter((o) => {
      const d = daysLeft(o.deliveryDate);
      if (filter === 'overdue') return d !== null && d < 0;
      if (filter === 'today') return d === 0;
      if (filter === 'week') return d !== null && d >= 0 && d <= 6;
      return true;
    });
  }, [filter, pending, delivered]);

  const byDate = useMemo(() => {
    const m: Record<string, Order[]> = {};
    orders.forEach((o) => {
      if (!o.deliveryDate) return;
      (m[o.deliveryDate] ||= []).push(o);
    });
    return m;
  }, [orders]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  if (loading) return <PageLoader />;

  const chips: { value: Filter; label: string; count?: number; tone?: string }[] = [
    { value: 'overdue', label: t('Overdue'), count: counts.overdue, tone: 'red' },
    { value: 'today', label: t('Today'), count: counts.today },
    { value: 'week', label: t('This week'), count: counts.week },
    { value: 'pending', label: t('All pending'), count: pending.length },
    { value: 'delivered', label: t('Delivered') },
  ];

  const selectedOrders = byDate[selected] || [];
  const today = todayStr();

  return (
    <div>
      <PageHeader
        title={t('Deliveries')}
        subtitle={t('{pending} pending · {overdue} overdue', { pending: pending.length, overdue: counts.overdue })}
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: <span className="flex items-center gap-1.5"><List className="h-4 w-4" /> {t('List')}</span> },
              { value: 'calendar', label: <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {t('Calendar')}</span> },
            ]}
          />
        }
      />

      {view === 'list' ? (
        <>
          <div className="scrollbar-thin -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {chips.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setFilter(c.value)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded border px-3.5 py-1.5 text-sm font-medium transition',
                  filter === c.value
                    ? c.tone === 'red'
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-wood-700 bg-wood-700 text-white'
                    : c.tone === 'red' && c.count
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-wood-200 bg-white text-wood-800',
                )}
              >
                {c.label}
                {c.count !== undefined && (
                  <span
                    className={cn(
                      'rounded px-1.5 text-xs',
                      filter === c.value ? 'bg-white/25' : 'bg-wood-100 text-wood-700',
                    )}
                  >
                    {c.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {list.length ? (
            <div className="grid gap-2.5 md:grid-cols-2">
              {list.map((o) => (
                <DeliveryRow key={o.id} order={o} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Truck className="h-6 w-6" />}
              title={filter === 'overdue' ? t('No overdue deliveries') : t('Nothing in this list')}
              description={filter === 'overdue' ? t('Great! Everything is on time.') : undefined}
            />
          )}
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="p-3 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <Button variant="ghost" size="icon" aria-label={t('Previous month')} onClick={() => setMonth((m) => addMonths(m, -1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <button
                type="button"
                className="font-semibold text-wood-950"
                onClick={() => {
                  setMonth(startOfMonth(new Date()));
                  setSelected(todayStr());
                }}
                title={t('Go to today')}
              >
                {format(month, 'MMMM yyyy')}
              </button>
              <Button variant="ghost" size="icon" aria-label={t('Next month')} onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-wood-500">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="truncate py-1">
                  {t(d)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = toDateStr(day);
                const items = byDate[key] || [];
                const inMonth = isSameMonth(day, month);
                const isSel = key === selected;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    className={cn(
                      'flex min-h-[64px] flex-col rounded-xl border p-1 text-left transition sm:min-h-[84px]',
                      isSel ? 'border-wood-600 ring-2 ring-wood-300' : 'border-wood-100',
                      inMonth ? 'bg-white' : 'bg-wood-50/50 text-wood-400',
                    )}
                  >
                    <span
                      className={cn(
                        'mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                        isToday(day) ? 'bg-wood-700 text-white' : '',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="space-y-0.5">
                      {items.slice(0, 2).map((o) => {
                        const done = o.stageIndex >= last;
                        const late = !done && key < today;
                        return (
                          <span
                            key={o.id}
                            className={cn(
                              'block truncate rounded px-1 text-[10px] font-medium leading-4',
                              done ? 'bg-emerald-100 text-emerald-800' : late ? 'bg-red-100 text-red-700' : 'bg-wood-100 text-wood-800',
                            )}
                          >
                            <span className="hidden sm:inline">{t(o.itemType)} · </span>
                            {o.customerName.split(' ')[0]}
                          </span>
                        );
                      })}
                      {items.length > 2 && <span className="block text-[10px] font-semibold text-wood-600">+{items.length - 2}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-wood-600">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-wood-200" /> {t('Pending')}</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-200" /> {t('Overdue')}</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-200" /> {t('Delivered')}</span>
            </div>
          </Card>
          <div className="lg:col-span-2">
            <h2 className="mb-2 font-semibold text-wood-900">
              {fmtDate(selected, 'EEEE, dd MMM yyyy')}{' '}
              <Badge tone="wood" className="ml-1">
                {selectedOrders.length}
              </Badge>
            </h2>
            {selectedOrders.length ? (
              <div className="space-y-2.5">
                {selectedOrders.map((o) => (
                  <DeliveryRow key={o.id} order={o} />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState icon={<CalendarDays className="h-6 w-6" />} title={t('No deliveries on this day')} />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
