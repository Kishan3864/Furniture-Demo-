'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Hammer } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { daysLeft } from '@/lib/utils';
import { EmptyState, PageHeader, PageLoader, Segmented } from '@/components/ui';
import { OrderCard } from '@/components/order-bits';

type Tab = 'active' | 'done';

export default function JobsPage() {
  const router = useRouter();
  const t = useT();
  const { isOwner, user } = useAuth();
  const { loading, orders, settings } = useData();
  const [tab, setTab] = useState<Tab>('active');
  const last = settings.stages.length - 1;

  useEffect(() => {
    if (isOwner) router.replace('/board');
  }, [isOwner, router]);

  const { active, done } = useMemo(() => {
    const a = orders
      .filter((o) => o.stageIndex < last)
      .sort((x, y) => (x.deliveryDate || '').localeCompare(y.deliveryDate || ''));
    const d = orders
      .filter((o) => o.stageIndex >= last)
      .sort((x, y) => (y.deliveredAt || 0) - (x.deliveredAt || 0));
    return { active: a, done: d };
  }, [orders, last]);

  if (isOwner || loading) return <PageLoader />;

  const overdue = active.filter((o) => (daysLeft(o.deliveryDate) ?? 0) < 0).length;
  const list = tab === 'active' ? active : done;

  return (
    <div>
      <PageHeader
        title={t('My Jobs')}
        subtitle={
          overdue
            ? t('Hello {name} · {n} active · {late} late', { name: user?.name || '', n: active.length, late: overdue })
            : t('Hello {name} · {n} active', { name: user?.name || '', n: active.length })
        }
      />
      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: t('Active ({n})', { n: active.length }) },
          { value: 'done', label: t('Done ({n})', { n: done.length }) },
        ]}
      />
      {list.length ? (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((o) => (
            <OrderCard key={o.id} order={o} href={`/jobs/${o.id}`} showKarigar={false} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Hammer className="h-6 w-6" />}
          title={tab === 'active' ? t('No jobs assigned yet') : t('No jobs completed yet')}
          description={tab === 'active' ? t('Jobs will show here when the owner assigns them to you.') : undefined}
        />
      )}
    </div>
  );
}
