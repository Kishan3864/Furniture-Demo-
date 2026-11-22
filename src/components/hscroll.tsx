'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface HScrollProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: ReactNode;
  /** number of items (columns) inside, used for the "Showing 1–3 of 7" text */
  itemCount?: number;
  /** optional heading shown on the left of the hint row */
  label?: ReactNode;
  ariaLabel?: string;
  /** classes for the inner flex row that holds the items */
  contentClassName?: string;
  /** hide the hint / position row */
  hideHint?: boolean;
}

interface ScrollState {
  canLeft: boolean;
  canRight: boolean;
  /** 0..1 thumb size and position for the position indicator */
  thumb: number;
  pos: number;
  from: number;
  to: number;
}

const INITIAL: ScrollState = { canLeft: false, canRight: false, thumb: 1, pos: 0, from: 0, to: 0 };
const DRAG_THRESHOLD = 5;

/**
 * Horizontal scroller that is obviously scrollable:
 * - mouse click-and-drag, native touch swipe, shift+wheel, arrow keys when focused
 * - arrow buttons + edge fades only when there is more content that way
 * - always-visible styled scrollbar and a position indicator ("Showing 1–3 of 7")
 * Clicks are not hijacked: a click after a real drag (> 5px) is swallowed.
 */
export function HScroll({
  children,
  className,
  itemCount,
  label,
  ariaLabel,
  contentClassName,
  hideHint,
  ...rest
}: HScrollProps) {
  const t = useT();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [s, setS] = useState<ScrollState>(INITIAL);
  const [dragging, setDragging] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0, pointerId: -1 });
  const suppressClick = useRef(false);
  const raf = useRef<number | null>(null);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    const row = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft;
    let from = 0;
    let to = 0;
    if (row) {
      const kids = Array.from(row.children) as HTMLElement[];
      const viewL = left;
      const viewR = left + el.clientWidth;
      kids.forEach((k, i) => {
        const l = k.offsetLeft - row.offsetLeft;
        const r = l + k.offsetWidth;
        const visible = Math.min(r, viewR) - Math.max(l, viewL);
        if (visible >= Math.min(k.offsetWidth, el.clientWidth) * 0.6) {
          if (!from) from = i + 1;
          to = i + 1;
        }
      });
    }
    setS({
      canLeft: left > 2,
      canRight: left < max - 2,
      thumb: el.scrollWidth ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
      pos: max > 0 ? left / max : 0,
      from,
      to,
    });
  }, []);

  const schedule = useCallback(() => {
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    if (rowRef.current) ro.observe(rowRef.current);
    window.addEventListener('resize', schedule);
    return () => {
      el.removeEventListener('scroll', schedule);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [measure, schedule, itemCount]);

  useEffect(() => {
    try {
      setCoarse(window.matchMedia('(pointer: coarse)').matches);
    } catch {
      /* ignore */
    }
  }, []);

  // One gentle "nudge" per session so people notice the area scrolls sideways.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (sessionStorage.getItem('wb-hscroll-nudge')) return;
    } catch {
      /* ignore */
    }
    if (reduce) return;
    const t1 = window.setTimeout(() => {
      if (!el || el.scrollLeft > 0 || el.scrollWidth - el.clientWidth < 40) return;
      try {
        sessionStorage.setItem('wb-hscroll-nudge', '1');
      } catch {
        /* ignore */
      }
      el.scrollTo({ left: 56, behavior: 'smooth' });
      window.setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 550);
    }, 700);
    return () => window.clearTimeout(t1);
  }, []);

  const scrollByPage = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  /* ---------------- mouse drag-to-scroll ---------------- */

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"], [data-no-drag]')) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { active: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft, pointerId: e.pointerId };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scrollerRef.current;
    if (!d.active || !el || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDragging(true);
      el.style.scrollSnapType = 'none';
      el.style.scrollBehavior = 'auto';
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    e.preventDefault();
    el.scrollLeft = d.startScroll - dx;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = scrollerRef.current;
    if (!d.active || e.pointerId !== d.pointerId) return;
    if (d.moved && el) {
      suppressClick.current = true;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      el.style.scrollSnapType = '';
      el.style.scrollBehavior = '';
      // safety: if no click follows the drag, stop suppressing shortly after
      window.setTimeout(() => (suppressClick.current = false), 50);
    }
    drag.current = { ...d, active: false, moved: false };
    setDragging(false);
  };

  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick.current = false;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const el = scrollerRef.current;
    if (!el) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      el.scrollBy({ left: 300, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      el.scrollBy({ left: -300, behavior: 'smooth' });
    } else if (e.key === 'Home') {
      e.preventDefault();
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (e.key === 'End') {
      e.preventDefault();
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
  };

  const scrollable = s.canLeft || s.canRight;
  const count = itemCount ?? rowRef.current?.children.length ?? 0;

  return (
    <div className={cn('relative', className)} {...rest}>
      {!hideHint && (
        <div className="mb-2 flex items-center gap-3">
          {label && <div className="min-w-0 shrink-0 text-sm font-semibold text-wood-900">{label}</div>}
          {scrollable ? (
            <>
              <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-wood-600">
                <MoveHorizontal className="h-4 w-4 shrink-0 text-wood-500" aria-hidden />
                <span className="truncate">
                  {coarse ? t('Swipe sideways to see all columns') : t('Drag with the mouse or use the arrows to see all columns')}
                </span>
              </p>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                {count > 0 && s.from > 0 && (
                  <span className="hidden text-xs font-medium text-wood-700 sm:inline">
                    {t('Showing {from}–{to} of {n}', { from: s.from, to: s.to, n: count })}
                  </span>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => scrollByPage(-1)}
                    disabled={!s.canLeft}
                    aria-label={t('Scroll left')}
                    className="flex h-8 w-8 items-center justify-center rounded border border-wood-200 bg-white text-wood-800 shadow-sm transition hover:bg-wood-50 disabled:opacity-35"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollByPage(1)}
                    disabled={!s.canRight}
                    aria-label={t('Scroll right')}
                    className="flex h-8 w-8 items-center justify-center rounded border border-wood-200 bg-white text-wood-800 shadow-sm transition hover:bg-wood-50 disabled:opacity-35"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <span className="ml-auto" />
          )}
        </div>
      )}

      {scrollable && !hideHint && (
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-wood-100" aria-hidden>
          <div
            className="h-full rounded-full bg-wood-500 transition-[margin] duration-75"
            style={{ width: `${Math.max(8, s.thumb * 100)}%`, marginLeft: `${s.pos * (100 - Math.max(8, s.thumb * 100))}%` }}
          />
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollerRef}
          role="region"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          onDragStart={(e) => e.preventDefault()}
          onKeyDown={onKeyDown}
          className={cn(
            'overflow-x-auto overscroll-x-contain pb-3 outline-none focus-visible:ring-2 focus-visible:ring-wood-300',
            'snap-x snap-proximity scroll-smooth',
            '[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-wood-100',
            '[&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-wood-400 hover:[&::-webkit-scrollbar-thumb]:bg-wood-500',
            scrollable && !coarse && (dragging ? 'cursor-grabbing select-none' : 'cursor-grab'),
          )}
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#c8925a #f4e9d8', WebkitOverflowScrolling: 'touch' }}
        >
          <div ref={rowRef} className={cn('flex w-max gap-3', contentClassName)}>
            {children}
          </div>
        </div>

        {/* edge fades */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-cream-100 to-transparent transition-opacity',
            s.canLeft ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-cream-100 to-transparent transition-opacity',
            s.canRight ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* floating side arrows (desktop) */}
        {s.canLeft && (
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label={t('Scroll left')}
            className="absolute left-1 top-24 z-10 hidden h-10 w-10 items-center justify-center rounded-md border border-wood-200 bg-white/95 text-wood-800 shadow-md transition hover:bg-wood-50 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {s.canRight && (
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label={t('Scroll right')}
            className="absolute right-1 top-24 z-10 hidden h-10 w-10 items-center justify-center rounded-md border border-wood-200 bg-white/95 text-wood-800 shadow-md transition hover:bg-wood-50 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
