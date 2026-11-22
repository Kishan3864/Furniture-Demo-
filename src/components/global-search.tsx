'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Search, Users, X } from 'lucide-react';
import { useData } from '@/lib/data';
import { money } from '@/lib/utils';
import { Badge, DeliveryBadge } from './ui';
import { useT } from '@/lib/i18n';

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { customers, orders, finance, settings } = useData();
  const router = useRouter();
  const [q, setQ] = useState('');
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return { c: [], o: orders.slice(0, 6) };
    const digits = s.replace(/\D/g, '');
    const c = customers
      .filter(
        (x) =>
          x.name.toLowerCase().includes(s) ||
          (digits.length >= 3 && x.phone.replace(/\D/g, '').includes(digits)),
      )
      .slice(0, 6);
    const o = orders
      .filter(
        (x) =>
          x.orderNo.toLowerCase().includes(s) ||
          x.orderNo.replace(/\D/g, '').replace(/^0+/, '') === digits.replace(/^0+/, '') ||
          x.customerName.toLowerCase().includes(s) ||
          x.itemType.toLowerCase().includes(s) ||
          (x.title || '').toLowerCase().includes(s) ||
          (digits.length >= 3 && x.customerPhone.replace(/\D/g, '').includes(digits)),
      )
      .slice(0, 10);
    return { c, o };
  }, [q, customers, orders]);

  if (!open) return null;
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const lastIdx = settings.stages.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-3 pt-[8vh]">
      <div className="absolute inset-0 bg-wood-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-cream-50 shadow-xl">
        <div className="flex items-center gap-2 border-b border-wood-100 px-4">
          <Search className="h-5 w-5 text-wood-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Name, phone, order no. (WB-0012) or item...')}
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-wood-400"
          />
          <button onClick={onClose} className="rounded-lg p-1.5 text-wood-600 hover:bg-wood-100" aria-label={t('Close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {results.c.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-wood-500">{t('Customers')}</p>
              {results.c.map((c) => (
                <button
                  key={c.id}
                  onClick={() => go(`/customers/${c.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-wood-100"
                >
                  <Users className="h-4 w-4 shrink-0 text-wood-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-wood-950">{c.name}</p>
                    <p className="truncate text-xs text-wood-600">{c.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results.o.length > 0 && (
            <div>
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-wood-500">
                {q ? t('Orders') : t('Recent orders')}
              </p>
              {results.o.map((o) => (
                <button
                  key={o.id}
                  onClick={() => go(`/orders/${o.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-wood-100"
                >
                  <ClipboardList className="h-4 w-4 shrink-0 text-wood-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-wood-950">
                      {o.orderNo} · {t(o.itemType)}
                      {o.title ? ` - ${o.title}` : ''}
                    </p>
                    <p className="truncate text-xs text-wood-600">
                      {o.customerName} · {t(o.stage)}
                      {finance[o.id]?.balance ? ` · ${t('Due {amount}', { amount: money(finance[o.id].balance) })}` : ''}
                    </p>
                  </div>
                  <DeliveryBadge date={o.deliveryDate} delivered={o.stageIndex >= lastIdx} />
                </button>
              ))}
            </div>
          )}
          {q && !results.c.length && !results.o.length && (
            <div className="px-3 py-10 text-center text-sm text-wood-600">
              {t('Nothing found for "{q}"', { q })} <Badge className="ml-1">{t('Try a phone number')}</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
