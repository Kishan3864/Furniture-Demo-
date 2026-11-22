'use client';

import { Languages } from 'lucide-react';
import { LANGUAGES, useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Compact English / Hinglish switch. English is the default; the choice is saved on this device. */
export function LanguageSwitch({ className, showIcon = true }: { className?: string; showIcon?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      {showIcon && <Languages className="h-4 w-4 text-wood-500" aria-hidden />}
      <div className="inline-flex rounded-lg bg-wood-100 p-0.5" role="group" aria-label="Language">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLang(l.value)}
            aria-pressed={lang === l.value}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-semibold transition',
              lang === l.value ? 'bg-white text-wood-900 shadow-sm' : 'text-wood-600 hover:text-wood-900',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
