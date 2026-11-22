'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { DataProvider } from '@/lib/data';
import { LanguageProvider } from '@/lib/i18n';
import { PwaProvider } from '@/lib/pwa';
import { ConfirmProvider } from '@/components/ui';
import { TourProvider } from '@/components/tour';
import { InstallHelpModal } from '@/components/install-app';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <PwaProvider>
        <AuthProvider>
          <DataProvider>
            <ConfirmProvider>
              <TourProvider>
                {children}
                <InstallHelpModal />
                <Toaster position="top-center" richColors closeButton toastOptions={{ style: { borderRadius: 6 } }} />
              </TourProvider>
            </ConfirmProvider>
          </DataProvider>
        </AuthProvider>
      </PwaProvider>
    </LanguageProvider>
  );
}
