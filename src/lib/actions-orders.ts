'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { syncStatus } from './actions';
import type { Finance, Order, WorkshopSettings } from './types';

/** Toggle whether prices are shown on the public status page, then refresh the mirror. */
export async function setShowPriceOnStatus(
  order: Order,
  value: boolean,
  settings: WorkshopSettings,
  fin?: Finance | null,
) {
  await updateDoc(doc(db(), 'orders', order.id), { showPriceOnStatus: value, updatedAt: Date.now() });
  await syncStatus({ ...order, showPriceOnStatus: value }, settings, fin);
}
