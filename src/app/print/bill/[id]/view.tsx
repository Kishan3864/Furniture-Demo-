'use client';

import { useRouteParam } from '@/lib/route-param';

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData } from '@/lib/data';
import { fmtDate, money, naapText, PAY_MODE_LABEL, todayStr } from '@/lib/utils';
import { rupeesInWords } from '@/lib/words';
import { PageLoader } from '@/components/ui';
import { PrintNotFound, PrintToolbar, SignatureBlock, WorkshopHeader } from '../../print-bits';

export default function BillPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Bill />
    </Suspense>
  );
}

function Bill() {
  const params = { id: useRouteParam('id', 3) };
  const id = params?.id as string;
  const sp = useSearchParams();
  const isEstimate = sp.get('type') === 'estimate';
  const { orderById, finance, payments, settings } = useData();

  const order = orderById[id];
  const fin = finance[id];
  const pays = useMemo(
    () => payments.filter((p) => p.orderId === id).sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.createdAt - b.createdAt),
    [payments, id],
  );

  const docTitle = isEstimate ? 'ESTIMATE' : 'BILL / INVOICE';

  useEffect(() => {
    if (order) document.title = `${isEstimate ? 'Estimate' : 'Bill'} ${order.orderNo} - ${order.customerName}`;
  }, [order, isEstimate]);

  if (!order) return <PrintNotFound what="Order" />;

  const price = fin?.price || 0;
  const discount = fin?.discount || 0;
  const total = price - discount;
  const paid = fin?.paid || 0;
  const balance = fin?.balance ?? total - paid;
  const qty = order.quantity || 1;
  const rate = qty ? price / qty : price;
  const extras = (order.naap?.extra || []).filter((e) => e.label || e.value);

  return (
    <div className="text-[13px] leading-relaxed">
      <PrintToolbar title={`${docTitle} · ${order.orderNo}`} />

      <WorkshopHeader settings={settings} docTitle={docTitle} docNo={order.orderNo} docDate={fmtDate(isEstimate ? todayStr() : order.orderDate)} />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Bill to</p>
          <p className="text-base font-bold">{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.customerAddress && <p className="whitespace-pre-line text-gray-800">{order.customerAddress}</p>}
        </div>
        <div className="text-right">
          <p>
            Order date: <b>{fmtDate(order.orderDate)}</b>
          </p>
          <p>
            Delivery date: <b>{fmtDate(order.deliveryDate)}</b>
          </p>
          {!isEstimate && (
            <p>
              Status: <b>{order.stage}</b>
            </p>
          )}
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-left">
        <thead>
          <tr className="border-y-2 border-black text-[11px] uppercase tracking-wide">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Item / Details</th>
            <th className="py-2 pr-2 text-center">Qty</th>
            <th className="py-2 pr-2 text-right">Rate</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-300 align-top">
            <td className="py-3 pr-2">1</td>
            <td className="py-3 pr-2">
              <p className="font-bold">
                {order.itemType}
                {order.title ? ` - ${order.title}` : ''}
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-gray-800">
                <p>Naap (L x W x H): {naapText(order.naap)}</p>
                {extras.map((e, i) => (
                  <p key={i}>
                    {e.label || 'Extra'}: {e.value}
                  </p>
                ))}
                {order.wood && <p>Lakdi: {order.wood}</p>}
                {order.finish && <p>Finish / Polish: {order.finish}</p>}
                {order.hardware && <p>Hardware: {order.hardware}</p>}
                {order.naap?.notes && <p>Note: {order.naap.notes}</p>}
              </div>
            </td>
            <td className="py-3 pr-2 text-center">{qty}</td>
            <td className="py-3 pr-2 text-right">{money(rate)}</td>
            <td className="py-3 text-right font-semibold">{money(price)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm text-xs text-gray-800">
          <p className="font-semibold">Amount in words:</p>
          <p>{rupeesInWords(total)}</p>
        </div>
        <table className="w-full max-w-[260px] self-end text-sm">
          <tbody>
            <tr>
              <td className="py-1">Sub total</td>
              <td className="py-1 text-right">{money(price)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td className="py-1">Discount</td>
                <td className="py-1 text-right">- {money(discount)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-black text-base font-bold">
              <td className="py-1.5">Total</td>
              <td className="py-1.5 text-right">{money(total)}</td>
            </tr>
            {!isEstimate && (
              <>
                <tr>
                  <td className="py-1">Paid</td>
                  <td className="py-1 text-right">{money(paid)}</td>
                </tr>
                <tr className="border-t border-gray-400 font-bold">
                  <td className="py-1.5">Balance</td>
                  <td className="py-1.5 text-right">{money(balance)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {isEstimate ? (
        <p className="mt-5 rounded border border-gray-400 p-2 text-xs">
          Yeh estimate hai. Order confirm karne ke liye advance dena hoga{paid > 0 ? ` (advance mila: ${money(paid)})` : ''}. Rate naap aur
          material badalne par badal sakta hai.
        </p>
      ) : (
        pays.length > 0 && (
          <div className="mt-6">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">Payment history</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Receipt</th>
                  <th className="py-1 pr-2">Mode</th>
                  <th className="py-1 pr-2">Note</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pays.map((p) => (
                  <tr key={p.id} className="border-b border-gray-200">
                    <td className="py-1 pr-2">{fmtDate(p.date)}</td>
                    <td className="py-1 pr-2">{p.receiptNo}</td>
                    <td className="py-1 pr-2">{PAY_MODE_LABEL[p.mode] || p.mode}</td>
                    <td className="py-1 pr-2">{p.type === 'advance' ? 'Advance' : p.note || 'Instalment'}</td>
                    <td className="py-1 text-right">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {settings.billTerms && (
        <div className="mt-6 text-xs text-gray-800">
          <p className="font-semibold">Terms &amp; Conditions</p>
          <p className="whitespace-pre-line">{settings.billTerms}</p>
        </div>
      )}

      <SignatureBlock settings={settings} />

      <p className="mt-8 text-center text-sm font-semibold">Thank you! Aapke bharose ke liye dhanyavaad.</p>
    </div>
  );
}
