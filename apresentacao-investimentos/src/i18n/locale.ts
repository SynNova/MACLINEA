export type AppLocale = 'pt-BR' | 'it-IT';

const STORAGE_KEY = 'maclinea_locale';

function isValidLocale(value: unknown): value is AppLocale {
  return value === 'pt-BR' || value === 'it-IT';
}

export function loadStoredLocale(): AppLocale | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isValidLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveStoredLocale(locale: AppLocale) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

export function detectBrowserLocale(): AppLocale | null {
  try {
    if (typeof navigator === 'undefined') return null;
    const lang = (navigator.language || '').toLowerCase();
    if (lang.startsWith('it')) return 'it-IT';
    if (lang.startsWith('pt')) return 'pt-BR';
    return null;
  } catch {
    return null;
  }
}

export function getInitialLocale(): AppLocale {
  return loadStoredLocale() ?? detectBrowserLocale() ?? 'pt-BR';
}

let currentLocale: AppLocale = getInitialLocale();

export function getLocale(): AppLocale {
  return currentLocale;
}

export function setLocale(locale: AppLocale) {
  currentLocale = locale;
  saveStoredLocale(locale);
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'it-IT' ? 'it' : 'pt-BR';
    }
  } catch {
    // ignore
  }
}



