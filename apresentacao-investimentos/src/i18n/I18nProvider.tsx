import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppLocale } from './locale';
import { getInitialLocale, setLocale as setGlobalLocale } from './locale';
import { UI_MESSAGES } from './messages';

type Params = Record<string, string | number>;

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Params) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), template);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => getInitialLocale());

  useEffect(() => {
    setGlobalLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: AppLocale) => {
    // Atualiza o "locale" global ANTES do próximo render,
    // para que formatadores (getLocale) reflitam imediatamente.
    setGlobalLocale(next);
    setLocaleState(next);
  }, []);

  const t = useMemo(() => {
    const dict = UI_MESSAGES[locale];
    const fallback = UI_MESSAGES['pt-BR'];
    return (key: string, params?: Params) => {
      const msg = dict[key] ?? fallback[key] ?? key;
      return interpolate(msg, params);
    };
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t,
    };
  }, [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n deve ser usado dentro de <I18nProvider />');
  }
  return ctx;
}


