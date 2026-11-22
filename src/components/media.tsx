'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Play, Trash2, Video, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { fmtBytes, fmtDuration, isImageFile, isVideoFile, loadVideoUrl, MAX_VIDEO_MB, uploadMedia } from '@/lib/media';
import type { Media } from '@/lib/types';
import { cn, errMsg, fmtDateTime } from '@/lib/utils';
import { Button, Spinner } from './ui';
import { StoredImg } from './stored-image';

/* ------------------------------ Grid + viewer ------------------------------ */

export function MediaGrid({
  items,
  onRemove,
  className,
  empty,
}: {
  items: Media[];
  onRemove?: (m: Media) => void;
  className?: string;
  empty?: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return <>{empty ?? null}</>;
  return (
    <>
      <div className={cn('grid grid-cols-3 gap-2 sm:grid-cols-4', className)}>
        {items.map((m, i) => (
          <div key={m.url + i} className="group relative aspect-square overflow-hidden rounded-lg bg-wood-900">
            <button type="button" className="absolute inset-0 h-full w-full" onClick={() => setOpen(i)} aria-label={m.kind === 'video' ? t('Play video') : t('View photo')}>
              {m.kind === 'video' ? (
                m.poster ? (
                  <StoredImg src={m.poster} alt="" className="h-full w-full object-cover opacity-90" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-wood-300">
                    <Video className="h-8 w-8" />
                  </span>
                )
              ) : (
                <StoredImg src={m.url} alt={m.caption || ''} loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
            {m.kind === 'video' && (
              <>
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white">
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                  </span>
                </span>
                <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {fmtDuration(m.duration) || t('Video')}
                </span>
              </>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(m)}
                className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-red-600"
                aria-label={t('Delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {open !== null && items[open] && (
        <MediaViewer items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function MediaViewer({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: Media[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const t = useT();
  const m = items[index];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [index, items.length, onClose, onIndex]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
      <div className="flex items-center justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <span className="text-xs text-white/70">
          {index + 1} / {items.length} · {fmtDateTime(m.at)}
          {m.size ? ` · ${fmtBytes(m.size)}` : ''}
        </span>
        <button onClick={onClose} className="rounded bg-white/15 p-2" aria-label={t('Close')}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
        {m.kind === 'video' ? (
          <VideoPlayer media={m} />
        ) : (
          <StoredImg src={m.url} alt="" className="max-h-full max-w-full object-contain" />
        )}
        {index > 0 && (
          <button
            onClick={() => onIndex(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-white/15 p-2 text-white"
            aria-label={t('Previous')}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < items.length - 1 && (
          <button
            onClick={() => onIndex(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-white/15 p-2 text-white"
            aria-label={t('Next')}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
}

export function VideoPlayer({ media }: { media: Media }) {
  const t = useT();
  const [src, setSrc] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    setSrc('');
    setErr('');
    loadVideoUrl(media)
      .then((u) => alive && setSrc(u))
      .catch((e) => alive && setErr(errMsg(e)));
    return () => {
      alive = false;
    };
  }, [media]);
  if (err) return <p className="text-sm text-red-300">{err}</p>;
  if (!src)
    return (
      <div className="flex flex-col items-center gap-2 text-white/80">
        <Spinner className="h-7 w-7 text-white" />
        <span className="text-xs">
          {t('Loading video...')} {fmtBytes(media.size)}
        </span>
      </div>
    );
  return <video src={src} controls autoPlay playsInline className="max-h-full max-w-full bg-black" poster={undefined} />;
}

/* ------------------------------ Uploader ------------------------------ */

/**
 * Take photo / Record video / Gallery buttons. Uploads each file and calls onUploaded with the results.
 */
export function MediaUploader({
  folder,
  by,
  source,
  onUploaded,
  compact,
}: {
  folder: string;
  by?: string;
  source?: 'site' | 'order';
  onUploaded: (items: Media[]) => Promise<void> | void;
  compact?: boolean;
}) {
  const t = useT();
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ i: number; n: number; pct: number } | null>(null);

  const handle = async (files: File[]) => {
    const ok = files.filter((f) => isImageFile(f) || isVideoFile(f));
    if (!ok.length) return toast.error(t('Only photos and videos can be uploaded'));
    const out: Media[] = [];
    try {
      for (let i = 0; i < ok.length; i++) {
        setBusy({ i: i + 1, n: ok.length, pct: 0 });
        out.push(
          await uploadMedia(ok[i], folder, {
            by,
            source,
            onProgress: (p) => setBusy({ i: i + 1, n: ok.length, pct: Math.round(p * 100) }),
          }),
        );
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
    try {
      if (out.length) {
        await onUploaded(out);
        toast.success(t('{n} file(s) uploaded', { n: out.length }));
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const input = (r: React.RefObject<HTMLInputElement | null>, accept: string, capture: boolean, multiple: boolean) => (
    <input
      ref={r}
      type="file"
      accept={accept}
      multiple={multiple}
      {...(capture ? { capture: 'environment' as const } : {})}
      className="hidden"
      onChange={(e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length) void handle(files);
      }}
    />
  );

  return (
    <div className="space-y-2">
      {input(photoRef, 'image/*', true, false)}
      {input(videoRef, 'video/*', true, false)}
      {input(galleryRef, 'image/*,video/*', false, true)}
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3')}>
        <Button variant="primary" icon={<Camera className="h-4 w-4" />} disabled={!!busy} onClick={() => photoRef.current?.click()}>
          {t('Take photo')}
        </Button>
        <Button variant="outline" icon={<Video className="h-4 w-4" />} disabled={!!busy} onClick={() => videoRef.current?.click()}>
          {t('Record video')}
        </Button>
        <Button variant="outline" icon={<ImagePlus className="h-4 w-4" />} disabled={!!busy} onClick={() => galleryRef.current?.click()}>
          {t('From gallery')}
        </Button>
      </div>
      {busy ? (
        <div className="rounded border border-wood-200 bg-wood-50 p-2.5">
          <div className="mb-1 flex justify-between text-xs font-medium text-wood-800">
            <span>{t('Uploading {i} of {n}...', { i: busy.i, n: busy.n })}</span>
            <span>{busy.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded bg-wood-100">
            <div className="h-full bg-wood-600 transition-all" style={{ width: `${busy.pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-wood-600">{t('Keep this screen open until the upload finishes.')}</p>
        </div>
      ) : (
        <p className="text-[11px] text-wood-600">{t('Photos are compressed automatically. Videos up to {mb} MB.', { mb: MAX_VIDEO_MB })}</p>
      )}
    </div>
  );
}
