import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// 'core' = Bradesco/Unicred/Inter, 'all' = todos, ou array de bancos específicos
export type BancoScope = 'core' | 'all' | string[];

interface BancoScopeContextValue {
  scope: BancoScope;
  setScope: (scope: BancoScope) => void;
  /** Verifica se o scope atual é uma seleção customizada de bancos */
  isCustomSelection: boolean;
  /** Retorna os bancos selecionados como array (para 'core' retorna os 3 principais) */
  selectedBanks: string[];
}

const STORAGE_KEY = 'maclinea_banco_scope';
export const CORE_BANKS = ['BRADESCO', 'UNICREDI', 'UNICRED', 'INTER'];

function getInitialScope(): BancoScope {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // Tenta parsear como array
      if (raw.startsWith('[')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      if (raw === 'all' || raw === 'core') return raw;
    }
  } catch {
    // ignore
  }
  return 'core';
}

const BancoScopeContext = createContext<BancoScopeContextValue | null>(null);

export function BancoScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<BancoScope>(() => getInitialScope());

  useEffect(() => {
    try {
      const toStore = Array.isArray(scope) ? JSON.stringify(scope) : scope;
      window.localStorage.setItem(STORAGE_KEY, toStore);
    } catch {
      // ignore
    }
  }, [scope]);

  const value = useMemo<BancoScopeContextValue>(() => ({
    scope,
    setScope: setScopeState,
    isCustomSelection: Array.isArray(scope),
    selectedBanks: Array.isArray(scope) ? scope : (scope === 'core' ? CORE_BANKS : []),
  }), [scope]);

  return <BancoScopeContext.Provider value={value}>{children}</BancoScopeContext.Provider>;
}

export function useBancoScope(): BancoScopeContextValue {
  const ctx = useContext(BancoScopeContext);
  if (!ctx) throw new Error('useBancoScope deve ser usado dentro de <BancoScopeProvider />');
  return ctx;
}


