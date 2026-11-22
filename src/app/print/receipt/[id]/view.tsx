'use client';

import { useRouteParam } from '@/lib/route-param';

import { useEffect, useMemo } from 'react';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { fmtDate, money, PAY_MODE_LABEL } from '@/lib/utils';
import { rupeesInWords } from '@/lib/words';
import { PrintNotFound, PrintToolbar, SignatureBlock, WorkshopHeader } from '../../print-bits';

export default function ReceiptPage() {
  const t = useT();
  const params = { id: useRouteParam('id', 3) };
  const id = params?.id as string;
  const { payments, orderById, finance, settings } = useData();
  const payment = payments.find((p) => p.id === id);
  const order = payment ? orderById[payment.orderId] : undefined;
  const fin = payment ? finance[payment.orderId] : undefined;

  /** Paid till (and including) this receipt */
  const paidTillDate = useMemo(() => {
    if (!payment) return 0;
    return payments
      .filter((p) => p.orderId === payment.orderId)
      .filter((p) => (p.date || '') < (payment.date || '') || ((p.date || '') === (payment.date || '') && p.createdAt <= payment.createdAt))
      .reduce((a, p) => a + p.amount, 0);
  }, [payments, payment]);

  useEffect(() => {
    if (payment) document.title = t('Receipt {no} - {name}', { no: payment.receiptNo, name: payment.customerName });
  }, [payment, t]);

  if (!payment) return <PrintNotFound what="Payment" />;

  const total = fin ? fin.price - (fin.discount || 0) : 0;
  const balanceAfter = Math.max(0, total - paidTillDate);

  const rows: [string, React.ReactNode][] = [
    [
      t('Received from'),
      <>
        <b>{payment.customerName}</b>
        {order?.customerPhone && <> ({order.customerPhone})</>}
      </>,
    ],
    [t('Amount in words'), <b key="w">{rupeesInWords(payment.amount)}</b>],
    [
      t('Payment mode'),
      <>
        <b>{t(PAY_MODE_LABEL[payment.mode] || payment.mode)}</b>
        {payment.note ? <> ({payment.note})</> : null}
      </>,
    ],
    [
      t('Against order'),
      <>
        <b>{payment.orderNo}</b>
        {order && (
          <>
            {' '}
            - {t(order.itemType)}
            {order.title ? ` (${order.title})` : ''}
          </>
        )}
      </>,
    ],
    [t('Payment type'), payment.type === 'advance' ? t('Advance') : t('Instalment')],
  ];

  return (
    <div className="text-[13px] leading-relaxed">
      <PrintToolbar title={t('Receipt · {no}', { no: payment.receiptNo })} />
      <WorkshopHeader settings={settings} docTitle={t('PAYMENT RECEIPT')} docNo={payment.receiptNo} docDate={fmtDate(payment.date)} />

      <p className="mt-6 text-[15px] font-semibold">{t('Payment received with thanks.')}</p>
      <dl className="mt-3 divide-y divide-dotted divide-gray-400 text-[15px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
            <dt className="w-44 shrink-0 text-gray-600">{label}</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="inline-flex items-center rounded border-2 border-black px-5 py-3 text-2xl font-extrabold">{money(payment.amount)}</div>
        {fin && (
          <table className="w-full max-w-[280px] text-sm">
            <tbody>
              <tr>
                <td className="py-1">{t('Order total')}</td>
                <td className="py-1 text-right">{money(total)}</td>
              </tr>
              <tr>
                <td className="py-1">{t('Paid till date')}</td>
                <td className="py-1 text-right">{money(paidTillDate)}</td>
              </tr>
              <tr className="border-t-2 border-black font-bold">
                <td className="py-1.5">{t('Balance')}</td>
                <td className="py-1.5 text-right">{money(balanceAfter)}</td>
              </tr>
              {Math.abs(balanceAfter - (fin.balance || 0)) > 0.5 && (
                <tr className="text-xs text-gray-600">
                  <td className="py-1">{t('Current balance')}</td>
                  <td className="py-1 text-right">{money(fin.balance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {order && (
        <p className="mt-4 text-xs text-gray-700">
          {t('Delivery date')}: {fmtDate(order.deliveryDate)} · {t('Status')}: {t(order.stage)}
        </p>
      )}

      <SignatureBlock settings={settings} />
      <p className="mt-8 text-center text-sm font-semibold">{t('Thank you!')}</p>
    </div>
  );
}
