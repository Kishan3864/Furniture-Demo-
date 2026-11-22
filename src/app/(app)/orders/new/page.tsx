'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { PageHeader, PageLoader } from '@/components/ui';
import OrderForm from '@/components/order-form';

function NewOrderInner() {
  const t = useT();
  const sp = useSearchParams();
  const { loading, customerById, sites } = useData();
  const cid = sp.get('customer') || undefined;
  const siteId = sp.get('site') || '';
  const entryId = sp.get('entry') || '';
  const site = siteId ? sites.find((s) => s.id === siteId) : undefined;
  const entry = site && entryId ? (site.entries || []).find((e) => e.id === entryId) : undefined;
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title={t('New Order')} subtitle={t('Measurements, design, wood and advance - all in one place')} back="/orders" />
      <OrderForm
        key={site ? `${site.id}-${entry?.id || ''}` : 'new'}
        initialCustomerId={cid && customerById[cid] ? cid : undefined}
        fromSite={site ? { site, entry } : undefined}
      />
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewOrderInner />
    </Suspense>
  );
}
