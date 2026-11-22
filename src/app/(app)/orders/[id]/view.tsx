'use client';

import { useRouteParam } from '@/lib/route-param';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, FileText, MessageCircle, Pencil, Phone, Printer, Trash2 } from 'lucide-react';
import { useData } from '@/lib/data';
import { deleteOrder, removePhoto } from '@/lib/actions';
import { errMsg, money, waLink } from '@/lib/utils';
import {
  Button,
  Card,
  CardHeader,
  DeliveryBadge,
  EmptyState,
  LinkButton,
  PageHeader,
  PageLoader,
  PhotoGrid,
  PriorityBadge,
  ProgressBar,
  useConfirm,
} from '@/components/ui';
import { JobSpecs, ProgressPhotos, StageBadge, StageStepper, isDelivered } from '@/components/order-bits';
import { LabourSection, MaterialSection, PaymentsSection, StatusSection } from '@/components/order-sections';

export default function OrderDetailPage() {
  const id = useRouteParam('id', 2);
  const router = useRouter();
  const confirm = useConfirm();
  const { loading, orderById, finance, payments, labour, settings } = useData();
  const [deleting, setDeleting] = useState(false);
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

  const fin = finance[order.id];
  const delivered = isDelivered(order, settings);

  const onDelete = async () => {
    const ok = await confirm({
      title: `${order.orderNo} delete karein?`,
      message: 'Order, uske payments aur labour entries list se hat jayenge. Settings > Recycle bin se wapas la sakte hain.',
      danger: true,
      confirmText: 'Delete',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteOrder(order, payments, labour);
      toast.success('Order delete ho gaya');
      router.replace('/orders');
    } catch (e) {
      toast.error(errMsg(e));
      setDeleting(false);
    }
  };

  const greet = `Namaste ${order.customerName} ji, ${settings.name} se baat kar rahe hain - aapke ${order.itemType} (${order.orderNo}) ke baare mein.`;

  return (
    <div>
      <PageHeader
        back="/orders"
        title={
          <span>
            {order.orderNo} · {order.itemType}
            {order.quantity > 1 ? ` x${order.quantity}` : ''}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <Link href={`/customers/${order.customerId}`} className="font-medium text-wood-800 underline-offset-2 hover:underline">
              {order.customerName}
            </Link>
            {order.title ? <span>· {order.title}</span> : null}
          </span>
        }
        actions={
          <>
            <LinkButton href={`tel:${order.customerPhone}`} target="_self" variant="outline" size="icon" icon={<Phone className="h-4 w-4" />} />
            <LinkButton
              href={waLink(order.customerPhone, greet)}
              variant="outline"
              size="icon"
              icon={<MessageCircle className="h-4 w-4 text-[#128C7E]" />}
            />
            <LinkButton href={`/orders/${order.id}/edit`} variant="outline" icon={<Pencil className="h-4 w-4" />}>
              Edit
            </LinkButton>
            <LinkButton href={`/print/bill/${order.id}`} variant="outline" icon={<Printer className="h-4 w-4" />}>
              Bill
            </LinkButton>
            <LinkButton href={`/print/bill/${order.id}?type=estimate`} variant="outline" icon={<FileText className="h-4 w-4" />}>
              Estimate
            </LinkButton>
            <Button variant="ghost" size="icon" aria-label="Delete order" onClick={onDelete} loading={deleting}>
              {!deleting && <Trash2 className="h-4 w-4 text-red-600" />}
            </Button>
          </>
        }
      />

      {/* Summary strip */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge order={order} />
          <DeliveryBadge date={order.deliveryDate} delivered={delivered} />
          <PriorityBadge priority={order.priority} />
          {fin && (
            <span className="ml-auto text-sm">
              <span className="text-wood-600">Total {money(fin.price - (fin.discount || 0))} · </span>
              <span className={fin.balance > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>
                {fin.balance > 0 ? `Baaki ${money(fin.balance)}` : 'Poora mila'}
              </span>
            </span>
          )}
        </div>
        <ProgressBar value={order.progress} showLabel className="mt-3" />
        <a href="#stages" className="mt-2 inline-block text-xs font-medium text-wood-700 underline lg:hidden">
          Stage badlein
        </a>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Job details" />
            <div className="p-4">
              <JobSpecs order={order} />
            </div>
          </Card>

          <Card>
            <CardHeader title={`Design photos (${order.designPhotos?.length || 0})`} />
            <div className="p-4">
              {order.designPhotos?.length ? (
                <PhotoGrid
                  photos={order.designPhotos}
                  onRemove={async (i) => {
                    const ok = await confirm({ title: 'Design photo delete karein?', danger: true, confirmText: 'Delete' });
                    if (!ok) return;
                    try {
                      await removePhoto(order, 'design', order.designPhotos[i]);
                      toast.success('Photo delete ho gayi');
                    } catch (e) {
                      toast.error(errMsg(e));
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-wood-600">
                  Koi design photo nahi.{' '}
                  <Link href={`/orders/${order.id}/edit`} className="font-medium text-wood-700 underline">
                    Edit karke jodein
                  </Link>
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Progress photos" />
            <div className="p-4">
              <ProgressPhotos order={order} canDelete />
            </div>
          </Card>

          <PaymentsSection order={order} />
        </div>

        <div className="space-y-4">
          <div id="stages" className="scroll-mt-20">
            <Card>
              <CardHeader title="Kaam ki stage" />
              <div className="p-4">
                <StageStepper order={order} editable />
              </div>
            </Card>
          </div>
          <StatusSection order={order} />
          <LabourSection order={order} />
          <MaterialSection order={order} />
        </div>
      </div>
    </div>
  );
}
