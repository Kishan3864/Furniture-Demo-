'use client';

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { tr } from './i18n';
import type { Photo } from './types';

/**
 * Where photos are stored.
 * - "firestore" (default): compressed JPEG data stored in the `images` collection (works on the free Spark plan).
 * - "storage": Cloud Storage for Firebase (set NEXT_PUBLIC_PHOTO_STORE=storage once Storage is enabled).
 * Both kinds keep working side by side, so switching later is safe.
 */
export const PHOTO_STORE: 'storage' | 'firestore' =
  process.env.NEXT_PUBLIC_PHOTO_STORE === 'storage' ? 'storage' : 'firestore';
export const FS_IMAGE_PREFIX = 'fsimg:';
const FS_MAX_CHARS = 900_000; // Firestore doc limit is 1 MiB

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

async function uploadToFirestore(path: string, file: File, opts?: { by?: string; maxSide?: number }): Promise<Photo> {
  let side = Math.min(opts?.maxSide ?? 1280, 1280);
  let quality = 0.7;
  let data = '';
  for (let i = 0; i < 6; i++) {
    const blob = await compressImage(file, side, quality, true);
    data = await blobToDataUrl(blob);
    if (data.length < FS_MAX_CHARS) break;
    side = Math.round(side * 0.75);
    quality = Math.max(0.45, quality - 0.08);
  }
  if (data.length >= FS_MAX_CHARS) throw new Error(tr('Photo is too large, choose a smaller one'));
  const r = doc(collection(db(), 'images'));
  await setDoc(r, { data, path, by: opts?.by || '', createdAt: Date.now() });
  const id = `${FS_IMAGE_PREFIX}${r.id}`;
  return { url: id, path: id, at: Date.now(), by: opts?.by || '' };
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Resize to max side and re-encode as JPEG. Returns original if compression does not help. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.72, forceJpeg = false): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error(tr('Please choose an image file'));
  if (!forceJpeg && (file.type === 'image/gif' || file.type === 'image/svg+xml')) return file;
  try {
    const img = await loadBitmap(file);
    const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const h = 'naturalHeight' in img ? img.naturalHeight : img.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const cw = Math.round(w * scale);
    const ch = Math.round(h * scale);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img as CanvasImageSource, 0, 0, cw, ch);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    return forceJpeg || blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

function safeName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40) || 'photo';
}

export async function uploadImage(path: string, file: File, opts?: { by?: string; maxSide?: number }): Promise<Photo> {
  if (PHOTO_STORE === 'firestore') return uploadToFirestore(path, file, opts);
  const blob = await compressImage(file, opts?.maxSide ?? 1600);
  const r = ref(storage(), path);
  await uploadBytes(r, blob, { contentType: blob.type || 'image/jpeg', cacheControl: 'public,max-age=31536000' });
  const url = await getDownloadURL(r);
  return { url, path, at: Date.now(), by: opts?.by || '' };
}

export async function uploadOrderPhotos(
  orderId: string,
  folder: 'design' | 'progress',
  files: File[],
  by?: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Photo[]> {
  const out: Photo[] = [];
  let i = 0;
  for (const f of files) {
    const path = `orders/${orderId}/${folder}/${Date.now()}-${i}-${safeName(f.name)}.jpg`;
    out.push(await uploadImage(path, f, { by }));
    i++;
    onProgress?.(i, files.length);
  }
  return out;
}

export async function deleteImage(path: string) {
  if (!path) return;
  try {
    if (path.startsWith(FS_IMAGE_PREFIX)) {
      await deleteDoc(doc(db(), 'images', path.slice(FS_IMAGE_PREFIX.length)));
      return;
    }
    await deleteObject(ref(storage(), path));
  } catch (e) {
    console.warn('delete image failed', e);
  }
}
