'use client';

import { Languages } from 'lucide-react';
import { LANGUAGES, useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** English / Hinglish segmented switch. English is the default; the choice is saved on this device. */
export function LanguageSwitch({ className, showIcon = true }: { className?: string; showIcon?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      {showIcon && <Languages className="h-4 w-4 text-wood-500" aria-hidden />}
      <div className="inline-flex h-9 items-center rounded-lg border border-wood-200 bg-white p-0.5" role="group" aria-label="Language">
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLang(l.value)}
            aria-pressed={lang === l.value}
            className={cn(
              'h-full whitespace-nowrap rounded-md px-3 text-xs font-semibold transition',
              lang === l.value ? 'bg-wood-700 text-white shadow-sm' : 'text-wood-700 hover:bg-wood-50',
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
