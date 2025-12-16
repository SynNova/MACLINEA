export type AppCurrency = 'BRL' | 'EUR';

const STORAGE_KEY_CURRENCY = 'maclinea_currency';
const STORAGE_KEY_BRL_PER_EUR = 'maclinea_brl_per_eur';

function isValidCurrency(value: unknown): value is AppCurrency {
  return value === 'BRL' || value === 'EUR';
}

export function loadStoredCurrency(): AppCurrency | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY_CURRENCY);
    return isValidCurrency(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveStoredCurrency(currency: AppCurrency) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
  } catch {
    // ignore
  }
}

export function loadStoredBrlPerEur(): number | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY_BRL_PER_EUR);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

export function saveStoredBrlPerEur(rate: number) {
  try {
    if (typeof window === 'undefined') return;
    if (!Number.isFinite(rate) || rate <= 0) return;
    window.localStorage.setItem(STORAGE_KEY_BRL_PER_EUR, String(rate));
  } catch {
    // ignore
  }
}

export function getInitialCurrency(fallback: AppCurrency = 'BRL'): AppCurrency {
  return loadStoredCurrency() ?? fallback;
}

export function getInitialBrlPerEur(fallback = 6): number {
  return loadStoredBrlPerEur() ?? fallback;
}

let currentCurrency: AppCurrency = getInitialCurrency('BRL');
let currentBrlPerEur: number = getInitialBrlPerEur(6);

export function getCurrency(): AppCurrency {
  return currentCurrency;
}

export function setCurrency(currency: AppCurrency) {
  currentCurrency = currency;
  saveStoredCurrency(currency);
}

export function getBrlPerEur(): number {
  return currentBrlPerEur;
}

export function setBrlPerEur(rate: number) {
  if (!Number.isFinite(rate) || rate <= 0) return;
  currentBrlPerEur = rate;
  saveStoredBrlPerEur(rate);
}



