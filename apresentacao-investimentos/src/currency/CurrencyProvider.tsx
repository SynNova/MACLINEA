import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppCurrency } from './currency';
import {
  getInitialBrlPerEur,
  loadStoredCurrency,
  setBrlPerEur as setGlobalBrlPerEur,
  setCurrency as setGlobalCurrency,
} from './currency';

interface CurrencyContextValue {
  currency: AppCurrency;
  setCurrency: (currency: AppCurrency) => void;
  brlPerEur: number;
  setBrlPerEur: (rate: number) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<AppCurrency>(() => loadStoredCurrency() ?? 'BRL');
  const [brlPerEur, setBrlPerEurState] = useState<number>(() => getInitialBrlPerEur(6));

  const value = useMemo<CurrencyContextValue>(() => {
    return {
      currency,
      setCurrency: (c) => {
        setGlobalCurrency(c);
        setCurrencyState(c);
      },
      brlPerEur,
      setBrlPerEur: (rate) => {
        setGlobalBrlPerEur(rate);
        setBrlPerEurState((prev) => {
          if (!Number.isFinite(rate) || rate <= 0) return prev;
          return rate;
        });
      },
    };
  }, [currency, brlPerEur]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency deve ser usado dentro de <CurrencyProvider />');
  return ctx;
}


