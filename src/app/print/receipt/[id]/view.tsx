'use client';

import { useRouteParam } from '@/lib/route-param';

import { useEffect, useMemo } from 'react';
import { useData } from '@/lib/data';
import { fmtDate, money, PAY_MODE_LABEL } from '@/lib/utils';
import { rupeesInWords } from '@/lib/words';
import { PrintNotFound, PrintToolbar, SignatureBlock, WorkshopHeader } from '../../print-bits';

export default function ReceiptPage() {
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
    if (payment) document.title = `Receipt ${payment.receiptNo} - ${payment.customerName}`;
  }, [payment]);

  if (!payment) return <PrintNotFound what="Payment" />;

  const total = fin ? fin.price - (fin.discount || 0) : 0;
  const balanceAfter = Math.max(0, total - paidTillDate);

  return (
    <div className="text-[13px] leading-relaxed">
      <PrintToolbar title={`Receipt · ${payment.receiptNo}`} />
      <WorkshopHeader settings={settings} docTitle="PAYMENT RECEIPT" docNo={payment.receiptNo} docDate={fmtDate(payment.date)} />

      <div className="mt-6 space-y-3 text-[15px]">
        <p>
          Received with thanks from <b className="border-b border-dotted border-black px-1">{payment.customerName}</b>
          {order?.customerPhone && <> ({order.customerPhone})</>}
        </p>
        <p>
          the sum of <b className="border-b border-dotted border-black px-1">{rupeesInWords(payment.amount)}</b>
        </p>
        <p>
          by <b>{PAY_MODE_LABEL[payment.mode] || payment.mode}</b>
          {payment.note ? <> ({payment.note})</> : null} against order <b>{payment.orderNo}</b>
          {order && (
            <>
              {' '}
              - {order.itemType}
              {order.title ? ` (${order.title})` : ''}
            </>
          )}
          {payment.type === 'advance' ? ' as advance.' : '.'}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="inline-flex items-center rounded border-2 border-black px-5 py-3 text-2xl font-extrabold">{money(payment.amount)}</div>
        {fin && (
          <table className="w-full max-w-[280px] text-sm">
            <tbody>
              <tr>
                <td className="py-1">Order total</td>
                <td className="py-1 text-right">{money(total)}</td>
              </tr>
              <tr>
                <td className="py-1">Paid till date</td>
                <td className="py-1 text-right">{money(paidTillDate)}</td>
              </tr>
              <tr className="border-t-2 border-black font-bold">
                <td className="py-1.5">Balance</td>
                <td className="py-1.5 text-right">{money(balanceAfter)}</td>
              </tr>
              {Math.abs(balanceAfter - (fin.balance || 0)) > 0.5 && (
                <tr className="text-xs text-gray-600">
                  <td className="py-1">Current balance</td>
                  <td className="py-1 text-right">{money(fin.balance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {order && (
        <p className="mt-4 text-xs text-gray-700">
          Delivery date: {fmtDate(order.deliveryDate)} · Status: {order.stage}
        </p>
      )}

      <SignatureBlock settings={settings} />
      <p className="mt-8 text-center text-sm font-semibold">Thank you! Dhanyavaad.</p>
    </div>
  );
}
