'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { HI } from '@/i18n';

/**
 * i18n: English is the default language and the English text itself is the key.
 * Hinglish is optional: `t('New Order')` returns the Hinglish value from src/i18n/hi-*.ts when selected.
 * Placeholders use {name}: t('Only {amount} is due', { amount: '₹500' }).
 * Unknown keys (e.g. user-entered stage names) fall back to the text itself.
 */
export type Lang = 'en' | 'hi';
export type Vars = Record<string, string | number | null | undefined>;

export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hinglish' },
];

const STORAGE_KEY = 'wb-lang';
let current: Lang = 'en';

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

/** Translate outside React (toast helpers, error mapping). Prefer useT() inside components. */
export function tr(text: string, vars?: Vars): string {
  if (!text) return text;
  const base = current === 'hi' ? HI[text] ?? text : text;
  return interpolate(base, vars);
}

export type TFn = (text: string, vars?: Vars) => string;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {}, t: (s, v) => interpolate(s, v) });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') {
        current = saved;
        setLangState(saved);
      }
    } catch {
      /* storage blocked - keep English */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    current = l;
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    current = lang;
    document.documentElement.lang = lang === 'hi' ? 'hi-Latn' : 'en';
  }, [lang]);

  const value = useMemo<LangCtx>(
    () => ({
      lang,
      setLang,
      t: (text, vars) => {
        if (!text) return text;
        return interpolate(lang === 'hi' ? HI[text] ?? text : text, vars);
      },
    }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLang = () => {
  const { lang, setLang } = useContext(Ctx);
  return { lang, setLang };
};
