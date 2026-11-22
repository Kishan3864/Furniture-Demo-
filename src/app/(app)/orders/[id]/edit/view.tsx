'use client';

import { useRouteParam } from '@/lib/route-param';

import { ClipboardList } from 'lucide-react';
import { useData } from '@/lib/data';
import { EmptyState, LinkButton, PageHeader, PageLoader } from '@/components/ui';
import OrderForm from '@/components/order-form';

export default function EditOrderPage() {
  const id = useRouteParam('id', 2);
  const { loading, orderById } = useData();
  const order = orderById[id];

  if (loading) return <PageLoader />;
  if (!order)
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" />}
        title="Order nahi mila"
        description="Ho sakta hai yeh order delete ho gaya ho."
        action={<LinkButton href="/orders">Orders par jayein</LinkButton>}
      />
    );

  return (
    <div>
      <PageHeader title={`Edit ${order.orderNo}`} subtitle={`${order.itemType} · ${order.customerName}`} back={`/orders/${order.id}`} />
      <OrderForm key={order.id} order={order} />
    </div>
  );
}
