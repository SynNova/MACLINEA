import { useState, useEffect, useMemo } from 'react';
import type { 
  Movimento, 
  DadosProcessados, 
  ResumoFinanceiro, 
  OrigemRecursos,
  CategoriaAgregada,
  FluxoDiario 
} from '../types/movimento';
import { 
  parseMovimentosCSV, 
  isAporteBrivio, 
  isAporteIanco, 
  isVenda, 
  isDespesaValida,
  getGrupoDespesa 
} from '../utils/csvParser';
import { formatDate } from '../utils/formatters';
import { COLORS } from '../utils/colors';
import { isBancoPermitido, isBancoEspecifico, extractBancoNome } from '../utils/bancoFilter';
import { useBancoScope } from '../filters/BancoScopeProvider';
import { withBase } from '../utils/assetUrl';

interface UseMovimentosResult {
  dados: DadosProcessados | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMovimentos(csvUrl: string = withBase('dados/movimentos.csv')): UseMovimentosResult {
  const { scope } = useBancoScope();
  const [movimentosRaw, setMovimentosRaw] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const data = await parseMovimentosCSV(csvUrl);
        if (!cancelled) {
          setMovimentosRaw(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Erro ao carregar dados'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [csvUrl, fetchKey]);

  const dados = useMemo<DadosProcessados | null>(() => {
    // Filtra por escopo de banco
    let movimentos: Movimento[];
    if (scope === 'all') {
      movimentos = movimentosRaw;
    } else if (scope === 'core') {
      movimentos = movimentosRaw.filter((m) => isBancoPermitido(m.banco));
    } else if (Array.isArray(scope)) {
      // Múltiplos bancos selecionados
      movimentos = movimentosRaw.filter((m) => {
        const nomeBanco = extractBancoNome(m.banco);
        return scope.some(s => nomeBanco === s || nomeBanco.includes(s) || s.includes(nomeBanco));
      });
    } else {
      // Banco específico selecionado (compatibilidade)
      movimentos = movimentosRaw.filter((m) => isBancoEspecifico(m.banco, scope));
    }

    if (movimentos.length === 0) return null;

    // Calcula aportes
    const aportesBrivio = movimentos.filter(isAporteBrivio);
    const aportesIanco = movimentos.filter(isAporteIanco);
    const totalBrivio = aportesBrivio.reduce((sum, m) => sum + m.credito, 0);
    const totalIanco = aportesIanco.reduce((sum, m) => sum + m.credito, 0);
    const totalAportes = totalBrivio + totalIanco;

    // Calcula vendas
    const vendas = movimentos.filter(isVenda);
    const totalVendas = vendas.reduce((sum, m) => sum + m.credito, 0);

    // Calcula despesas (excluindo transferências internas)
    const despesas = movimentos.filter(isDespesaValida);
    const totalDespesas = despesas.reduce((sum, m) => sum + m.debito, 0);

    // Período
    const datas = movimentos.map(m => m.data).sort((a, b) => a.getTime() - b.getTime());
    const periodoInicio = formatDate(datas[0]);
    const periodoFim = formatDate(datas[datas.length - 1]);

    // Resumo
    const resumo: ResumoFinanceiro = {
      totalAportes,
      aporteBrivio: totalBrivio,
      aporteIanco: totalIanco,
      totalVendas,
      totalDespesas,
      saldoFinal: totalAportes + totalVendas - totalDespesas,
      periodoInicio,
      periodoFim,
    };

    // Origens dos recursos
    const origens: OrigemRecursos[] = [
      {
        nome: 'Família Brivio',
        valor: totalBrivio,
        percentual: (totalBrivio / totalAportes) * 100,
        cor: COLORS.maclinea.DEFAULT,
        descricao: 'Câmbio Financeiro - Itália',
        data: aportesBrivio[0]?.dataStr || '',
      },
      {
        nome: 'IANCO / Usifix',
        valor: totalIanco,
        percentual: (totalIanco / totalAportes) * 100,
        cor: COLORS.usifix.DEFAULT,
        descricao: 'PIX via Usifix',
        data: aportesIanco[0]?.dataStr || '',
      },
    ];

    // Agrupa despesas por grupo (categoria consolidada)
    const despesasPorGrupo = new Map<string, Movimento[]>();
    despesas.forEach(mov => {
      const grupo = getGrupoDespesa(mov.categoriaId);
      const lista = despesasPorGrupo.get(grupo) || [];
      lista.push(mov);
      despesasPorGrupo.set(grupo, lista);
    });

    // Cria categorias agregadas
    const categorias: CategoriaAgregada[] = Array.from(despesasPorGrupo.entries())
      .map(([grupo, lista]) => {
        const total = lista.reduce((sum, m) => sum + m.debito, 0);
        const sorted = [...lista].sort((a, b) => b.debito - a.debito);
        return {
          categoria: grupo,
          categoriaId: lista[0]?.categoriaId || 0,
          total,
          count: lista.length,
          lancamentos: sorted,
          top3: sorted.slice(0, 3),
          percentual: (total / totalDespesas) * 100,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Fluxo diário
    const fluxoPorDia = new Map<string, { entradas: number; saidas: number }>();
    movimentos.forEach(mov => {
      const key = mov.dataStr;
      const atual = fluxoPorDia.get(key) || { entradas: 0, saidas: 0 };
      atual.entradas += mov.credito;
      atual.saidas += mov.debito;
      fluxoPorDia.set(key, atual);
    });

    let saldoAcumulado = 0;
    const fluxoDiario: FluxoDiario[] = Array.from(fluxoPorDia.entries())
      .map(([data, valores]) => {
        const saldo = valores.entradas - valores.saidas;
        saldoAcumulado += saldo;
        return {
          data,
          dataFormatada: data,
          entradas: valores.entradas,
          saidas: valores.saidas,
          saldo,
          saldoAcumulado,
        };
      })
      .sort((a, b) => {
        const [diaA, mesA, anoA] = a.data.split('/').map(Number);
        const [diaB, mesB, anoB] = b.data.split('/').map(Number);
        return new Date(anoA, mesA - 1, diaA).getTime() - 
               new Date(anoB, mesB - 1, diaB).getTime();
      });

    // Recalcula saldo acumulado após ordenação
    let saldoAcum = 0;
    fluxoDiario.forEach(dia => {
      saldoAcum += dia.saldo;
      dia.saldoAcumulado = saldoAcum;
    });

    return {
      movimentos,
      resumo,
      origens,
      categorias,
      fluxoDiario,
    };
  }, [movimentosRaw, scope]);

  const refetch = () => setFetchKey(k => k + 1);

  return { dados, loading, error, refetch };
}

// Hook para animação de números
export function useAnimatedValue(
  targetValue: number, 
  duration: number = 1000,
  startDelay: number = 0
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = Date.now();
      const startValue = 0;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing: ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        setValue(startValue + (targetValue - startValue) * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [targetValue, duration, startDelay]);

  return value;
}

