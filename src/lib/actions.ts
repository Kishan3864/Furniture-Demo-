'use client';

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { createLoginForStaff, db } from './firebase';
import { tr } from './i18n';
import { deleteImage } from './upload';
import { deleteMedia } from './media';
import { orderNo as fmtOrderNo, randomToken, receiptNo as fmtReceiptNo, todayStr } from './utils';
import type {
  Customer,
  Finance,
  Karigar,
  Labour,
  Media,
  Order,
  Payment,
  PayMode,
  Photo,
  StatusDoc,
  StockItem,
  WorkshopSettings,
} from './types';
import type {
  CustomerInput,
  ExpenseInput,
  KarigarInput,
  LabourInput,
  OrderInput,
  StockItemInput,
  StockMoveInput,
} from './schemas';

const now = () => Date.now();

/** Firestore rejects `undefined` - strip it recursively. */
function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === 'object' && v.constructor === Object) {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (val !== undefined) o[k] = clean(val);
    }
    return o as T;
  }
  return v;
}

export function newId(col: string): string {
  return doc(collection(db(), col)).id;
}

/* ------------------------------ Generic ------------------------------ */

export async function softDelete(col: string, id: string) {
  await updateDoc(doc(db(), col, id), { deleted: true, deletedAt: now() });
}

export async function restoreDoc(col: string, id: string) {
  await updateDoc(doc(db(), col, id), { deleted: false, deletedAt: null });
}

export async function listDeleted(col: string) {
  const snap = await getDocs(query(collection(db(), col), where('deleted', '==', true)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

/* ------------------------------ Settings ------------------------------ */

export async function saveSettings(data: Partial<WorkshopSettings>) {
  await setDoc(doc(db(), 'settings', 'workshop'), clean({ ...data, updatedAt: now() }), { merge: true });
}

/* ------------------------------ Customers ------------------------------ */

export async function saveCustomer(input: CustomerInput, id?: string): Promise<string> {
  const data = clean({
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address || '',
    notes: input.notes || '',
  });
  if (id) {
    await updateDoc(doc(db(), 'customers', id), { ...data, updatedAt: now() });
    // keep denormalised copies in sync
    const snap = await getDocs(query(collection(db(), 'orders'), where('customerId', '==', id)));
    if (!snap.empty) {
      const b = writeBatch(db());
      snap.docs.forEach((d) => {
        b.update(d.ref, { customerName: data.name, customerPhone: data.phone, customerAddress: data.address });
        b.update(doc(db(), 'finance', d.id), { customerName: data.name });
        const token = (d.data() as Order).statusToken;
        if (token) b.set(doc(db(), 'status', token), { customerName: data.name }, { merge: true });
      });
      await b.commit().catch((e) => console.warn('sync customer copies', e));
    }
    return id;
  }
  const r = await addDoc(collection(db(), 'customers'), { ...data, deleted: false, createdAt: now() });
  return r.id;
}

/* ------------------------------ Status mirror ------------------------------ */

export function buildStatus(order: Order, settings: WorkshopSettings, fin?: Finance | null): StatusDoc {
  const show = !!order.showPriceOnStatus;
  return clean({
    orderId: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    itemType: order.itemType,
    title: order.title || '',
    quantity: order.quantity,
    stage: order.stage,
    stageIndex: order.stageIndex,
    progress: order.progress,
    stages: settings.stages,
    deliveryDate: order.deliveryDate,
    photos: order.progressPhotos || [],
    karigarIds: order.karigarIds || [],
    workshopName: settings.name,
    workshopPhone: settings.phone || '',
    logoUrl: settings.logoUrl || '',
    showPrice: show,
    price: show && fin ? fin.price - (fin.discount || 0) : null,
    paid: show && fin ? fin.paid : null,
    balance: show && fin ? fin.balance : null,
    updatedAt: now(),
  });
}

export async function syncStatus(order: Order, settings: WorkshopSettings, fin?: Finance | null) {
  if (!order.statusToken) return;
  await setDoc(doc(db(), 'status', order.statusToken), buildStatus(order, settings, fin));
}

/* ------------------------------ Orders ------------------------------ */

export interface CreateOrderExtra {
  id: string; // pre-generated with newId('orders') so photos can be uploaded first
  designPhotos: Photo[];
  customer: Customer;
  advance: number;
  advanceMode: PayMode;
  createdBy?: string;
  /** when created from a site visit */
  siteId?: string | null;
  siteMedia?: Media[];
}

export async function createOrder(input: OrderInput, settings: WorkshopSettings, extra: CreateOrderExtra) {
  const d = db();
  const orderRef = doc(d, 'orders', extra.id);
  const finRef = doc(d, 'finance', extra.id);
  const counterRef = doc(d, 'counters', 'orders');
  const rcCounterRef = doc(d, 'counters', 'receipts');
  const token = randomToken(22);
  const stage0 = settings.stages[0] || { name: 'Measurement', percent: 10 };
  const t = now();

  return runTransaction(d, async (tx) => {
    const c = await tx.get(counterRef);
    const rc = extra.advance > 0 ? await tx.get(rcCounterRef) : null;
    const n = ((c.exists() ? (c.data().next as number) : 1) || 1) as number;
    const no = fmtOrderNo(n);

    const order: Order = clean({
      id: extra.id,
      orderNo: no,
      customerId: extra.customer.id,
      customerName: extra.customer.name,
      customerPhone: extra.customer.phone,
      customerAddress: extra.customer.address || '',
      itemType: input.itemType,
      title: input.title || '',
      quantity: input.quantity,
      naap: { ...input.naap, notes: input.naap.notes || '' },
      designPhotos: extra.designPhotos,
      progressPhotos: [],
      siteMedia: extra.siteMedia || [],
      siteId: extra.siteId || null,
      refLink: input.refLink || '',
      wood: input.wood || '',
      finish: input.finish || '',
      hardware: input.hardware || '',
      orderDate: input.orderDate,
      deliveryDate: input.deliveryDate,
      priority: input.priority,
      stage: stage0.name,
      stageIndex: 0,
      progress: stage0.percent,
      stageHistory: [{ stage: stage0.name, index: 0, at: t, by: extra.createdBy || '' }],
      karigarIds: input.karigarIds,
      statusToken: token,
      showPriceOnStatus: input.showPriceOnStatus,
      notes: input.notes || '',
      deliveredAt: null,
      deleted: false,
      createdAt: t,
      updatedAt: t,
    });
    const { id: _omit, ...orderData } = order;
    void _omit;

    const paid = extra.advance > 0 ? extra.advance : 0;
    const fin: Finance = {
      id: extra.id,
      orderId: extra.id,
      orderNo: no,
      customerId: extra.customer.id,
      customerName: extra.customer.name,
      price: input.price,
      discount: input.discount || 0,
      paid,
      balance: input.price - (input.discount || 0) - paid,
      deleted: false,
      createdAt: t,
    };

    tx.set(counterRef, { next: n + 1 }, { merge: true });
    tx.set(orderRef, orderData);
    tx.set(finRef, fin);
    tx.set(doc(d, 'status', token), buildStatus(order, settings, fin));

    if (rc && extra.advance > 0) {
      const rn = ((rc.exists() ? (rc.data().next as number) : 1) || 1) as number;
      tx.set(rcCounterRef, { next: rn + 1 }, { merge: true });
      const payRef = doc(collection(d, 'payments'));
      const p: Omit<Payment, 'id'> = {
        receiptNo: fmtReceiptNo(rn),
        orderId: extra.id,
        orderNo: no,
        customerId: extra.customer.id,
        customerName: extra.customer.name,
        amount: extra.advance,
        mode: extra.advanceMode,
        type: 'advance',
        date: input.orderDate || todayStr(),
        note: 'Advance',
        deleted: false,
        createdAt: t,
      };
      tx.set(payRef, p);
    }
    return { id: extra.id, orderNo: no };
  });
}

export async function updateOrder(
  order: Order,
  input: OrderInput,
  settings: WorkshopSettings,
  extra: { designPhotos: Photo[]; customer: Customer; fin?: Finance | null },
) {
  const d = db();
  const t = now();
  const updated: Order = clean({
    ...order,
    customerId: extra.customer.id,
    customerName: extra.customer.name,
    customerPhone: extra.customer.phone,
    customerAddress: extra.customer.address || '',
    itemType: input.itemType,
    title: input.title || '',
    quantity: input.quantity,
    naap: { ...input.naap, notes: input.naap.notes || '' },
    designPhotos: extra.designPhotos,
    refLink: input.refLink || '',
    wood: input.wood || '',
    finish: input.finish || '',
    hardware: input.hardware || '',
    orderDate: input.orderDate,
    deliveryDate: input.deliveryDate,
    priority: input.priority,
    karigarIds: input.karigarIds,
    showPriceOnStatus: input.showPriceOnStatus,
    notes: input.notes || '',
    updatedAt: t,
  });
  const { id: _omit, ...data } = updated;
  void _omit;
  const paid = extra.fin?.paid || 0;
  const fin: Finance = {
    id: order.id,
    orderId: order.id,
    orderNo: order.orderNo,
    customerId: extra.customer.id,
    customerName: extra.customer.name,
    price: input.price,
    discount: input.discount || 0,
    paid,
    balance: input.price - (input.discount || 0) - paid,
    deleted: false,
    createdAt: extra.fin?.createdAt || order.createdAt,
  };
  const b = writeBatch(d);
  b.set(doc(d, 'orders', order.id), data);
  b.set(doc(d, 'finance', order.id), fin);
  if (order.statusToken) b.set(doc(d, 'status', order.statusToken), buildStatus(updated, settings, fin));
  await b.commit();
}

/** Works for owner and assigned karigar (rules allow only these fields for karigar). */
export async function setStage(order: Order, index: number, settings: WorkshopSettings, by?: string) {
  const d = db();
  const st = settings.stages[index];
  if (!st) throw new Error(tr('Stage not found'));
  const t = now();
  const isLast = index >= settings.stages.length - 1;
  const history = [...(order.stageHistory || []), { stage: st.name, index, at: t, by: by || '' }];
  const b = writeBatch(d);
  b.update(doc(d, 'orders', order.id), {
    stage: st.name,
    stageIndex: index,
    progress: st.percent,
    stageHistory: history,
    updatedAt: t,
    deliveredAt: isLast ? t : null,
  });
  if (order.statusToken) {
    b.update(doc(d, 'status', order.statusToken), {
      stage: st.name,
      stageIndex: index,
      progress: st.percent,
      updatedAt: t,
    });
  }
  await b.commit();
}

export async function addProgressPhotos(order: Order, photos: Photo[]) {
  const d = db();
  const t = now();
  const b = writeBatch(d);
  b.update(doc(d, 'orders', order.id), { progressPhotos: arrayUnion(...photos), updatedAt: t });
  if (order.statusToken) b.update(doc(d, 'status', order.statusToken), { photos: arrayUnion(...photos), updatedAt: t });
  await b.commit();
}

export async function removePhoto(order: Order, kind: 'design' | 'progress', photo: Photo) {
  const d = db();
  const b = writeBatch(d);
  if (kind === 'design') {
    b.update(doc(d, 'orders', order.id), { designPhotos: arrayRemove(photo), updatedAt: now() });
  } else {
    b.update(doc(d, 'orders', order.id), { progressPhotos: arrayRemove(photo), updatedAt: now() });
    if (order.statusToken) b.update(doc(d, 'status', order.statusToken), { photos: arrayRemove(photo) });
  }
  await b.commit();
  await deleteImage(photo.path);
}

export async function regenerateStatusToken(order: Order, settings: WorkshopSettings, fin?: Finance | null) {
  const d = db();
  const token = randomToken(22);
  const b = writeBatch(d);
  if (order.statusToken) b.delete(doc(d, 'status', order.statusToken));
  b.update(doc(d, 'orders', order.id), { statusToken: token, updatedAt: now() });
  b.set(doc(d, 'status', token), buildStatus({ ...order, statusToken: token }, settings, fin));
  await b.commit();
  return token;
}

export async function deleteOrder(order: Order, payments: Payment[], labour: Labour[]) {
  const d = db();
  const t = now();
  const b = writeBatch(d);
  b.update(doc(d, 'orders', order.id), { deleted: true, deletedAt: t });
  b.set(doc(d, 'finance', order.id), { deleted: true, deletedAt: t }, { merge: true });
  if (order.statusToken) b.delete(doc(d, 'status', order.statusToken));
  payments.filter((p) => p.orderId === order.id).forEach((p) => b.update(doc(d, 'payments', p.id), { deleted: true, deletedAt: t }));
  labour.filter((l) => l.orderId === order.id).forEach((l) => b.update(doc(d, 'labour', l.id), { deleted: true, deletedAt: t }));
  await b.commit();
}

export async function restoreOrder(order: Order, settings: WorkshopSettings) {
  const d = db();
  const b = writeBatch(d);
  b.update(doc(d, 'orders', order.id), { deleted: false, deletedAt: null });
  b.set(doc(d, 'finance', order.id), { deleted: false, deletedAt: null }, { merge: true });
  const pays = await getDocs(query(collection(d, 'payments'), where('orderId', '==', order.id)));
  pays.docs.forEach((p) => b.update(p.ref, { deleted: false, deletedAt: null }));
  const labs = await getDocs(query(collection(d, 'labour'), where('orderId', '==', order.id)));
  labs.docs.forEach((l) => b.update(l.ref, { deleted: false, deletedAt: null }));
  await b.commit();
  await syncStatus({ ...order, deleted: false }, settings, null);
}

/* ------------------------------ Payments ------------------------------ */

export async function addPayment(
  order: Order,
  input: { amount: number; mode: PayMode; date: string; note?: string },
  settings: WorkshopSettings,
) {
  const d = db();
  const finRef = doc(d, 'finance', order.id);
  const rcRef = doc(d, 'counters', 'receipts');
  const payRef = doc(collection(d, 'payments'));
  await runTransaction(d, async (tx) => {
    const f = await tx.get(finRef);
    const rc = await tx.get(rcRef);
    if (!f.exists()) throw new Error(tr('Order accounts not found'));
    const fin = f.data() as Finance;
    const rn = ((rc.exists() ? (rc.data().next as number) : 1) || 1) as number;
    const paid = (fin.paid || 0) + input.amount;
    const balance = fin.price - (fin.discount || 0) - paid;
    tx.set(rcRef, { next: rn + 1 }, { merge: true });
    const p: Omit<Payment, 'id'> = {
      receiptNo: fmtReceiptNo(rn),
      orderId: order.id,
      orderNo: order.orderNo,
      customerId: order.customerId,
      customerName: order.customerName,
      amount: input.amount,
      mode: input.mode,
      type: (fin.paid || 0) > 0 ? 'instalment' : 'advance',
      date: input.date,
      note: input.note || '',
      deleted: false,
      createdAt: now(),
    };
    tx.set(payRef, p);
    tx.update(finRef, { paid, balance });
    if (order.statusToken && order.showPriceOnStatus) {
      tx.set(
        doc(d, 'status', order.statusToken),
        { paid, balance, price: fin.price - (fin.discount || 0), updatedAt: now() },
        { merge: true },
      );
    }
  });
  void settings;
  return payRef.id;
}

export async function deletePayment(p: Payment, order?: Order | null) {
  const d = db();
  const finRef = doc(d, 'finance', p.orderId);
  await runTransaction(d, async (tx) => {
    const f = await tx.get(finRef);
    tx.update(doc(d, 'payments', p.id), { deleted: true, deletedAt: now() });
    if (f.exists()) {
      const fin = f.data() as Finance;
      const paid = Math.max(0, (fin.paid || 0) - p.amount);
      const balance = fin.price - (fin.discount || 0) - paid;
      tx.update(finRef, { paid, balance });
      if (order?.statusToken && order.showPriceOnStatus) {
        tx.set(doc(d, 'status', order.statusToken), { paid, balance }, { merge: true });
      }
    }
  });
}

/* ------------------------------ Karigar ------------------------------ */

export async function saveKarigar(input: KarigarInput, id?: string): Promise<string> {
  const data = clean({ name: input.name.trim(), phone: input.phone.trim(), skill: input.skill || '', active: input.active });
  if (id) {
    await updateDoc(doc(db(), 'karigars', id), { ...data, updatedAt: now() });
    return id;
  }
  const r = await addDoc(collection(db(), 'karigars'), { ...data, email: null, uid: null, deleted: false, createdAt: now() });
  return r.id;
}

export async function createKarigarLogin(k: Karigar, email: string, password: string) {
  const uid = await createLoginForStaff(email.trim().toLowerCase(), password);
  const d = db();
  const b = writeBatch(d);
  b.set(doc(d, 'users', uid), {
    uid,
    name: k.name,
    email: email.trim().toLowerCase(),
    role: 'karigar',
    karigarId: k.id,
    active: true,
  });
  b.update(doc(d, 'karigars', k.id), { email: email.trim().toLowerCase(), uid });
  await b.commit();
  return uid;
}

export async function setKarigarLoginActive(k: Karigar, active: boolean) {
  if (!k.uid) return;
  await updateDoc(doc(db(), 'users', k.uid), { active });
}

export async function deleteKarigar(k: Karigar) {
  const d = db();
  const b = writeBatch(d);
  b.update(doc(d, 'karigars', k.id), { deleted: true, active: false, deletedAt: now() });
  if (k.uid) b.update(doc(d, 'users', k.uid), { active: false });
  await b.commit();
}

/* ------------------------------ Labour ------------------------------ */

export async function saveLabour(input: LabourInput, ctx: { karigar: Karigar; order: Order }, id?: string) {
  const data = clean({
    karigarId: ctx.karigar.id,
    karigarName: ctx.karigar.name,
    orderId: ctx.order.id,
    orderNo: ctx.order.orderNo,
    itemType: ctx.order.itemType,
    amount: input.amount,
    paid: input.paid || 0,
    note: input.note || '',
  });
  if (id) {
    await updateDoc(doc(db(), 'labour', id), { ...data, updatedAt: now() });
    return id;
  }
  const r = await addDoc(collection(db(), 'labour'), { ...data, deleted: false, createdAt: now() });
  return r.id;
}

export async function payLabour(l: Labour, amount: number) {
  await updateDoc(doc(db(), 'labour', l.id), { paid: increment(amount), updatedAt: now() });
}

/* ------------------------------ Stock ------------------------------ */

export async function saveStockItem(input: StockItemInput, id?: string) {
  const data = clean({
    name: input.name.trim(),
    category: input.category,
    unit: input.unit,
    minQty: input.minQty,
    rate: input.rate ?? 0,
  });
  if (id) {
    await updateDoc(doc(db(), 'stock', id), { ...data, updatedAt: now() });
    return id;
  }
  const r = await addDoc(collection(db(), 'stock'), { ...data, qty: input.qty, deleted: false, createdAt: now() });
  return r.id;
}

export async function moveStock(input: StockMoveInput, item: StockItem, order?: Order | null) {
  const d = db();
  const itemRef = doc(d, 'stock', item.id);
  const moveRef = doc(collection(d, 'stockMoves'));
  await runTransaction(d, async (tx) => {
    const s = await tx.get(itemRef);
    const cur = s.exists() ? Number((s.data() as StockItem).qty) || 0 : 0;
    const next = input.type === 'in' ? cur + input.qty : cur - input.qty;
    if (next < 0) throw new Error(tr('Not enough stock - only {qty} {unit} left', { qty: cur, unit: item.unit }));
    tx.update(itemRef, { qty: Math.round(next * 1000) / 1000, updatedAt: now() });
    tx.set(moveRef, {
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      type: input.type,
      qty: input.qty,
      orderId: order?.id || null,
      orderNo: order?.orderNo || null,
      date: input.date,
      note: input.note || '',
      createdAt: now(),
    });
  });
}

export async function deleteStockMove(moveId: string, move: { itemId: string; type: 'in' | 'out'; qty: number }) {
  const d = db();
  const itemRef = doc(d, 'stock', move.itemId);
  await runTransaction(d, async (tx) => {
    const s = await tx.get(itemRef);
    if (s.exists()) {
      const cur = Number((s.data() as StockItem).qty) || 0;
      const next = move.type === 'in' ? cur - move.qty : cur + move.qty;
      tx.update(itemRef, { qty: Math.max(0, Math.round(next * 1000) / 1000) });
    }
    tx.delete(doc(d, 'stockMoves', moveId));
  });
}

/* ------------------------------ Expenses ------------------------------ */

export async function saveExpense(input: ExpenseInput, id?: string) {
  const data = clean({ date: input.date, category: input.category, amount: input.amount, note: input.note || '' });
  if (id) {
    await updateDoc(doc(db(), 'expenses', id), { ...data, updatedAt: now() });
    return id;
  }
  const r = await addDoc(collection(db(), 'expenses'), { ...data, deleted: false, createdAt: now() });
  return r.id;
}

export async function hardDelete(col: string, id: string) {
  await deleteDoc(doc(db(), col, id));
}

/* ------------------------------ Order site photos / videos ------------------------------ */

/** Owner or assigned worker (rules allow 'siteMedia' for workers). */
export async function addOrderSiteMedia(order: Order, items: Media[]) {
  await updateDoc(doc(db(), 'orders', order.id), { siteMedia: arrayUnion(...items), updatedAt: now() });
}

export async function removeOrderSiteMedia(order: Order, m: Media) {
  await updateDoc(doc(db(), 'orders', order.id), { siteMedia: arrayRemove(m), updatedAt: now() });
  // files copied from a site visit belong to the site - keep them
  if (m.source !== 'site') await deleteMedia(m);
}
