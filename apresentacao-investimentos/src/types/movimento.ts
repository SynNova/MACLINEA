export interface Movimento {
  id: number;
  data: Date;
  dataStr: string;
  diaSemana: string;
  tipo: TipoMovimento;
  credito: number;
  debito: number;
  banco: string;
  documento: string;
  parcela: string;
  categoria: string;
  categoriaId: number;
  historico: string;
  fornecedor: string;
}

export type TipoMovimento = 
  | 'Movto.Financeiro' 
  | 'Pagar' 
  | 'Receber' 
  | 'Transferências';

export interface CategoriaAgregada {
  categoria: string;
  categoriaId: number;
  total: number;
  count: number;
  lancamentos: Movimento[];
  top3: Movimento[];
  percentual: number;
}

export interface OrigemRecursos {
  nome: string;
  valor: number;
  percentual: number;
  cor: string;
  descricao: string;
  data: string;
}

export interface FluxoDiario {
  data: string;
  dataFormatada: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
}

export interface ResumoFinanceiro {
  totalAportes: number;
  aporteBrivio: number;
  aporteIanco: number;
  totalVendas: number;
  totalDespesas: number;
  saldoFinal: number;
  periodoInicio: string;
  periodoFim: string;
}

export interface DadosProcessados {
  movimentos: Movimento[];
  resumo: ResumoFinanceiro;
  origens: OrigemRecursos[];
  categorias: CategoriaAgregada[];
  fluxoDiario: FluxoDiario[];
}

// Categorias especiais para classificação
export const CATEGORIAS_ESPECIAIS = {
  APORTE: 79, // "79 - Juros Recebidos / Aporte Capital Social"
  TRANSFERENCIA: 6, // "6 - Transferencia entre Contas"
  VENDA_PRODUTOS: 3, // "3 - Venda de Produtos"
  VENDA_SERVICOS: 4, // "4 - Venda de Serviços"
  IMPLANTACAO_SALDO: 5, // "5 - Implantaçao de Saldo"
} as const;

// Mapeamento de categorias para grupos de despesa
export const GRUPOS_DESPESA: Record<string, string> = {
  // === TRABALHISTA ===
  '87': 'FGTS Rescisão',
  '88': 'Salários Rescisão',
  '94': 'Ações Trabalhistas',
  '24': 'Folha de Pagamento',
  '73': '13º Salário',
  '38': 'Adiantamento Salário',
  '22': 'FGTS Mensal',
  '56': 'Vale Transporte',
  '59': 'Alimentação',
  '97': 'Plano de Saúde',
  '31': 'Seguro Funcionários',
  '58': 'Segurança Trabalho',
  
  // === FINANCEIRO ===
  '36': 'Despesas Financeiras',
  '33': 'Empréstimos/Parcelas',
  '34': 'Juros Bancários',
  '35': 'IOF',
  '42': 'Retirada Sócios',
  
  // === COMPRAS/FORNECEDORES ===
  '41': 'Matéria Prima',
  '54': 'Serviços',
  '77': 'Insumos',
  '96': 'Importação',
  '69': 'Fretes Compras',
  '39': 'Fretes',
  '37': 'Máquinas/Equipamentos',
  '91': 'Devoluções',
  
  // === OPERACIONAL ===
  '26': 'Manutenção Predial',
  '67': 'Manutenção Máquinas',
  '52': 'Aluguel',
  '48': 'Vigilância',
  '65': 'Energia Elétrica',
  '64': 'Água',
  '63': 'Telefonia/Internet',
  '66': 'Seguros',
  '45': 'Veículos',
  '50': 'Pedágio',
  
  // === ADMINISTRATIVO ===
  '61': 'Desp. Administrativas',
  '30': 'Contabilidade',
  '71': 'Honorários/Consultoria',
  '89': 'Informática',
  '46': 'Sistema Octus',
  '81': 'Viagens',
  '92': 'Custos RJ',
};

