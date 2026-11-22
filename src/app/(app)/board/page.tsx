'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Hammer, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { setStage } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { errMsg } from '@/lib/utils';
import { Badge, Button, EmptyState, LinkButton, PageHeader, PageLoader, Segmented, useConfirm } from '@/components/ui';
import { OrderCard } from '@/components/order-bits';

type GroupBy = 'stage' | 'karigar';
type View = 'board' | 'list';

interface Group {
  key: string;
  title: string;
  orders: Order[];
}

function NextStageButton({ order }: { order: Order }) {
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
      className="mt-2.5 w-full"
      loading={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLast) {
          const ok = await confirm({ title: 'Delivered mark karein?', message: `${order.orderNo} delivered ho gaya?`, confirmText: 'Haan, delivered' });
          if (!ok) return;
        }
        setBusy(true);
        try {
          await setStage(order, nextIdx, settings, user?.name);
          toast.success(`${order.orderNo}: ${next.name}`);
        } catch (err) {
          toast.error(errMsg(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      Next: {next.name} <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function BoardPage() {
  const router = useRouter();
  const { loading, orders, settings, karigars, karigarById } = useData();
  const [groupBy, setGroupBy] = useState<GroupBy>('stage');
  const [view, setView] = useState<View>('board');
  const last = settings.stages.length - 1;

  const active = useMemo(
    () =>
      orders
        .filter((o) => o.stageIndex < last)
        .sort((a, b) => (a.deliveryDate || '').localeCompare(b.deliveryDate || '')),
    [orders, last],
  );

  const groups = useMemo<Group[]>(() => {
    if (groupBy === 'stage') {
      return settings.stages.slice(0, last).map((s, i) => ({
        key: `s${i}`,
        title: s.name,
        orders: active.filter((o) => o.stageIndex === i),
      }));
    }
    const list: Group[] = karigars
      .map((k) => ({ key: k.id, title: k.name, orders: active.filter((o) => o.karigarIds?.includes(k.id)) }))
      .filter((g) => g.orders.length || karigarById[g.key]?.active);
    const unassigned = active.filter((o) => !o.karigarIds?.length || o.karigarIds.every((id) => !karigarById[id]));
    list.push({ key: '__none__', title: 'Bina karigar', orders: unassigned });
    return list;
  }, [groupBy, settings.stages, last, active, karigars, karigarById]);

  if (loading) return <PageLoader />;

  const card = (o: Order) => (
    <div
      key={o.id}
      role="link"
      tabIndex={0}
      className="cursor-pointer"
      onClick={() => router.push(`/orders/${o.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/orders/${o.id}`)}
    >
      <OrderCard order={o} showKarigar={groupBy === 'stage'} extra={<NextStageButton order={o} />} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Kaam kahan tak"
        subtitle={`${active.length} kaam chal rahe hain`}
        actions={
          <>
            <Segmented
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: 'stage', label: 'Stage' },
                { value: 'karigar', label: 'Karigar' },
              ]}
            />
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'board', label: <LayoutGrid className="h-4 w-4" aria-label="Board" /> },
                { value: 'list', label: <List className="h-4 w-4" aria-label="List" /> },
              ]}
            />
          </>
        }
      />

      {!active.length ? (
        <EmptyState
          icon={<Hammer className="h-6 w-6" />}
          title="Abhi koi kaam chalu nahi"
          description="Naya order banate hi yahan dikhega."
          action={<LinkButton href="/orders/new">Naya Order</LinkButton>}
        />
      ) : view === 'board' ? (
        <div className="scrollbar-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4">
          {groups.map((g) => (
            <div key={g.key} className="w-[280px] shrink-0 snap-start rounded-2xl bg-wood-50/80 p-2.5 sm:w-[300px]">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="truncate font-semibold text-wood-900">{g.title}</p>
                <Badge tone={g.orders.length ? 'wood' : 'gray'}>{g.orders.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {g.orders.length ? (
                  g.orders.map(card)
                ) : (
                  <p className="rounded-xl border border-dashed border-wood-200 p-4 text-center text-xs text-wood-500">Khaali</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {groups
            .filter((g) => g.orders.length)
            .map((g) => (
              <section key={g.key}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="font-semibold text-wood-900">{g.title}</h2>
                  <Badge tone="wood">{g.orders.length}</Badge>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{g.orders.map(card)}</div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
