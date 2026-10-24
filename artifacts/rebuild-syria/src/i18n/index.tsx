/**
 * Lightweight i18n (no dependencies).
 *
 *   const { language, setLanguage, t, label, errorMessage, errorDetails, dir, isRtl,
 *           fmtNumber, fmtDate, fmtDateTime, locale } = useI18n();
 *
 *  - language: 'ar' | 'en' (default 'ar'; persisted in localStorage `rebuild-syria-language`;
 *    invalid/unavailable storage safely falls back to 'ar').
 *  - setLanguage(lang): updates state, storage and <html lang dir> immediately.
 *  - t(key, vars?): dictionary lookup, `{name}` placeholders. Keys are type-checked against ar.ts.
 *  - label(value): DISPLAY label for canonical values (categories, statuses, roles, skills,
 *    priorities, badges, Arabic-canonical city names). Unknown values are returned unchanged.
 *    Canonical values themselves are never changed.
 *  - errorMessage(error, fallbackKey?): translated message for any thrown value. Known server
 *    strings -> mapped key; else fallbackKey; else HTTP status mapping; else generic.
 *  - errorDetails(error): raw technical text for unmapped errors ('' if none) — show it only
 *    inside a clearly labelled "technical details" block.
 *  - fmtNumber / fmtDate / fmtDateTime: locale-aware formatting (ar-SY / en-US).
 */
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ar, type Dict } from './ar';
import { en } from './en';
import { errorDetails as rawDetails, errorKey } from './errors';

export type Language = 'ar' | 'en';
export type TKey = keyof Dict;
export const STORAGE_KEY = 'rebuild-syria-language';
const dictionaries: Record<Language, Dict> = { ar, en };

export function readStoredLanguage(): Language {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' ? 'en' : 'ar';
  } catch { return 'ar'; }
}

function applyDocument(language: Language) {
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
}

type Vars = Record<string, string | number>;
interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TKey, vars?: Vars) => string;
  label: (value: string | null | undefined) => string;
  errorMessage: (error: unknown, fallbackKey?: TKey) => string;
  errorDetails: (error: unknown) => string;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
  locale: string;
  fmtNumber: (n: number) => string;
  fmtDate: (value: string | number | Date) => string;
  fmtDateTime: (value: string | number | Date) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(() => {
    const initial = readStoredLanguage();
    if (typeof document !== 'undefined') applyDocument(initial);
    return initial;
  });
  useLayoutEffect(() => { applyDocument(language); }, [language]);

  const setLanguage = useCallback((next: Language) => {
    applyDocument(next);
    setLang(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[language];
    const locale = language === 'ar' ? 'ar-SY' : 'en-US';
    const t = (key: TKey, vars?: Vars) => {
      let s = dict[key] ?? ar[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    };
    return {
      language, setLanguage, t, locale,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      isRtl: language === 'ar',
      label: value => {
        if (!value) return '';
        const key = `val.${value}` as TKey;
        return key in dict ? dict[key] : value;
      },
      errorMessage: (error, fallbackKey) => t(errorKey(error, fallbackKey)),
      errorDetails: rawDetails,
      fmtNumber: n => n.toLocaleString(locale),
      fmtDate: v => new Date(v).toLocaleDateString(locale),
      fmtDateTime: v => new Date(v).toLocaleString(locale),
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>');
  return ctx;
}
