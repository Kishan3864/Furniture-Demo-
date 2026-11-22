'use client';

import { addDoc, arrayRemove, arrayUnion, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { deleteMedia } from './media';
import type { Customer, Media, Site, SiteEntry } from './types';

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

export interface CreateSiteInput {
  customer: Customer;
  title: string;
  address?: string;
  visitDate: string;
  notes?: string;
}

export async function createSite(input: CreateSiteInput): Promise<string> {
  const t = now();
  const r = await addDoc(
    collection(db(), 'sites'),
    clean({
      customerId: input.customer.id,
      customerName: input.customer.name,
      customerPhone: input.customer.phone,
      address: input.address || input.customer.address || '',
      title: input.title.trim(),
      visitDate: input.visitDate,
      entries: [],
      media: [],
      notes: input.notes || '',
      orderIds: [],
      deleted: false,
      createdAt: t,
      updatedAt: t,
    }),
  );
  return r.id;
}

export type SitePatch = Partial<
  Pick<Site, 'title' | 'address' | 'visitDate' | 'notes' | 'customerId' | 'customerName' | 'customerPhone'>
>;

export async function updateSite(id: string, patch: SitePatch) {
  await updateDoc(doc(db(), 'sites', id), clean({ ...patch, updatedAt: now() }));
}

export async function saveSiteEntries(id: string, entries: SiteEntry[]) {
  const list = entries.map((e) =>
    clean({
      id: e.id,
      label: e.label.trim(),
      unit: e.unit,
      l: e.l ?? null,
      w: e.w ?? null,
      h: e.h ?? null,
      notes: e.notes || '',
    }),
  );
  await updateDoc(doc(db(), 'sites', id), { entries: list, updatedAt: now() });
}

export async function addSiteMedia(id: string, items: Media[]) {
  if (!items.length) return;
  await updateDoc(doc(db(), 'sites', id), { media: arrayUnion(...items.map((m) => clean(m))), updatedAt: now() });
}

export async function removeSiteMedia(site: Site, m: Media) {
  await updateDoc(doc(db(), 'sites', site.id), { media: arrayRemove(m), updatedAt: now() });
  await deleteMedia(m);
}

export async function softDeleteSite(id: string) {
  await updateDoc(doc(db(), 'sites', id), { deleted: true, deletedAt: now() });
}

export async function linkOrderToSite(siteId: string, orderId: string) {
  await updateDoc(doc(db(), 'sites', siteId), { orderIds: arrayUnion(orderId), updatedAt: now() });
}

export function newEntryId() {
  return `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
