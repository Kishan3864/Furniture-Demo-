'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { ExternalLink, Ruler } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { addOrderSiteMedia, removeOrderSiteMedia } from '@/lib/actions';
import type { Order } from '@/lib/types';
import { errMsg } from '@/lib/utils';
import { Card, CardHeader, useConfirm } from './ui';
import { MediaGrid, MediaUploader } from './media';

/** Site photos + videos for an order (owner and assigned workers; only the owner can delete). */
export function OrderSiteMediaCard({ order, canDelete }: { order: Order; canDelete: boolean }) {
  const t = useT();
  const { user, isOwner } = useAuth();
  const confirm = useConfirm();
  const items = [...(order.siteMedia || [])].sort((a, b) => b.at - a.at);
  const photos = items.filter((m) => m.kind !== 'video').length;
  const videos = items.length - photos;

  return (
    <Card tour="order-site-media">
      <CardHeader
        title={t('Site photos & videos')}
        action={
          <span className="text-xs text-wood-600">
            {t('{p} photos · {v} videos', { p: photos, v: videos })}
          </span>
        }
      />
      <div className="space-y-3 p-4">
        {isOwner && order.siteId && (
          <Link
            href={`/sites/view?id=${order.siteId}`}
            className="flex items-center gap-2 rounded border border-wood-200 bg-wood-50 px-3 py-2 text-sm font-medium text-wood-800 hover:bg-wood-100"
          >
            <Ruler className="h-4 w-4" /> {t('Created from a site visit - open sizes')}
            <ExternalLink className="ml-auto h-4 w-4" />
          </Link>
        )}
        <MediaUploader
          folder={`orders/${order.id}/site`}
          by={user?.name}
          source="order"
          compact
          onUploaded={(list) => addOrderSiteMedia(order, list)}
        />
        <MediaGrid
          items={items}
          empty={<p className="rounded border border-dashed border-wood-200 p-4 text-center text-sm text-wood-600">{t('No site photos or videos yet')}</p>}
          onRemove={
            canDelete
              ? async (m) => {
                  const ok = await confirm({
                    title: m.kind === 'video' ? t('Delete this video?') : t('Delete this photo?'),
                    danger: true,
                    confirmText: t('Delete'),
                  });
                  if (!ok) return;
                  try {
                    await removeOrderSiteMedia(order, m);
                    toast.success(t('Deleted'));
                  } catch (e) {
                    toast.error(errMsg(e));
                  }
                }
              : undefined
          }
        />
      </div>
    </Card>
  );
}
