'use client';

import { Bytes, collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from './firebase';
import { tr } from './i18n';
import { PHOTO_STORE, deleteImage, uploadImage } from './upload';
import type { Media } from './types';

/**
 * Photos + videos.
 * - Photos: compressed JPEG (Firestore `images` or Cloud Storage, see PHOTO_STORE).
 * - Videos: Cloud Storage when enabled; otherwise split into ~950 KB binary chunks in
 *   Firestore (`media/{id}/chunks/{n}`) so they work on the free plan.
 */
export const VIDEO_PREFIX = 'fsvid:';
export const MAX_VIDEO_MB = PHOTO_STORE === 'storage' ? 300 : 60;
const CHUNK = 950_000;

export const isVideoFile = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test(f.name);
export const isImageFile = (f: File) => f.type.startsWith('image/');

function safeName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40) || 'file';
}

/** Grab a frame (~0.5s) as a JPEG poster + read the duration. Returns null if the browser can't decode it. */
export function makePoster(file: File): Promise<{ blob: Blob | null; duration: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let done = false;
    const finish = (r: { blob: Blob | null; duration: number } | null) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(r);
    };
    const timer = setTimeout(() => finish(null), 8000);
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;
    v.onloadeddata = () => {
      try {
        v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
      } catch {
        clearTimeout(timer);
        finish({ blob: null, duration: v.duration || 0 });
      }
    };
    v.onseeked = () => {
      const scale = Math.min(1, 640 / Math.max(v.videoWidth || 640, v.videoHeight || 360));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((v.videoWidth || 640) * scale));
      c.height = Math.max(1, Math.round((v.videoHeight || 360) * scale));
      const ctx = c.getContext('2d');
      if (!ctx) {
        clearTimeout(timer);
        return finish({ blob: null, duration: v.duration || 0 });
      }
      ctx.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob(
        (b) => {
          clearTimeout(timer);
          finish({ blob: b, duration: v.duration || 0 });
        },
        'image/jpeg',
        0.72,
      );
    };
    v.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
  });
}

/**
 * Upload one photo or video.
 * @param folder logical folder, e.g. `sites/<id>` or `orders/<id>/site`
 * @param onProgress 0..1
 */
export async function uploadMedia(
  file: File,
  folder: string,
  opts?: { by?: string; onProgress?: (p: number) => void; source?: 'site' | 'order' },
): Promise<Media> {
  const by = opts?.by || '';
  const ts = Date.now();
  if (isImageFile(file)) {
    opts?.onProgress?.(0.1);
    const p = await uploadImage(`${folder}/${ts}-${safeName(file.name)}.jpg`, file, { by });
    opts?.onProgress?.(1);
    return { ...p, kind: 'photo', source: opts?.source };
  }
  if (!isVideoFile(file)) throw new Error(tr('Only photos and videos can be uploaded'));
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(tr('Video is too large (max {mb} MB). Please record a shorter clip.', { mb: MAX_VIDEO_MB }));
  }

  // poster + duration
  let poster = '';
  let duration = 0;
  const pv = await makePoster(file);
  if (pv) {
    duration = Math.round(pv.duration || 0);
    if (pv.blob) {
      const pf = new File([pv.blob], 'poster.jpg', { type: 'image/jpeg' });
      poster = (await uploadImage(`${folder}/${ts}-poster.jpg`, pf, { by, maxSide: 640 })).url;
    }
  }
  const mime = file.type || 'video/mp4';

  if (PHOTO_STORE === 'storage') {
    const path = `${folder}/${ts}-${safeName(file.name)}`;
    const r = ref(storage(), path);
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(r, file, { contentType: mime, cacheControl: 'public,max-age=31536000' });
      task.on(
        'state_changed',
        (s) => opts?.onProgress?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
        reject,
        () => resolve(),
      );
    });
    const url = await getDownloadURL(r);
    return { kind: 'video', url, path, at: ts, by, mime, size: file.size, poster, duration, source: opts?.source };
  }

  // Firestore chunks
  const id = doc(collection(db(), 'media')).id;
  const buf = new Uint8Array(await file.arrayBuffer());
  const n = Math.ceil(buf.length / CHUNK);
  for (let i = 0; i < n; i++) {
    await setDoc(doc(db(), 'media', id, 'chunks', String(i).padStart(4, '0')), {
      i,
      data: Bytes.fromUint8Array(buf.subarray(i * CHUNK, (i + 1) * CHUNK)),
    });
    opts?.onProgress?.((i + 1) / (n + 1));
  }
  await setDoc(doc(db(), 'media', id), { kind: 'video', mime, size: file.size, chunks: n, folder, by, createdAt: ts });
  opts?.onProgress?.(1);
  const url = `${VIDEO_PREFIX}${id}`;
  return { kind: 'video', url, path: url, at: ts, by, mime, size: file.size, poster, duration, source: opts?.source };
}

const videoCache = new Map<string, string>();

/** Returns a playable URL for a video (assembles Firestore chunks into a blob URL, cached). */
export async function loadVideoUrl(m: Media): Promise<string> {
  if (!m.url.startsWith(VIDEO_PREFIX)) return m.url;
  const hit = videoCache.get(m.url);
  if (hit) return hit;
  const id = m.url.slice(VIDEO_PREFIX.length);
  const snap = await getDocs(collection(db(), 'media', id, 'chunks'));
  const parts = snap.docs
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => {
      const arr = (d.data().data as Bytes).toUint8Array();
      // copy into a fresh ArrayBuffer-backed view for Blob
      const copy = new Uint8Array(arr.byteLength);
      copy.set(arr);
      return copy;
    });
  if (!parts.length) throw new Error(tr('Video not found'));
  const blobUrl = URL.createObjectURL(new Blob(parts, { type: m.mime || 'video/mp4' }));
  videoCache.set(m.url, blobUrl);
  return blobUrl;
}

/** Delete the stored file(s) of a photo/video. */
export async function deleteMedia(m: Media) {
  try {
    if (m.poster) await deleteImage(m.poster);
    if (m.kind !== 'video') return deleteImage(m.path);
    if (m.url.startsWith(VIDEO_PREFIX)) {
      const id = m.url.slice(VIDEO_PREFIX.length);
      const snap = await getDocs(collection(db(), 'media', id, 'chunks'));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db(), 'media', id));
    } else if (m.path) {
      await deleteObject(ref(storage(), m.path));
    }
  } catch (e) {
    console.warn('delete media failed', e);
  }
}

export function fmtBytes(n?: number) {
  if (!n) return '';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtDuration(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}
