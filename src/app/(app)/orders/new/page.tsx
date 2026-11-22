'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData } from '@/lib/data';
import { PageHeader, PageLoader } from '@/components/ui';
import OrderForm from '@/components/order-form';

function NewOrderInner() {
  const sp = useSearchParams();
  const { loading, customerById } = useData();
  const cid = sp.get('customer') || undefined;
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Naya Order" subtitle="Naap, design, lakdi aur advance - sab ek jagah" back="/orders" />
      <OrderForm initialCustomerId={cid && customerById[cid] ? cid : undefined} />
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
