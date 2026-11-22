'use client';

import { useRouteParam } from '@/lib/route-param';

import { ClipboardList } from 'lucide-react';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { EmptyState, LinkButton, PageHeader, PageLoader } from '@/components/ui';
import OrderForm from '@/components/order-form';

export default function EditOrderPage() {
  const t = useT();
  const id = useRouteParam('id', 2);
  const { loading, orderById } = useData();
  const order = orderById[id];

  if (loading) return <PageLoader />;
  if (!order)
    return (
      <EmptyState
        icon={<ClipboardList className="h-6 w-6" />}
        title={t('Order not found')}
        description={t('This order may have been deleted.')}
        action={<LinkButton href="/orders">{t('Go to orders')}</LinkButton>}
      />
    );

  return (
    <div>
      <PageHeader
        title={t('Edit {no}', { no: order.orderNo })}
        subtitle={`${t(order.itemType)} · ${order.customerName}`}
        back={`/orders/${order.id}`}
      />
      <OrderForm key={order.id} order={order} />
    </div>
  );
}
