import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { isBancoPermitido } from '../utils/bancoFilter';
import { useBancoScope } from '../filters/BancoScopeProvider';

export interface MovimentoClassificadoRow {
  id: string;
  data: string; // dd/MM/yyyy
  mes: string; // yyyy-MM
  tipo: string;
  banco: string;
  categoria_id: string;
  categoria: string;
  entidade: string;
  descricao: string;
  credito: string;
  debito: string;
  classe_fluxo: 'entrada' | 'custo_operacional' | 'transferencia_interna' | 'implantacao_saldo' | 'outro' | string;
  classe_recorrencia: 'recorrente_forte' | 'recorrente_frequente' | 'nao_recorrente' | string;
  extraordinario: 'sim' | 'nao' | string;
}

export interface PessoaRescisaoRow {
  pessoa: string;
  salarios_rescisao_total: string;
  salarios_rescisao_count: string;
  salarios_rescisao_datas: string;
  fgts_rescisao_total: string;
  fgts_rescisao_count: string;
  fgts_rescisao_datas: string;
  acoes_trabalhistas_total: string;
  acoes_trabalhistas_count: string;
  acoes_trabalhistas_datas: string;
  total_geral: string;
}

function parseNumberDot(value: string): number {
  const n = parseFloat((value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function loadCSV<T extends Record<string, unknown>>(url: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(url, {
      download: true,
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (res) => resolve((res.data || []).filter(Boolean) as T[]),
      error: (err) => reject(err),
    });
  });
}

export interface AnalisesData {
  movimentos: MovimentoClassificadoRow[];
  pessoas: PessoaRescisaoRow[];
}

export interface AnalisesComputed {
  entradasTotal: number;
  saidasTotal: number;
  saidasOperacionais: number;
  transferenciasDebito: number;
  transferenciasCredito: number;
  implantacaoSaldo: number;
  saldoPeriodo: number;
  saldoOperacionalAprox: number;
  pessoasEmComumCount: number;
  pessoasEmComum: Array<{
    pessoa: string;
    salariosRescisao: number;
    fgtsRescisao: number;
    acoes: number;
    total: number;
    parcelasSal: number;
    parcelasFgts: number;
  }>;
  topRecorrentes: Array<{
    categoria: string;
    entidade: string;
    total: number;
    count: number;
    classe: string;
    extraordinario: boolean;
    meses: string[];
  }>;
}

export function useAnalises(): {
  data: AnalisesData | null;
  computed: AnalisesComputed | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { scope } = useBancoScope();
  const [data, setData] = useState<AnalisesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [movimentos, pessoas] = await Promise.all([
          loadCSV<MovimentoClassificadoRow>('/dados/movimentos_classificados.csv'),
          loadCSV<PessoaRescisaoRow>('/dados/pessoas_rescisao_fgts.csv'),
        ]);
        if (!cancelled) setData({ movimentos, pessoas });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error('Erro ao carregar análises'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const computed = useMemo<AnalisesComputed | null>(() => {
    if (!data) return null;

    const movs = scope === 'core'
      ? data.movimentos.filter((m) => isBancoPermitido(m.banco))
      : data.movimentos;

    let entradasTotal = 0;
    let saidasTotal = 0;
    let saidasOperacionais = 0;
    let transferenciasDebito = 0;
    let transferenciasCredito = 0;
    let implantacaoSaldo = 0;

    const recorrenciaMap = new Map<string, {
      categoria: string;
      entidade: string;
      total: number;
      count: number;
      classe: string;
      extraordinario: boolean;
      meses: Set<string>;
    }>();

    for (const r of movs) {
      const credito = parseNumberDot(r.credito);
      const debito = parseNumberDot(r.debito);

      if (credito > 0) {
        entradasTotal += credito;
        if (r.classe_fluxo === 'transferencia_interna') transferenciasCredito += credito;
      }
      if (debito > 0) {
        saidasTotal += debito;
        if (r.classe_fluxo === 'custo_operacional') saidasOperacionais += debito;
        if (r.classe_fluxo === 'transferencia_interna') transferenciasDebito += debito;
        if (r.classe_fluxo === 'implantacao_saldo') implantacaoSaldo += debito;

        if (r.classe_fluxo === 'custo_operacional') {
          const chave = `${r.categoria}||${r.entidade}`;
          const atual = recorrenciaMap.get(chave) ?? {
            categoria: r.categoria,
            entidade: r.entidade,
            total: 0,
            count: 0,
            classe: r.classe_recorrencia || '',
            extraordinario: (r.extraordinario || '').toLowerCase() === 'sim',
            meses: new Set<string>(),
          };
          atual.total += debito;
          atual.count += 1;
          atual.meses.add(r.mes);
          // Se em algum lançamento for marcado como extraordinário, marca o grupo
          if ((r.extraordinario || '').toLowerCase() === 'sim') atual.extraordinario = true;
          // Preferir "recorrente_forte" se aparecer
          if (r.classe_recorrencia === 'recorrente_forte') atual.classe = 'recorrente_forte';
          else if (!atual.classe) atual.classe = r.classe_recorrencia || '';
          recorrenciaMap.set(chave, atual);
        }
      }
    }

    const saldoPeriodo = entradasTotal - saidasTotal;
    const saldoOperacionalAprox = entradasTotal - saidasOperacionais;

    const pessoasEmComumAll = (data.pessoas || [])
      .map((p) => {
        const salariosRescisao = parseNumberDot(p.salarios_rescisao_total);
        const fgtsRescisao = parseNumberDot(p.fgts_rescisao_total);
        const acoes = parseNumberDot(p.acoes_trabalhistas_total);
        const total = parseNumberDot(p.total_geral);
        const parcelasSal = parseInt(p.salarios_rescisao_count || '0', 10) || 0;
        const parcelasFgts = parseInt(p.fgts_rescisao_count || '0', 10) || 0;
        return {
          pessoa: p.pessoa,
          salariosRescisao,
          fgtsRescisao,
          acoes,
          total,
          parcelasSal,
          parcelasFgts,
        };
      })
      .filter((p) => p.salariosRescisao > 0 && p.fgtsRescisao > 0)
      .sort((a, b) => (b.salariosRescisao + b.fgtsRescisao) - (a.salariosRescisao + a.fgtsRescisao));

    // Ajuste: o CSV de pessoas é pré-gerado (não tem "banco"). Para manter consistência com o filtro de bancos,
    // filtramos por evidência textual nos movimentos filtrados (entidade/descricao).
    const haystack = movs
      .map((r) => `${r.entidade || ''} ${r.descricao || ''}`.toLowerCase())
      .join('\n');

    const pessoasEmComum = scope === 'core'
      ? pessoasEmComumAll.filter((p) => haystack.includes((p.pessoa || '').toLowerCase()))
      : pessoasEmComumAll;

    const topRecorrentes = Array.from(recorrenciaMap.values())
      .filter((g) => g.classe === 'recorrente_forte' || g.classe === 'recorrente_frequente')
      .map((g) => ({
        categoria: g.categoria,
        entidade: g.entidade,
        total: g.total,
        count: g.count,
        classe: g.classe,
        extraordinario: g.extraordinario,
        meses: Array.from(g.meses).sort(),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    return {
      entradasTotal,
      saidasTotal,
      saidasOperacionais,
      transferenciasDebito,
      transferenciasCredito,
      implantacaoSaldo,
      saldoPeriodo,
      saldoOperacionalAprox,
      pessoasEmComumCount: pessoasEmComum.length,
      pessoasEmComum,
      topRecorrentes,
    };
  }, [data, scope]);

  const refetch = () => setKey((k) => k + 1);

  return { data, computed, loading, error, refetch };
}


