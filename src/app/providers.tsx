'use client';

import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';
import { DataProvider } from '@/lib/data';
import { ConfirmProvider } from '@/components/ui';

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW register failed', e));
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
  }, []);

  return (
    <LanguageProvider>
    <AuthProvider>
      <DataProvider>
        <ConfirmProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{ style: { borderRadius: 14 } }}
          />
        </ConfirmProvider>
      </DataProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}
