'use client';

import { useRouteParam } from '@/lib/route-param';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, FileText, MessageCircle, Pencil, Phone, Printer, Trash2 } from 'lucide-react';
import { useData } from '@/lib/data';
import { tr, useT } from '@/lib/i18n';
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
  const t = useT();
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
        title={t('Order not found')}
        description={t('This order may have been deleted.')}
        action={<LinkButton href="/orders">{t('Go to orders')}</LinkButton>}
      />
    );

  const fin = finance[order.id];
  const delivered = isDelivered(order, settings);

  const onDelete = async () => {
    const ok = await confirm({
      title: t('Delete {no}?', { no: order.orderNo }),
      message: t('The order, its payments and labour entries will be removed from the list. You can restore them from Settings > Recycle bin.'),
      danger: true,
      confirmText: t('Delete'),
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteOrder(order, payments, labour);
      toast.success(t('Order deleted'));
      router.replace('/orders');
    } catch (e) {
      toast.error(errMsg(e));
      setDeleting(false);
    }
  };

  const greet = tr('Hello {name}, this is {workshop} - about your {item} ({no}).', {
    name: order.customerName,
    workshop: settings.name,
    item: tr(order.itemType),
    no: order.orderNo,
  });

  return (
    <div>
      <PageHeader
        back="/orders"
        title={
          <span>
            {order.orderNo} · {t(order.itemType)}
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
            <LinkButton href={`tel:${order.customerPhone}`} target="_self" variant="outline" size="icon" icon={<Phone className="h-4 w-4" aria-label={t('Call')} />} />
            <LinkButton
              href={waLink(order.customerPhone, greet)}
              variant="outline"
              size="icon"
              icon={<MessageCircle className="h-4 w-4 text-[#128C7E]" aria-label={t('WhatsApp')} />}
            />
            <LinkButton href={`/orders/${order.id}/edit`} variant="outline" icon={<Pencil className="h-4 w-4" />}>
              {t('Edit')}
            </LinkButton>
            <LinkButton href={`/print/bill/${order.id}`} variant="outline" icon={<Printer className="h-4 w-4" />}>
              {t('Bill')}
            </LinkButton>
            <LinkButton href={`/print/bill/${order.id}?type=estimate`} variant="outline" icon={<FileText className="h-4 w-4" />}>
              {t('Estimate')}
            </LinkButton>
            <Button variant="ghost" size="icon" aria-label={t('Delete order')} onClick={onDelete} loading={deleting}>
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
              <span className="text-wood-600">{t('Total {amount}', { amount: money(fin.price - (fin.discount || 0)) })} · </span>
              <span className={fin.balance > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>
                {fin.balance > 0 ? t('Due {amount}', { amount: money(fin.balance) }) : t('Fully paid')}
              </span>
            </span>
          )}
        </div>
        <ProgressBar value={order.progress} showLabel className="mt-3" />
        <a href="#stages" className="mt-2 inline-block text-xs font-medium text-wood-700 underline lg:hidden">
          {t('Change stage')}
        </a>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={t('Job details')} />
            <div className="p-4">
              <JobSpecs order={order} />
            </div>
          </Card>

          <Card>
            <CardHeader title={t('Design photos ({n})', { n: order.designPhotos?.length || 0 })} />
            <div className="p-4">
              {order.designPhotos?.length ? (
                <PhotoGrid
                  photos={order.designPhotos}
                  onRemove={async (i) => {
                    const ok = await confirm({ title: t('Delete design photo?'), danger: true, confirmText: t('Delete') });
                    if (!ok) return;
                    try {
                      await removePhoto(order, 'design', order.designPhotos[i]);
                      toast.success(t('Photo deleted'));
                    } catch (e) {
                      toast.error(errMsg(e));
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-wood-600">
                  {t('No design photos.')}{' '}
                  <Link href={`/orders/${order.id}/edit`} className="font-medium text-wood-700 underline">
                    {t('Edit to add')}
                  </Link>
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('Progress photos')} />
            <div className="p-4">
              <ProgressPhotos order={order} canDelete />
            </div>
          </Card>

          <PaymentsSection order={order} />
        </div>

        <div className="space-y-4">
          <div id="stages" className="scroll-mt-20">
            <Card>
              <CardHeader title={t('Work stage')} />
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
