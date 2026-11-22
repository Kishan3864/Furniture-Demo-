'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Boxes,
  ChartColumn,
  CircleHelp,
  ClipboardList,
  Ellipsis,
  Hammer,
  House,
  LogOut,
  Plus,
  Receipt,
  Ruler,
  Search,
  Settings,
  Truck,
  Users,
  Wallet,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Button, LinkButton, PageLoader } from './ui';
import { GlobalSearch } from './global-search';
import { LanguageSwitch } from './language-switch';
import { InstallBanner, InstallButton } from './install-app';
import { TourButton } from './tour';
import { useT } from '@/lib/i18n';
import { StoredImg } from './stored-image';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const OWNER_NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <House className="h-5 w-5" /> },
  { href: '/orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
  { href: '/sites', label: 'Site Visits', icon: <Ruler className="h-5 w-5" /> },
  { href: '/board', label: 'Work Progress', icon: <Hammer className="h-5 w-5" /> },
  { href: '/delivery', label: 'Deliveries', icon: <Truck className="h-5 w-5" /> },
  { href: '/customers', label: 'Customers', icon: <Users className="h-5 w-5" /> },
  { href: '/payments', label: 'Payments', icon: <Wallet className="h-5 w-5" /> },
  { href: '/karigar', label: 'Workers', icon: <Wrench className="h-5 w-5" /> },
  { href: '/stock', label: 'Stock', icon: <Boxes className="h-5 w-5" /> },
  { href: '/expenses', label: 'Expenses', icon: <Receipt className="h-5 w-5" /> },
  { href: '/reports', label: 'Reports', icon: <ChartColumn className="h-5 w-5" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

const KARIGAR_NAV: NavItem[] = [{ href: '/jobs', label: 'My Jobs', icon: <Hammer className="h-5 w-5" /> }];

const MOBILE_MAIN = ['/', '/orders', '/board', '/delivery'];

function isActive(path: string, href: string) {
  if (href === '/') return path === '/';
  return path === href || path.startsWith(href + '/');
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function Logo({ compact }: { compact?: boolean }) {
  const { settings } = useData();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {settings.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <StoredImg src={settings.logoUrl} alt="" className="h-9 w-9 rounded-xl bg-white object-contain" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-wood-600 to-wood-800 text-sm font-extrabold text-cream-50">
          WB
        </div>
      )}
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-bold text-wood-950">WoodBook</p>
          <p className="truncate text-[11px] text-wood-600">{settings.name || 'Brighton Solution'}</p>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { ready, fbUser, user, isOwner, isKarigar, noProfile, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const online = useOnline();
  const [more, setMore] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    if (ready && !fbUser) router.replace('/login');
  }, [ready, fbUser, router]);

  useEffect(() => {
    if (isKarigar && !path.startsWith('/jobs') && !path.startsWith('/help')) router.replace('/jobs');
  }, [isKarigar, path, router]);

  useEffect(() => {
    setMore(false);
  }, [path]);

  useEffect(() => {
    if (!isOwner) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOwner]);

  const nav = isOwner ? OWNER_NAV : KARIGAR_NAV;
  const mobileMain = useMemo(() => OWNER_NAV.filter((n) => MOBILE_MAIN.includes(n.href)), []);
  const mobileMore = useMemo(() => OWNER_NAV.filter((n) => !MOBILE_MAIN.includes(n.href)), []);

  if (!ready || (fbUser && !user && !noProfile)) return <PageLoader />;
  if (!fbUser) return <PageLoader label={t('Opening sign in...')} />;
  if (noProfile)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl border border-wood-100 bg-white p-6 text-center shadow-soft">
          <p className="text-lg font-bold text-wood-950">{t('Account not active')}</p>
          <p className="mt-2 text-sm text-wood-700">
            {t('Your login ({email}) is not linked to this workshop or has been turned off. Please contact the owner.', { email: fbUser.email })}
          </p>
          <Button className="mt-5 w-full" variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
            {t('Sign out')}
          </Button>
        </div>
      </div>
    );
  if (isKarigar && !path.startsWith('/jobs') && !path.startsWith('/help')) return <PageLoader />;

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-wood-100 bg-cream-50 lg:flex">
        <div className="px-4 py-4">
          <Logo />
        </div>
        {isOwner && (
          <div className="px-3 pb-2" data-tour="new-order">
            <LinkButton href="/orders/new" className="w-full" icon={<Plus className="h-4 w-4" />}>
              {t('New Order')}
            </LinkButton>
          </div>
        )}
        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive(path, n.href) ? 'bg-wood-700 text-white' : 'text-wood-800 hover:bg-wood-100',
              )}
            >
              {n.icon}
              {t(n.label)}
            </Link>
          ))}
        </nav>
        <div className="space-y-0.5 border-t border-wood-100 px-3 py-2">
          <Link
            href="/help"
            className={cn(
              'flex h-9 items-center gap-3 whitespace-nowrap rounded-xl px-3 text-sm font-medium',
              isActive(path, '/help') ? 'bg-wood-700 text-white' : 'text-wood-800 hover:bg-wood-100',
            )}
          >
            <CircleHelp className="h-4 w-4" />
            {t('How to use')}
          </Link>
          <InstallButton
            variant="ghost"
            className="h-9 w-full justify-start gap-3 whitespace-nowrap px-3 font-medium text-wood-800"
          />
          <TourButton variant="ghost" className="h-9 w-full justify-start gap-3 whitespace-nowrap px-3 font-medium text-wood-800" />
        </div>
        <div className="border-t border-wood-100 p-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-wood-700 text-xs font-bold uppercase text-white">
              {(user?.name || '?').slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-wood-900">{user?.name}</p>
              <p className="truncate text-[11px] leading-tight text-wood-600">
                {user?.role === 'owner' ? t('Admin') : t('Worker')} · {user?.email}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded p-1.5 text-wood-600 hover:bg-wood-100 hover:text-wood-900"
              aria-label={t('Sign out')}
              title={t('Sign out')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <LanguageSwitch className="mt-2.5 px-1" />
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-wood-100 bg-cream-100/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            <WifiOff className="h-3.5 w-3.5" /> {t('You are offline - showing saved data. Changes will sync when internet is back.')}
          </div>
        )}
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <div className="lg:hidden">
            <Logo compact={isOwner} />
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              data-tour="search"
              className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-wood-200 bg-white px-3 text-left text-sm text-wood-400 hover:border-wood-300 lg:max-w-md"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">{t('Search customer, phone or order no...')}</span>
              <kbd className="ml-auto hidden rounded border border-wood-200 px-1.5 text-[10px] text-wood-500 sm:inline">Ctrl K</kbd>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          <InstallButton iconOnly variant="ghost" className="lg:hidden" />
          {isOwner && (
            <LinkButton href="/orders/new" size="md" className="hidden sm:inline-flex lg:hidden" icon={<Plus className="h-4 w-4" />}>
              {t('New Order')}
            </LinkButton>
          )}
          {isKarigar && (
            <>
              <Link href="/help" className="rounded p-2 text-wood-700 hover:bg-wood-100 lg:hidden" aria-label={t('How to use')}>
                <CircleHelp className="h-4 w-4" />
              </Link>
              <TourButton iconOnly className="lg:hidden" />
              <LanguageSwitch className="lg:hidden" showIcon={false} />
              <Button variant="ghost" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={logout} className="lg:hidden">
                {t('Sign out')}
              </Button>
            </>
          )}
        </div>
      </header>

      <main key={path} className="mx-auto max-w-6xl animate-page px-4 pb-28 pt-4 lg:pb-10">
        {children}
      </main>

      {/* Install invitation on phones */}
      <div className={cn('fixed inset-x-3 z-30 lg:hidden', isOwner ? 'bottom-[88px]' : 'bottom-3')}>
        <InstallBanner />
      </div>

      {/* Mobile bottom nav (owner) */}
      {isOwner && (
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-wood-100 bg-cream-50/95 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2">
            {mobileMain.slice(0, 2).map((n) => (
              <MobileTab key={n.href} item={n} active={isActive(path, n.href)} />
            ))}
            <div className="flex justify-center">
              <Link
                href="/orders/new"
                data-tour="new-order"
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-wood-700 text-white shadow-lg shadow-wood-900/30"
                aria-label={t('New Order')}
              >
                <Plus className="h-7 w-7" />
              </Link>
            </div>
            {mobileMain.slice(2, 3).map((n) => (
              <MobileTab key={n.href} item={n} active={isActive(path, n.href)} />
            ))}
            <button
              type="button"
              onClick={() => setMore(true)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                mobileMore.some((m) => isActive(path, m.href)) || path === '/delivery' ? 'text-wood-800' : 'text-wood-500',
              )}
            >
              <Ellipsis className="h-5 w-5" />
              {t('More')}
            </button>
          </div>
        </nav>
      )}

      {/* Mobile "More" sheet */}
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-wood-950/40" onClick={() => setMore(false)} />
          <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-3xl bg-cream-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-wood-950">{t('Menu')}</p>
              <button onClick={() => setMore(false)} className="rounded-lg p-1.5 hover:bg-wood-100" aria-label={t('Close')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[...OWNER_NAV.filter((n) => n.href === '/delivery'), ...mobileMore].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium',
                    isActive(path, n.href) ? 'bg-wood-700 text-white' : 'bg-white text-wood-800',
                  )}
                >
                  {n.icon}
                  {t(n.label)}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-wood-600">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
                {t('Sign out')}
              </Button>
            </div>
            <Link
              href="/help"
              className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-wood-200 bg-white text-sm font-semibold text-wood-800"
            >
              <CircleHelp className="h-4 w-4" /> {t('How to use')}
            </Link>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <InstallButton size="md" className="w-full whitespace-nowrap" />
              <TourButton variant="outline" size="md" className="w-full whitespace-nowrap" />
            </div>
            <div className="mt-3 flex justify-center">
              <LanguageSwitch />
            </div>
          </div>
        </div>
      )}

      {isOwner && <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  const t = useT();
  return (
    <Link
      href={item.href}
      className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-wood-800' : 'text-wood-500')}
    >
      <span className={cn('rounded-lg px-3 py-0.5', active && 'bg-wood-100')}>{item.icon}</span>
      <span className="max-w-full truncate">{item.label === 'Work Progress' ? t('Progress') : t(item.label)}</span>
    </Link>
  );
}
