'use client';

import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FS_IMAGE_PREFIX } from '@/lib/upload';
import { cn } from '@/lib/utils';

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/** Resolve a photo url: normal URLs pass through, "fsimg:<id>" is loaded from Firestore (cached). */
export function resolveImage(src: string): Promise<string> {
  if (!src.startsWith(FS_IMAGE_PREFIX)) return Promise.resolve(src);
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  let p = inflight.get(src);
  if (!p) {
    p = getDoc(doc(db(), 'images', src.slice(FS_IMAGE_PREFIX.length)))
      .then((s) => {
        const data = (s.exists() && (s.data().data as string)) || '';
        if (data) cache.set(src, data);
        return data;
      })
      .finally(() => inflight.delete(src));
    inflight.set(src, p);
  }
  return p;
}

export function useImageSrc(src?: string | null): string {
  const direct = src && !src.startsWith(FS_IMAGE_PREFIX) ? src : '';
  const [resolved, setResolved] = useState(() => (src ? cache.get(src) || '' : ''));
  useEffect(() => {
    if (!src || direct) return;
    let alive = true;
    const hit = cache.get(src);
    if (hit) {
      setResolved(hit);
      return;
    }
    setResolved('');
    resolveImage(src)
      .then((v) => alive && setResolved(v))
      .catch(() => alive && setResolved(''));
    return () => {
      alive = false;
    };
  }, [src, direct]);
  return direct || resolved;
}

/** <img> that also understands photos stored in Firestore. */
export function StoredImg({ src, className, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src?: string | null }) {
  const real = useImageSrc(typeof src === 'string' ? src : '');
  if (!real) return <span className={cn('block animate-pulse bg-wood-100', className)} aria-label={alt} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={real} alt={alt} className={className} {...rest} />;
}
