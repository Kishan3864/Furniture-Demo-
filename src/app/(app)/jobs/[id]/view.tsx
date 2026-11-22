'use client';

import { useRouteParam } from '@/lib/route-param';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Hammer, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import {
  Card,
  CardHeader,
  DeliveryBadge,
  EmptyState,
  LinkButton,
  PageHeader,
  PageLoader,
  PhotoGrid,
  PriorityBadge,
} from '@/components/ui';
import { JobSpecs, ProgressPhotos, StageBadge, StageStepper, isDelivered } from '@/components/order-bits';

/** Karigar job view - deliberately shows no prices or payments. */
export default function JobDetailPage() {
  const id = useRouteParam('id', 2);
  const router = useRouter();
  const { isOwner } = useAuth();
  const { loading, orderById, settings } = useData();
  const order = orderById[id];

  useEffect(() => {
    if (isOwner) router.replace(`/orders/${id}`);
  }, [isOwner, id, router]);

  if (isOwner || loading) return <PageLoader />;
  if (!order)
    return (
      <EmptyState
        icon={<Hammer className="h-6 w-6" />}
        title="Kaam nahi mila"
        description="Yeh kaam aapko assign nahi hai ya hata diya gaya hai."
        action={<LinkButton href="/jobs">Mera Kaam</LinkButton>}
      />
    );

  const delivered = isDelivered(order, settings);

  return (
    <div>
      <PageHeader
        back="/jobs"
        title={`${order.orderNo} · ${order.itemType}${order.quantity > 1 ? ` x${order.quantity}` : ''}`}
        subtitle={order.title || order.customerName}
      />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge order={order} />
          <DeliveryBadge date={order.deliveryDate} delivered={delivered} />
          <PriorityBadge priority={order.priority} />
        </div>
        <p className="mt-2 text-sm text-wood-800">
          <span className="font-semibold">{order.customerName}</span>
        </p>
        {order.customerAddress && (
          <p className="mt-0.5 flex items-start gap-1 text-sm text-wood-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {order.customerAddress}
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Kaam ki details" />
            <div className="p-4">
              <JobSpecs order={order} />
            </div>
          </Card>
          <Card>
            <CardHeader title={`Design photos (${order.designPhotos?.length || 0})`} />
            <div className="p-4">
              {order.designPhotos?.length ? (
                <PhotoGrid photos={order.designPhotos} />
              ) : (
                <p className="text-sm text-wood-600">Koi design photo nahi</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Progress photos" />
            <div className="p-4">
              <ProgressPhotos order={order} canDelete={false} />
            </div>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader title="Stage update karein" />
            <div className="p-4">
              <StageStepper order={order} editable />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
