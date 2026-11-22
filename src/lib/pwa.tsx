'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { tr } from './i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaCtx {
  /** Browser offered a native install prompt (Chrome / Edge / Android) */
  canPrompt: boolean;
  /** Running as an installed app */
  isStandalone: boolean;
  isIOS: boolean;
  /** Install via native prompt; returns false when manual steps are needed */
  install: () => Promise<boolean>;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
}

const Ctx = createContext<PwaCtx>({
  canPrompt: false,
  isStandalone: false,
  isIOS: false,
  install: async () => false,
  helpOpen: false,
  setHelpOpen: () => {},
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setStandalone] = useState(false);
  const [isIOS, setIOS] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const check = () =>
      setStandalone(mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    check();
    mq.addEventListener?.('change', check);
    const ua = navigator.userAgent;
    setIOS(/iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
      toast.success(tr('WoodBook app installed'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      mq.removeEventListener?.('change', check);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Service worker: register in production + tell the user when a new version is active
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    const onChange = () => {
      if (!hadController || refreshing) return;
      toast(tr('A new version of WoodBook is ready'), {
        duration: 15000,
        action: {
          label: tr('Reload'),
          onClick: () => {
            refreshing = true;
            window.location.reload();
          },
        },
      });
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    const register = () =>
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // check for updates when the app comes back to the foreground
          document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
        })
        .catch((e) => console.warn('SW register failed', e));
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) {
      setHelpOpen(true);
      return false;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
    setDeferred(null);
    return choice.outcome === 'accepted';
  }, [deferred]);

  return (
    <Ctx.Provider value={{ canPrompt: !!deferred, isStandalone, isIOS, install, helpOpen, setHelpOpen }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePwa = () => useContext(Ctx);
