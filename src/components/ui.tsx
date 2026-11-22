'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ArrowLeft, Inbox, Loader2, Search, X } from 'lucide-react';
import { cn, daysLeft } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { StoredImg } from './stored-image';

/* ------------------------------ Button ------------------------------ */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantCls: Record<Variant, string> = {
  primary: 'bg-wood-700 text-white hover:bg-wood-800 active:bg-wood-900 shadow-sm',
  secondary: 'bg-wood-100 text-wood-900 hover:bg-wood-200',
  outline: 'border border-wood-200 bg-white text-wood-900 hover:bg-wood-50',
  ghost: 'text-wood-800 hover:bg-wood-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};
const sizeCls: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
};

export function btnCls(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-wood-400',
    variantCls[variant],
    sizeCls[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={btnCls(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  target,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  target?: string;
}) {
  const external = href.startsWith('http');
  if (external || target)
    return (
      <a href={href} target={target || '_blank'} rel="noreferrer" className={btnCls(variant, size, className)}>
        {icon}
        {children}
      </a>
    );
  return (
    <Link href={href} className={btnCls(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}

/* ------------------------------ Form fields ------------------------------ */

export function Field({
  label,
  error,
  hint,
  children,
  className,
  required,
}: {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  const t = useT();
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-wood-900">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{t(error)}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-wood-600/80">{typeof hint === 'string' ? t(hint) : hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl border bg-white px-3 text-[15px] text-wood-950 placeholder:text-wood-400 transition focus:outline-none focus:ring-2 focus:ring-wood-300 disabled:bg-wood-50 disabled:text-wood-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(inputBase, 'h-10', invalid ? 'border-red-400' : 'border-wood-200', className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(inputBase, 'py-2', invalid ? 'border-red-400' : 'border-wood-200', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; options?: (string | { value: string; label: string })[]; placeholder?: string }
>(function Select({ className, invalid, options, placeholder, children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={cn(inputBase, 'h-10 pr-8', invalid ? 'border-red-400' : 'border-wood-200', className)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ),
      )}
      {children}
    </select>
  );
});

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-wood-900 disabled:opacity-50"
      aria-pressed={checked}
    >
      <span className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-wood-700' : 'bg-wood-200')}>
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
      {label}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('inline-flex rounded-xl bg-wood-100 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-medium transition',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-white text-wood-900 shadow-sm' : 'text-wood-700 hover:text-wood-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wood-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? t('Search...')} className="pl-9 pr-8" />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-wood-400 hover:text-wood-700"
          aria-label={t('Clear')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------ Layout bits ------------------------------ */

export function Card({
  className,
  children,
  onClick,
  tour,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  /** anchor for the guided tour (data-tour) */
  tour?: string;
}) {
  return (
    <div
      data-tour={tour}
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-wood-100 bg-white shadow-soft',
        onClick && 'cursor-pointer transition hover:border-wood-200',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 border-b border-wood-100 px-4 py-3', className)}>
      <h3 className="font-semibold text-wood-950">{title}</h3>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: string | boolean;
}) {
  const router = useRouter();
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3" data-tour="page-header">
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <button
            type="button"
            onClick={() => (typeof back === 'string' ? router.push(back) : router.back())}
            className="-ml-1 mt-0.5 rounded-lg p-1.5 text-wood-700 hover:bg-wood-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-wood-950 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-wood-600">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2" data-tour="page-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

type Tone = 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'wood' | 'purple';
const toneCls: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-sky-100 text-sky-800',
  wood: 'bg-wood-100 text-wood-800',
  purple: 'bg-violet-100 text-violet-800',
};

export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        toneCls[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, className, showLabel }: { value: number; className?: string; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const color = v >= 100 ? 'bg-emerald-500' : v >= 90 ? 'bg-emerald-400' : v >= 50 ? 'bg-wood-500' : 'bg-wood-400';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-wood-100">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="w-9 text-right text-xs font-semibold text-wood-700">{v}%</span>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-wood-600', className)} />;
}

export function PageLoader({ label }: { label?: string }) {
  const t = useT();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-wood-600">
      <Spinner className="h-7 w-7" />
      <span className="text-sm">{label ?? t('Loading...')}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-wood-100', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}>
      <div className="mb-3 rounded-2xl bg-wood-100 p-3 text-wood-600">{icon || <Inbox className="h-6 w-6" />}</div>
      <p className="font-semibold text-wood-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-wood-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'wood',
  href,
  sub,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  tone?: 'wood' | 'red' | 'green' | 'amber' | 'blue';
  href?: string;
  sub?: ReactNode;
}) {
  const iconTone = {
    wood: 'bg-wood-100 text-wood-700',
    red: 'bg-red-100 text-red-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-sky-100 text-sky-700',
  }[tone];
  const inner = (
    <div className="flex items-start justify-between gap-2 p-4">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-wood-600">{label}</p>
        <p className={cn('mt-1 text-2xl font-bold', tone === 'red' ? 'text-red-600' : 'text-wood-950')}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-wood-600">{sub}</p>}
      </div>
      {icon && <div className={cn('rounded-xl p-2', iconTone)}>{icon}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl border border-wood-100 bg-white shadow-soft transition hover:border-wood-300">
      {inner}
    </Link>
  ) : (
    <Card>{inner}</Card>
  );
}

/* ------------------------------ Delivery countdown ------------------------------ */

export function DeliveryBadge({ date, delivered }: { date?: string; delivered?: boolean }) {
  const t = useT();
  if (delivered) return <Badge tone="green">{t('Delivered')}</Badge>;
  const d = daysLeft(date);
  if (d === null) return <Badge>-</Badge>;
  if (d < 0) return <Badge tone="red">{t('Overdue {n} DAYS', { n: Math.abs(d) })}</Badge>;
  if (d === 0) return <Badge tone="amber">{t('Today')}</Badge>;
  if (d === 1) return <Badge tone="amber">{t('Tomorrow')}</Badge>;
  if (d <= 7) return <Badge tone="blue">{t('{n} DAYS', { n: d })}</Badge>;
  return <Badge tone="gray">{t('{n} DAYS', { n: d })}</Badge>;
}

export function PriorityBadge({ priority }: { priority?: string }) {
  const t = useT();
  if (priority === 'urgent') return <Badge tone="red">{t('Urgent')}</Badge>;
  if (priority === 'high') return <Badge tone="amber">{t('High')}</Badge>;
  if (priority === 'low') return <Badge tone="gray">{t('Low')}</Badge>;
  return null;
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-wood-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-cream-50 shadow-xl sm:rounded-2xl',
          w,
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-wood-100 px-5 py-3.5">
          <h2 className="text-lg font-semibold text-wood-950">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-wood-600 hover:bg-wood-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-wood-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Confirm dialog ------------------------------ */

interface ConfirmOpts {
  title?: string;
  message?: ReactNode;
  confirmText?: string;
  danger?: boolean;
}
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [opts, setOpts] = useState<ConfirmOpts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirm = useCallback((o: ConfirmOpts) => {
    setOpts(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);
  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title || t('Are you sure?')}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>
              {t('Cancel')}
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {opts?.confirmText || t('Yes')}
            </Button>
          </>
        }
      >
        <div className="text-sm text-wood-800">{opts?.message}</div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);

/* ------------------------------ Responsive table ------------------------------ */

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** hide inside mobile card */
  hideOnMobile?: boolean;
  align?: 'left' | 'right' | 'center';
}

/**
 * Table on md+ screens, stacked cards on mobile.
 * The first column is used as the card title on mobile.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  empty,
  mobileCard,
  rowClassName,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  mobileCard?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) {
  if (!rows.length) return <>{empty ?? <NothingFound />}</>;
  const [first, ...rest] = columns;
  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-wood-100 bg-white shadow-soft md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wood-100 bg-wood-50/70 text-xs uppercase tracking-wide text-wood-600">
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-2.5 font-semibold', alignCls(c.align), c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn(
                  'border-b border-wood-50 last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-wood-50/60',
                  rowClassName?.(r),
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle text-wood-900', alignCls(c.align), c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2.5 md:hidden">
        {rows.map((r) =>
          mobileCard ? (
            <div key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {mobileCard(r)}
            </div>
          ) : (
            <Card
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn('p-3.5', rowClassName?.(r))}
            >
              <div className="mb-2 font-semibold text-wood-950">{first.cell(r)}</div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {rest
                  .filter((c) => !c.hideOnMobile)
                  .map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-wood-500">{c.header}</dt>
                      <dd className="truncate text-wood-900">{c.cell(r)}</dd>
                    </div>
                  ))}
              </dl>
            </Card>
          ),
        )}
      </div>
    </>
  );
}

function NothingFound() {
  const t = useT();
  return <EmptyState title={t('Nothing found')} />;
}

/* ------------------------------ Photo grid ------------------------------ */

export function PhotoGrid({
  photos,
  onRemove,
  className,
}: {
  photos: { url: string; path?: string; caption?: string }[];
  onRemove?: (index: number) => void;
  className?: string;
}) {
  const [view, setView] = useState<string | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <div className={cn('grid grid-cols-3 gap-2 sm:grid-cols-4', className)}>
        {photos.map((p, i) => (
          <div key={p.url + i} className="group relative aspect-square overflow-hidden rounded-xl bg-wood-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <StoredImg
              src={p.url}
              alt={p.caption || 'photo'}
              loading="lazy"
              onClick={() => setView(p.url)}
              className="h-full w-full cursor-zoom-in object-cover"
            />
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {view && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setView(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <StoredImg src={view} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}

/** Hidden file input + button that returns selected images */
export function ImagePickButton({
  onPick,
  children,
  multiple = true,
  capture,
  variant = 'outline',
  size = 'md',
  loading,
  icon,
  className,
}: {
  onPick: (files: File[]) => void;
  children: ReactNode;
  multiple?: boolean;
  capture?: boolean;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        {...(capture ? { capture: 'environment' as const } : {})}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length) onPick(files);
        }}
      />
      <Button variant={variant} size={size} loading={loading} icon={icon} className={className} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </>
  );
}

/** Local preview grid for files not yet uploaded */
export function FilePreviewGrid({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  const t = useT();
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    return () => u.forEach((x) => URL.revokeObjectURL(x));
  }, [files]);
  if (!files.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {urls.map((u, i) => (
        <div key={u} className="relative aspect-square overflow-hidden rounded-xl bg-wood-100 ring-2 ring-dashed ring-wood-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="h-full w-full object-cover opacity-90" />
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{t('New')}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
