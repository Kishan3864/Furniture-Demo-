'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, CalendarClock, Hammer, LayoutGrid, List, PackageCheck, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { setStage } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { cn, daysLeft, errMsg } from '@/lib/utils';
import {
  Badge,
  Button,
  DeliveryBadge,
  EmptyState,
  LinkButton,
  PageHeader,
  PageLoader,
  PriorityBadge,
  ProgressBar,
  SearchInput,
  Segmented,
  useConfirm,
} from '@/components/ui';
import { OrderCard, useKarigarNames } from '@/components/order-bits';
import { HScroll } from '@/components/hscroll';

type GroupBy = 'stage' | 'karigar';
type View = 'board' | 'list';
type QuickFilter = 'all' | 'overdue' | 'week' | 'ready' | 'urgent';

interface Group {
  key: string;
  title: string;
  /** small text under the title (stage % or worker skill) */
  meta?: string;
  /** Tailwind bg class for the top accent bar */
  accent: string;
  orders: Order[];
}

/** Colour for a stage based on its progress percent. */
function stageAccent(pct: number) {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-sky-500';
  if (pct >= 40) return 'bg-wood-500';
  if (pct >= 20) return 'bg-amber-500';
  return 'bg-orange-400';
}

function NextStageButton({ order, className }: { order: Order; className?: string }) {
  const t = useT();
  const { settings } = useData();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const nextIdx = order.stageIndex + 1;
  const next = settings.stages[nextIdx];
  if (!next) return null;
  const isLast = nextIdx === settings.stages.length - 1;
  return (
    <Button
      size="sm"
      variant={isLast ? 'success' : 'secondary'}
      className={cn('w-full', className)}
      loading={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLast) {
          const ok = await confirm({
            title: t('Mark as delivered?'),
            message: t('Has {no} been delivered?', { no: order.orderNo }),
            confirmText: t('Yes, delivered'),
          });
          if (!ok) return;
        }
        setBusy(true);
        try {
          await setStage(order, nextIdx, settings, user?.name);
          toast.success(t('{no} moved to {stage}', { no: order.orderNo, stage: t(next.name) }));
        } catch (err) {
          toast.error(errMsg(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {t('Next: {stage}', { stage: t(next.name) })} <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}

function BoardCard({ order, groupBy }: { order: Order; groupBy: GroupBy }) {
  const t = useT();
  const router = useRouter();
  const { settings } = useData();
  const names = useKarigarNames();
  const d = daysLeft(order.deliveryDate);
  const overdue = d !== null && d < 0;
  const workers = names(order.karigarIds);
  const open = () => router.push(`/orders/${order.id}`);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      className={cn(
        'block cursor-pointer rounded-md border border-wood-100 bg-white p-3 shadow-sm transition hover:border-wood-300 hover:shadow',
        overdue && 'border-l-4 border-l-red-500',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-wood-600">{order.orderNo}</span>
        <div className="flex flex-wrap justify-end gap-1">
          <PriorityBadge priority={order.priority} />
          <DeliveryBadge date={order.deliveryDate} delivered={order.stageIndex >= settings.stages.length - 1} />
        </div>
      </div>
      <p className="mt-1 truncate font-semibold text-wood-950">
        {t(order.itemType)}
        {order.quantity > 1 ? ` × ${order.quantity}` : ''}
        {order.title ? <span className="font-normal text-wood-700"> · {order.title}</span> : null}
      </p>
      <p className="truncate text-sm text-wood-700">{order.customerName}</p>
      {groupBy === 'stage' ? (
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-wood-600">
          <UserRound className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{workers || t('No worker')}</span>
        </p>
      ) : (
        <p className="mt-1 truncate text-xs font-medium text-wood-700">{t(order.stage)}</p>
      )}
      <ProgressBar value={order.progress} showLabel className="mt-2" />
      <NextStageButton order={order} className="mt-2.5" />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: 'wood' | 'red' | 'amber' | 'green';
  active: boolean;
  onClick: () => void;
}) {
  const toneCls = {
    wood: 'text-wood-700 bg-wood-100',
    red: 'text-red-600 bg-red-100',
    amber: 'text-amber-700 bg-amber-100',
    green: 'text-emerald-700 bg-emerald-100',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-md border bg-white p-3 text-left shadow-sm transition hover:border-wood-300',
        active ? 'border-wood-600 ring-1 ring-wood-600' : 'border-wood-100',
      )}
    >
      <span className={cn('rounded p-2', toneCls)}>{icon}</span>
      <span className="min-w-0">
        <span className={cn('block text-xl font-bold leading-tight', tone === 'red' && value > 0 ? 'text-red-600' : 'text-wood-950')}>
          {value}
        </span>
        <span className="block truncate text-xs font-medium text-wood-600">{label}</span>
      </span>
    </button>
  );
}

export default function BoardPage() {
  const t = useT();
  const { loading, orders, settings, karigars, karigarById } = useData();
  const [groupBy, setGroupBy] = useState<GroupBy>('stage');
  const [view, setView] = useState<View>('board');
  const [q, setQ] = useState('');
  const [quick, setQuick] = useState<QuickFilter>('all');
  const last = settings.stages.length - 1;

  const active = useMemo(
    () =>
      orders
        .filter((o) => o.stageIndex < last)
        .sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || '')),
    [orders, last],
  );

  const counts = useMemo(() => {
    let overdue = 0;
    let week = 0;
    let ready = 0;
    for (const o of active) {
      const d = daysLeft(o.deliveryDate);
      if (d !== null && d < 0) overdue++;
      if (d !== null && d >= 0 && d <= 7) week++;
      if (o.stageIndex === last - 1) ready++;
    }
    return { overdue, week, ready };
  }, [active, last]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    return active.filter((o) => {
      const d = daysLeft(o.deliveryDate);
      if (quick === 'overdue' && !(d !== null && d < 0)) return false;
      if (quick === 'week' && !(d !== null && d >= 0 && d <= 7)) return false;
      if (quick === 'ready' && o.stageIndex !== last - 1) return false;
      if (quick === 'urgent' && o.priority !== 'urgent' && o.priority !== 'high') return false;
      if (!s) return true;
      return (
        o.orderNo.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s) ||
        o.itemType.toLowerCase().includes(s) ||
        t(o.itemType).toLowerCase().includes(s) ||
        (o.title || '').toLowerCase().includes(s) ||
        (digits.length >= 3 && o.customerPhone.replace(/\D/g, '').includes(digits))
      );
    });
  }, [active, q, quick, last, t]);

  const groups = useMemo<Group[]>(() => {
    if (groupBy === 'stage') {
      return settings.stages.slice(0, last).map((s, i) => ({
        key: `s${i}`,
        title: t(s.name),
        meta: `${s.percent}%`,
        accent: stageAccent(s.percent),
        orders: filtered.filter((o) => o.stageIndex === i),
      }));
    }
    const list: Group[] = karigars
      .map((k) => ({
        key: k.id,
        title: k.name,
        meta: k.skill ? t(k.skill) : undefined,
        accent: 'bg-wood-600',
        orders: filtered.filter((o) => o.karigarIds?.includes(k.id)),
      }))
      .filter((g) => g.orders.length || karigarById[g.key]?.active);
    const unassigned = filtered.filter((o) => !o.karigarIds?.length || o.karigarIds.every((id) => !karigarById[id]));
    list.push({ key: '__none__', title: t('No worker'), accent: 'bg-gray-400', orders: unassigned });
    return list;
  }, [groupBy, settings.stages, last, filtered, karigars, karigarById, t]);

  if (loading) return <PageLoader />;

  const toggleQuick = (f: QuickFilter) => setQuick((cur) => (cur === f ? 'all' : f));
  const filtering = quick !== 'all' || q.trim() !== '';

  return (
    <div>
      <PageHeader
        title={t('Work Progress')}
        subtitle={active.length === 1 ? t('1 job in progress') : t('{n} jobs in progress', { n: active.length })}
      />

      {active.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryTile
            label={t('Active jobs')}
            value={active.length}
            icon={<Hammer className="h-4 w-4" />}
            tone="wood"
            active={quick === 'all'}
            onClick={() => setQuick('all')}
          />
          <SummaryTile
            label={t('Overdue')}
            value={counts.overdue}
            icon={<AlertTriangle className="h-4 w-4" />}
            tone="red"
            active={quick === 'overdue'}
            onClick={() => toggleQuick('overdue')}
          />
          <SummaryTile
            label={t('Ready')}
            value={counts.ready}
            icon={<PackageCheck className="h-4 w-4" />}
            tone="green"
            active={quick === 'ready'}
            onClick={() => toggleQuick('ready')}
          />
          <SummaryTile
            label={t('Due this week')}
            value={counts.week}
            icon={<CalendarClock className="h-4 w-4" />}
            tone="amber"
            active={quick === 'week'}
            onClick={() => toggleQuick('week')}
          />
        </div>
      )}

      {active.length > 0 && (
        <div data-tour="board-controls" className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} placeholder={t('Search jobs...')} className="sm:max-w-xs sm:flex-1" />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <span className="text-xs font-medium text-wood-600">{t('Group by')}</span>
            <Segmented
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: 'stage', label: t('Stage') },
                { value: 'karigar', label: t('Worker') },
              ]}
            />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                {
                  value: 'board',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <LayoutGrid className="h-4 w-4" aria-hidden /> {t('Board')}
                    </span>
                  ),
                },
                {
                  value: 'list',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <List className="h-4 w-4" aria-hidden /> {t('List')}
                    </span>
                  ),
                },
              ]}
            />
            <Button
              size="sm"
              variant={quick === 'urgent' ? 'primary' : 'outline'}
              onClick={() => toggleQuick('urgent')}
              aria-pressed={quick === 'urgent'}
            >
              {t('Urgent / High')}
            </Button>
          </div>
        </div>
      )}

      {!active.length ? (
        <EmptyState
          icon={<Hammer className="h-6 w-6" />}
          title={t('No jobs in progress')}
          description={t('New orders will show up here.')}
          action={<LinkButton href="/orders/new">{t('New Order')}</LinkButton>}
        />
      ) : !filtered.length ? (
        <EmptyState
          title={t('No jobs match your search or filter')}
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setQ('');
                  setQuick('all');
                }}
              >
                {t('Clear filter')}
              </Button>
            ) : undefined
          }
        />
      ) : view === 'board' ? (
        <HScroll
          data-tour="board"
          itemCount={groups.length}
          ariaLabel={t('Work Progress')}
          label={groupBy === 'stage' ? t('Stages') : t('Workers')}
          className="-mx-4 px-4 lg:mx-0 lg:px-0"
        >
          {groups.map((g) => (
            <section
              key={g.key}
              className="flex w-[85vw] max-w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-md border border-wood-100 bg-wood-50 sm:w-[300px]"
            >
              <div className={cn('h-1.5 w-full', g.accent)} />
              <header className="flex items-center justify-between gap-2 border-b border-wood-100 bg-white px-3 py-2.5">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-wood-950">{g.title}</h2>
                  {g.meta && <p className="truncate text-xs text-wood-600">{g.meta}</p>}
                </div>
                <Badge tone={g.orders.length ? 'wood' : 'gray'}>{g.orders.length}</Badge>
              </header>
              <div className="space-y-2.5 p-2.5 md:max-h-[calc(100vh-330px)] md:min-h-[160px] md:overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-wood-200 [&::-webkit-scrollbar]:w-1.5">
                {g.orders.length ? (
                  g.orders.map((o) => <BoardCard key={o.id} order={o} groupBy={groupBy} />)
                ) : (
                  <p className="rounded border border-dashed border-wood-200 bg-white/60 p-5 text-center text-xs text-wood-500">
                    {t('No jobs here')}
                  </p>
                )}
              </div>
            </section>
          ))}
        </HScroll>
      ) : (
        <div data-tour="board" className="space-y-6">
          {groups
            .filter((g) => g.orders.length)
            .map((g) => (
              <section key={g.key}>
                <div className="mb-2 flex items-center gap-2 border-b border-wood-100 pb-2">
                  <span className={cn('h-3 w-1.5 rounded-sm', g.accent)} aria-hidden />
                  <h2 className="font-semibold text-wood-900">{g.title}</h2>
                  {g.meta && <span className="text-xs text-wood-600">{g.meta}</span>}
                  <Badge tone="wood" className="ml-auto">
                    {g.orders.length}
                  </Badge>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.orders.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      href={`/orders/${o.id}`}
                      showKarigar={groupBy === 'stage'}
                      extra={<NextStageButton order={o} className="mt-2.5" />}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
