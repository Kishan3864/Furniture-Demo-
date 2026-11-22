'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { PageLoader } from '@/components/ui';

export default function PrintLayout({ children }: { children: ReactNode }) {
  const { ready, fbUser, isOwner } = useAuth();
  const { loading } = useData();

  if (!ready) return <PageLoader />;
  if (!fbUser || !isOwner)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-2xl border border-wood-100 bg-white p-6 text-center shadow-soft">
          <p className="text-lg font-bold text-wood-950">Login zaroori hai</p>
          <p className="mt-2 text-sm text-wood-700">Bill aur receipt sirf owner dekh sakta hai.</p>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-wood-700 px-4 py-2 text-sm font-medium text-white">
            Login karein
          </Link>
        </div>
      </div>
    );
  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-cream-100 px-2 py-4 sm:px-4 sm:py-8 print:bg-white print:p-0">
      <div className="print-area mx-auto w-full max-w-[210mm] rounded-2xl border border-wood-100 bg-white p-5 text-black shadow-soft sm:p-10">
        {children}
      </div>
    </div>
  );
}
