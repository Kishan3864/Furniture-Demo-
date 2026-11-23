'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useT } from '@/lib/i18n';
import { OWNER_TOUR, WORKER_TOUR, type TourContext, type TourStep } from '@/lib/tour-steps';
import { cn } from '@/lib/utils';
import { Button } from './ui';

const DONE_KEY = 'wb-tour-done-v1';

interface TourCtx {
  active: boolean;
  start: () => void;
  stop: () => void;
}
const Ctx = createContext<TourCtx>({ active: false, start: () => {}, stop: () => {} });
export const useTour = () => useContext(Ctx);

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(name?: string): HTMLElement | null {
  if (!name) return null;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return (
    els.find((el) => {
      const r = el.getBoundingClientRect();
      const st = window.getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
    }) || null
  );
}

function routeMatches(path: string, route: string) {
  return path === route || (route !== '/' && path.replace(/\/$/, '') === route.replace(/\/$/, ''));
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, isOwner, isKarigar } = useAuth();
  const { orders, loading } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [searching, setSearching] = useState(false);
  const [offer, setOffer] = useState(false);
  const dir = useRef<1 | -1>(1);

  const ctx: TourContext = useMemo(
    () => ({ firstOrderId: orders[0]?.id || null, userName: user?.name || '' }),
    [orders, user?.name],
  );
  const steps: TourStep[] = useMemo(() => (isOwner ? OWNER_TOUR : isKarigar ? WORKER_TOUR : []), [isOwner, isKarigar]);

  const markDone = () => {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const start = useCallback(() => {
    setOffer(false);
    dir.current = 1;
    setIndex(0);
    setActive(true);
  }, []);
  const stop = useCallback(() => {
    setActive(false);
    setRect(null);
    markDone();
  }, []);

  // Offer the tour once per device after the first sign in
  useEffect(() => {
    if (!user || loading || active || !steps.length) return;
    let done = false;
    try {
      done = localStorage.getItem(DONE_KEY) === '1';
    } catch {
      done = true;
    }
    if (!done) {
      const id = setTimeout(() => setOffer(true), 900);
      return () => clearTimeout(id);
    }
  }, [user, loading, active, steps.length]);

  const step = active ? steps[index] : undefined;
  const route = step?.route ? (typeof step.route === 'function' ? step.route(ctx) : step.route) : undefined;

  // Skip steps whose route can't be resolved (e.g. no orders yet)
  useEffect(() => {
    if (!active || !step) return;
    if (step.route && route === null) {
      const next = index + dir.current;
      if (next < 0 || next >= steps.length) stop();
      else setIndex(next);
    }
  }, [active, step, route, index, steps.length, stop]);

  // Navigate to the step's page
  useEffect(() => {
    if (!active || !route) return;
    if (!routeMatches(pathname, route)) router.push(route);
  }, [active, route, pathname, router]);

  // Find + follow the target element
  useEffect(() => {
    if (!active || !step) return;
    if (route && !routeMatches(pathname, route)) {
      setRect(null);
      setSearching(true);
      return;
    }
    if (!step.target) {
      setRect(null);
      setSearching(false);
      return;
    }
    let raf = 0;
    let el: HTMLElement | null = null;
    let tries = 0;
    let scrolled = false;
    setSearching(true);
    const measure = () => {
      if (!el || !el.isConnected) el = findTarget(step.target);
      if (el) {
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        }
        const r = el.getBoundingClientRect();
        setRect((prev) =>
          prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && prev.width === r.width && prev.height === r.height
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        );
        setSearching(false);
      } else if (++tries > 240) {
        // ~4s without target: show the step centred
        setRect(null);
        setSearching(false);
        return;
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [active, step, route, pathname]);

  const go = useCallback(
    (d: 1 | -1) => {
      dir.current = d;
      const next = index + d;
      if (next >= steps.length) return stop();
      if (next < 0) return;
      setRect(null);
      setIndex(next);
    },
    [index, steps.length, stop],
  );

  // Keyboard: ← → Esc
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, go, stop]);

  const value = useMemo(() => ({ active, start, stop }), [active, start, stop]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {active && step && (
        <TourOverlay
          step={step}
          index={index}
          total={steps.length}
          rect={rect}
          searching={searching}
          onNext={() => go(1)}
          onBack={() => go(-1)}
          onClose={stop}
          vars={{ name: ctx.userName }}
        />
      )}
      {offer && !active && (
        <div className="fixed inset-x-3 bottom-24 z-[65] mx-auto max-w-sm border border-wood-200 bg-white p-4 shadow-xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="rounded bg-wood-100 p-2 text-wood-700">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-wood-950">{t('New to FurniCraft?')}</p>
              <p className="mt-0.5 text-sm text-wood-700">{t('Take a quick guided tour of how to add orders, track work, deliver and collect payments.')}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={start}>
                  {t('Start tour')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOffer(false);
                    markDone();
                  }}
                >
                  {t('Not now')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function TourOverlay({
  step,
  index,
  total,
  rect,
  searching,
  onNext,
  onBack,
  onClose,
  vars,
}: {
  step: TourStep;
  index: number;
  total: number;
  rect: Rect | null;
  searching: boolean;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  vars: Record<string, string>;
}) {
  const t = useT();
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(220);
  const [vp, setVp] = useState({ w: 1024, h: 768 });

  useEffect(() => {
    const upd = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);
  useEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  });

  const pad = 6;
  const hole = rect
    ? {
        top: Math.max(4, rect.top - pad),
        left: Math.max(4, rect.left - pad),
        width: Math.min(rect.width + pad * 2, vp.w - 8),
        height: Math.min(rect.height + pad * 2, vp.h - 8),
      }
    : null;

  // Card position: below the target if there is room, else above, else bottom of screen
  const cardW = Math.min(360, vp.w - 24);
  let style: React.CSSProperties;
  if (!hole) {
    style = { left: (vp.w - cardW) / 2, top: Math.max(16, (vp.h - cardH) / 2), width: cardW };
  } else {
    const below = hole.top + hole.height + 12;
    const above = hole.top - 12 - cardH;
    const left = Math.min(Math.max(12, hole.left + hole.width / 2 - cardW / 2), vp.w - cardW - 12);
    if (below + cardH < vp.h - 8) style = { left, top: below, width: cardW };
    else if (above > 8) style = { left, top: above, width: cardW };
    else style = { left: (vp.w - cardW) / 2, top: vp.h - cardH - 12, width: cardW };
  }

  const last = index === total - 1;
  return (
    <div className="fixed inset-0 z-[70]" aria-live="polite">
      {/* click blocker */}
      <div className={cn('absolute inset-0', !hole && 'bg-wood-950/60')} />
      {hole && (
        <div
          className="pointer-events-none absolute rounded-lg border-2 border-wood-300 transition-all duration-200"
          style={{ ...hole, boxShadow: '0 0 0 9999px rgba(30, 18, 10, 0.62)' }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        className="absolute rounded-lg border border-wood-200 bg-white shadow-2xl transition-[top,left] duration-200"
        style={style}
      >
        <div className="h-1 w-full overflow-hidden rounded-t-lg bg-wood-100">
          <div className="h-full bg-wood-600 transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <div className="p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-wood-500">
              {t('Step {n} of {total}', { n: index + 1, total })}
            </span>
            <button onClick={onClose} className="rounded p-1 text-wood-500 hover:bg-wood-100" aria-label={t('Close tour')}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-base font-bold text-wood-950">{t(step.title, vars)}</h3>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-wood-800">{t(step.body, vars)}</p>
          {searching && <p className="mt-2 text-xs text-wood-500">{t('Opening...')}</p>}
          <div className="mt-4 flex items-center justify-between gap-2">
            <button onClick={onClose} className="text-xs font-medium text-wood-600 hover:underline">
              {t('Skip tour')}
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button size="sm" variant="outline" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
                  {t('Back')}
                </Button>
              )}
              <Button size="sm" onClick={onNext}>
                {last ? t('Finish') : t('Next')}
                {!last && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Button to (re)start the tour. */
export function TourButton({
  className,
  variant = 'ghost',
  size = 'sm',
  iconOnly,
}: {
  className?: string;
  variant?: 'ghost' | 'outline' | 'secondary' | 'primary';
  size?: 'sm' | 'md';
  iconOnly?: boolean;
}) {
  const { start } = useTour();
  const t = useT();
  return (
    <Button
      variant={variant}
      size={iconOnly ? 'icon' : size}
      className={className}
      icon={<Compass className="h-4 w-4" />}
      onClick={start}
      aria-label={t('Take a tour')}
    >
      {iconOnly ? null : t('Take a tour')}
    </Button>
  );
}
