'use client';

import { useEffect, useState } from 'react';
import { Download, MonitorDown, Plus, Share, Smartphone, X } from 'lucide-react';
import { usePwa } from '@/lib/pwa';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, Modal } from './ui';

/** "Install app" button. Hidden when already running as an installed app. */
export function InstallButton({
  className,
  variant = 'outline',
  size = 'sm',
  label,
  iconOnly,
}: {
  className?: string;
  variant?: 'outline' | 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'icon';
  label?: string;
  iconOnly?: boolean;
}) {
  const { isStandalone, install } = usePwa();
  const t = useT();
  if (isStandalone) return null;
  return (
    <Button
      variant={variant}
      size={iconOnly ? 'icon' : size}
      className={className}
      icon={<Download className="h-4 w-4" />}
      onClick={() => void install()}
      aria-label={t('Install app')}
      data-tour="install"
    >
      {iconOnly ? null : label ?? t('Install app')}
    </Button>
  );
}

/** Step-by-step help when the browser has no native install prompt (iPhone Safari, Firefox, etc.). */
export function InstallHelpModal() {
  const { helpOpen, setHelpOpen, isIOS } = usePwa();
  const t = useT();
  return (
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={t('Install WoodBook')} size="sm">
      <div className="space-y-4 text-sm text-wood-900">
        <p className="text-wood-700">{t('Install once and open WoodBook full screen from your home screen, like a normal app.')}</p>
        {isIOS ? (
          <ol className="space-y-3">
            <Step n={1} icon={<Share className="h-4 w-4" />}>
              {t('Open this page in Safari and tap the Share button at the bottom.')}
            </Step>
            <Step n={2} icon={<Plus className="h-4 w-4" />}>
              {t('Scroll down and tap "Add to Home Screen".')}
            </Step>
            <Step n={3} icon={<Smartphone className="h-4 w-4" />}>
              {t('Tap "Add". WoodBook now appears on your home screen.')}
            </Step>
          </ol>
        ) : (
          <ol className="space-y-3">
            <Step n={1} icon={<MonitorDown className="h-4 w-4" />}>
              {t('Chrome / Edge: click the install icon in the address bar, or open the browser menu (⋮) and choose "Install app" / "Add to Home screen".')}
            </Step>
            <Step n={2} icon={<Smartphone className="h-4 w-4" />}>
              {t('Android: open the Chrome menu (⋮) and tap "Install app" or "Add to Home screen".')}
            </Step>
          </ol>
        )}
      </div>
    </Modal>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-wood-700 text-xs font-bold text-white">{n}</span>
      <span className="flex-1 pt-1">
        <span className="mr-1.5 inline-flex align-[-2px] text-wood-600">{icon}</span>
        {children}
      </span>
    </li>
  );
}

const DISMISS_KEY = 'wb-install-dismissed';

/** Bottom banner on phones inviting the user to install. Dismissal is remembered for 7 days on this device. */
export function InstallBanner({ className }: { className?: string }) {
  const { isStandalone, install, canPrompt, isIOS } = usePwa();
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone) return setShow(false);
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    } catch {
      /* ignore */
    }
    const recent = Date.now() - dismissedAt < 7 * 24 * 3600 * 1000;
    const mobile = window.matchMedia('(max-width: 1023px)').matches;
    setShow(mobile && !recent && (canPrompt || isIOS));
  }, [isStandalone, canPrompt, isIOS]);

  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className={cn('flex items-center gap-3 border border-wood-200 bg-white p-3 shadow-lg', 'rounded-lg', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" className="h-10 w-10 rounded" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-wood-950">{t('Install WoodBook app')}</p>
        <p className="truncate text-xs text-wood-600">{t('Opens full screen, faster, works offline')}</p>
      </div>
      <Button size="sm" onClick={() => void install().then((ok) => ok && setShow(false))}>
        {t('Install')}
      </Button>
      <button onClick={dismiss} className="rounded p-1 text-wood-500 hover:bg-wood-100" aria-label={t('Close')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
