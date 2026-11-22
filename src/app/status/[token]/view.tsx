'use client';

import { useRouteParam } from '@/lib/route-param';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { CalendarDays, Check, Phone } from 'lucide-react';
import { db, firebaseConfigured } from '@/lib/firebase';
import type { StatusDoc } from '@/lib/types';
import { cn, daysLeft, fmtDate, fmtDateTime, money } from '@/lib/utils';
import { PageLoader, PhotoGrid, ProgressBar } from '@/components/ui';
import { StoredImg } from '@/components/stored-image';
import { LanguageSwitch } from '@/components/language-switch';
import { useT } from '@/lib/i18n';

export default function StatusPage() {
  const params = { token: useRouteParam('token', 2) };
  const token = params?.token;
  const [data, setData] = useState<StatusDoc | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const t = useT();

  useEffect(() => {
    if (!firebaseConfigured) {
      setState('missing');
      return;
    }
    if (!token) return; // token is read from the URL right after mount
    setState('loading');
    getDoc(doc(db(), 'status', token))
      .then((s) => {
        if (s.exists()) {
          setData(s.data() as StatusDoc);
          setState('ok');
        } else setState('missing');
      })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') return <PageLoader />;
  if (state !== 'ok' || !data)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-bold text-wood-950">{t('Status link not found')}</p>
          <p className="mt-1 text-sm text-wood-600">
            {state === 'error' ? t('Please check your internet and try again.') : t('This link may be old or wrong. Please ask the workshop for a new link.')}
          </p>
        </div>
      </div>
    );

  const delivered = data.stageIndex >= data.stages.length - 1;
  const d = daysLeft(data.deliveryDate);
  const photos = [...(data.photos || [])].sort((a, b) => b.at - a.at);

  return (
    <div className="min-h-screen bg-gradient-to-b from-wood-100 to-cream-100">
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-3 flex justify-end">
          <LanguageSwitch />
        </div>
        <header className="mb-5 flex items-center gap-3">
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <StoredImg src={data.logoUrl} alt="" className="h-12 w-12 rounded-xl bg-white object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-wood-600 to-wood-800 font-extrabold text-cream-50">
              {data.workshopName?.slice(0, 2).toUpperCase() || 'WB'}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-wood-950">{data.workshopName}</p>
            {data.workshopPhone && (
              <a href={`tel:${data.workshopPhone}`} className="inline-flex items-center gap-1 text-sm text-wood-700">
                <Phone className="h-3.5 w-3.5" /> {data.workshopPhone}
              </a>
            )}
          </div>
        </header>

        <section className="rounded-3xl border border-wood-100 bg-white p-5 shadow-soft">
          <p className="text-sm text-wood-600">{t('Hello {name}', { name: data.customerName })}</p>
          <h1 className="mt-1 text-2xl font-bold text-wood-950">
            {t(data.itemType)}
            {data.quantity > 1 ? ` x${data.quantity}` : ''}
          </h1>
          {data.title && <p className="text-wood-700">{data.title}</p>}
          <p className="mt-1 text-xs text-wood-500">{t('Order {no}', { no: data.orderNo })}</p>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-wood-500">{t('Current stage')}</p>
              <p className={cn('text-xl font-bold', delivered ? 'text-emerald-700' : 'text-wood-800')}>{t(data.stage)}</p>
            </div>
            <p className="text-3xl font-extrabold text-wood-900">{data.progress}%</p>
          </div>
          <ProgressBar value={data.progress} className="mt-2" />

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-wood-50 p-3">
            <CalendarDays className="h-5 w-5 text-wood-600" />
            <div className="flex-1">
              <p className="text-xs text-wood-600">{delivered ? t('Delivered') : t('Delivery date')}</p>
              <p className="font-semibold text-wood-950">{fmtDate(data.deliveryDate, 'EEEE, dd MMM yyyy')}</p>
            </div>
            {!delivered && d !== null && d >= 0 && (
              <span className="rounded-full bg-wood-700 px-3 py-1 text-xs font-bold text-white">{d === 0 ? t('Today') : t('{n} DAYS', { n: d })}</span>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-wood-100 bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-semibold text-wood-950">{t('Work progress')}</h2>
          <ol className="relative space-y-3 border-l-2 border-wood-100 pl-5">
            {data.stages.map((s, i) => {
              const done = i < data.stageIndex || delivered;
              const current = i === data.stageIndex && !delivered;
              return (
                <li key={s.name + i} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[29px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2',
                      done ? 'border-emerald-500 bg-emerald-500 text-white' : current ? 'border-wood-700 bg-wood-700' : 'border-wood-200 bg-white',
                    )}
                  >
                    {done && <Check className="h-3 w-3" />}
                  </span>
                  <p className={cn('text-sm', current ? 'font-bold text-wood-950' : done ? 'text-wood-800' : 'text-wood-400')}>
                    {t(s.name)}
                    {current && <span className="ml-2 rounded-full bg-wood-100 px-2 py-0.5 text-[10px] font-semibold text-wood-800">{t('NOW')}</span>}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {photos.length > 0 && (
          <section className="mt-4 rounded-3xl border border-wood-100 bg-white p-5 shadow-soft">
            <h2 className="mb-3 font-semibold text-wood-950">{t('Photos ({n})', { n: photos.length })}</h2>
            <PhotoGrid photos={photos} className="grid-cols-2 sm:grid-cols-3" />
          </section>
        )}

        {data.showPrice && data.price !== null && data.price !== undefined && (
          <section className="mt-4 grid grid-cols-3 gap-2 rounded-3xl border border-wood-100 bg-white p-5 text-center shadow-soft">
            <div>
              <p className="text-[11px] uppercase text-wood-500">{t('Total')}</p>
              <p className="font-bold">{money(data.price)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-wood-500">{t('Paid')}</p>
              <p className="font-bold text-emerald-700">{money(data.paid)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-wood-500">{t('Balance')}</p>
              <p className="font-bold text-red-600">{money(data.balance)}</p>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-wood-500">
          {t('Last updated: {time}', { time: fmtDateTime(data.updatedAt) })} · Powered by WoodBook
        </p>
      </div>
    </div>
  );
}
