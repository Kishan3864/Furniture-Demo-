'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import type { WorkshopSettings } from '@/lib/types';
import { useT } from '@/lib/i18n';
import { StoredImg } from '@/components/stored-image';

export function PrintToolbar({ title }: { title: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <div className="no-print -mx-1 mb-6 flex items-center justify-between gap-2 border-b border-wood-100 pb-4">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-wood-800 hover:bg-wood-100"
      >
        <ArrowLeft className="h-4 w-4" /> {t('Back')}
      </button>
      <span className="hidden text-sm text-wood-600 sm:inline">{title}</span>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-wood-700 px-4 text-sm font-medium text-white hover:bg-wood-800"
      >
        <Printer className="h-4 w-4" /> {t('Print / Save PDF')}
      </button>
    </div>
  );
}

export function WorkshopHeader({ settings, docTitle, docNo, docDate }: { settings: WorkshopSettings; docTitle: string; docNo: string; docDate: string }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
      <div className="flex min-w-0 items-start gap-3">
        {settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <StoredImg src={settings.logoUrl} alt="" className="h-16 w-16 shrink-0 object-contain" />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-tight">{settings.name}</h1>
          {settings.tagline && <p className="text-sm text-gray-700">{settings.tagline}</p>}
          {settings.address && <p className="mt-1 whitespace-pre-line text-xs text-gray-700">{settings.address}</p>}
          <p className="text-xs text-gray-700">
            {settings.phone && <>{t('Ph: {phone}', { phone: settings.phone })}</>}
            {settings.phone && settings.gst && ' · '}
            {settings.gst && <>GSTIN: {settings.gst.toUpperCase()}</>}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-bold tracking-wide">{docTitle}</p>
        <p className="text-sm">
          {t('No:')} <b>{docNo}</b>
        </p>
        <p className="text-sm">{t('Date: {date}', { date: docDate })}</p>
      </div>
    </div>
  );
}

export function SignatureBlock({ settings }: { settings: WorkshopSettings }) {
  const t = useT();
  return (
    <div className="mt-12 flex items-end justify-between gap-6 text-sm">
      <div className="text-center">
        <div className="mb-1 h-10 w-40 border-b border-black" />
        <p className="text-gray-700">{t('Customer signature')}</p>
      </div>
      <div className="text-center">
        <p className="mb-8 text-xs text-gray-700">{t('For {name}', { name: settings.name })}</p>
        <div className="mb-1 w-44 border-b border-black" />
        <p className="text-gray-700">{t('Authorised signature')}</p>
      </div>
    </div>
  );
}

/** `what` is an English key such as 'Order' or 'Payment'. */
export function PrintNotFound({ what }: { what: string }) {
  const t = useT();
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold">{t('{what} not found', { what: t(what) })}</p>
      <p className="mt-1 text-sm text-gray-600">{t('It may have been deleted.')}</p>
    </div>
  );
}
