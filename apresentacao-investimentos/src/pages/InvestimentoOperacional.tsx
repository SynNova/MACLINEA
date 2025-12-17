import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList,
} from 'recharts';
import { 
  Factory, 
  Wallet, 
  TrendingDown, 
  PieChartIcon, 
  BarChart3, 
  FileText, 
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  ShoppingCart,
  Info,
  Package,
  HandCoins,
  ChevronUp,
  ChevronDown,
  X,
  CreditCard,
  Banknote
} from 'lucide-react';
import { useMovimentos } from '../hooks/useMovimentos';
import { formatCurrency, formatCurrencyCompact, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { DrillDownModal } from '../components/ui/DrillDownModal';
import { useChartTheme } from '../hooks/useChartTheme';
import type { Movimento, CategoriaAgregada } from '../types/movimento';

// IDs das categorias trabalhistas (gastos com colaboradores) - EXCLUÍDAS nesta página
const CATEGORIAS_COLABORADORES: number[] = [87, 88, 94, 24, 73, 38, 22, 56, 59, 97, 31, 58];

// Categorias especiais a ignorar
const CATEGORIAS_IGNORAR: number[] = [6, 5]; // Transferência, Implantação Saldo

// IDs de vendas (para identificar liquidação de ativos)
const CATEGORIAS_VENDAS = [3, 4];

// Termos para identificar liquidação de ativos (vendas internas do grupo Usifix)
const TERMOS_LIQUIDACAO_ATIVOS = ['MECA', 'IANCO'];

// Aportes diretos da Usifix (pagamentos feitos diretamente pela Usifix para fornecedores da Maclinea)
// Esses valores são TANTO investimento (aporte) quanto gasto (serviço prestado)
const APORTES_DIRETOS_USIFIX = [
  { descricao: 'Pagamento MDS Instalação (Michel)', valor: 55748.00, empresa: 'MDS Instalação', categoriaGasto: 'Manutenção Máquinas', categoriaId: 67 },
  { descricao: 'Pagamento SOFKA', valor: 71117.00, empresa: 'SOFKA', categoriaGasto: 'Vigilância', categoriaId: 48 }
];
const TOTAL_APORTES_DIRETOS = APORTES_DIRETOS_USIFIX.reduce((sum, a) => sum + a.valor, 0);

// Mapeamento de categorias operacionais
const CATEGORIAS_OPERACIONAIS: Record<number, string> = {
  // FINANCEIRO
  36: 'Despesas Financeiras',
  33: 'Empréstimos/Parcelas',
  34: 'Juros Bancários',
  35: 'IOF',
  42: 'Retirada Sócios',
  
  // COMPRAS/FORNECEDORES
  41: 'Matéria Prima',
  54: 'Serviços',
  77: 'Insumos',
  96: 'Importação',
  69: 'Fretes Compras',
  39: 'Fretes',
  37: 'Máquinas/Equipamentos',
  91: 'Devoluções',
  
  // OPERACIONAL
  26: 'Manutenção Predial',
  67: 'Manutenção Máquinas',
  52: 'Aluguel / Contas Bremax',
  48: 'Vigilância',
  65: 'Energia Elétrica',
  64: 'Água',
  63: 'Telefonia/Internet',
  66: 'Seguros',
  45: 'Veículos',
  50: 'Pedágio',
  
  // ADMINISTRATIVO
  61: 'Desp. Administrativas',
  30: 'Contabilidade',
  71: 'Honorários/Consultoria',
  89: 'Informática',
  46: 'Sistema Octus',
  81: 'Viagens',
  92: 'Custos RJ',
};

// Cores vibrantes para o gráfico de pizza
const PIE_COLORS = [
  '#008DD0', // usifix
  '#8B1538', // maclinea
  '#95C6EB', // usifix-light
  '#B91C4A', // maclinea-light
  '#006699', // usifix-dark
  '#5C0E25', // maclinea-dark
  '#4ECDC4', // teal
  '#FF6B6B', // coral
  '#7E57C2', // purple
  '#FFA726', // orange
  '#26A69A', // green
  '#42A5F5', // blue
  '#EF5350', // red
  '#66BB6A', // green
  '#AB47BC', // purple
];

// Verifica se é aporte da família Brivio
function isAporteBrivio(mov: Movimento): boolean {
  if (mov.categoriaId !== 79) return false;
  if (mov.credito <= 0) return false;
  
  const historico = mov.historico
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  const isCambio = historico.includes('CAMBIO');
  const isValorAlto = mov.credito > 3000000;
  
  return isCambio || isValorAlto;
}

// Verifica se é aporte da IANCO/Usifix
function isAporteUsifix(mov: Movimento): boolean {
  if (mov.categoriaId !== 79) return false;
  if (mov.credito <= 0) return false;
  
  const historico = mov.historico
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Não é Brivio
  if (historico.includes('CAMBIO') || mov.credito > 3000000) return false;
  
  // É Usifix se menciona Usifix ou Aporte
  return historico.includes('USIFIX') || historico.includes('APORTE');
}

// Verifica se é gasto com colaborador
function isGastoColaborador(mov: Movimento): boolean {
  return mov.debito > 0 && CATEGORIAS_COLABORADORES.includes(mov.categoriaId);
}

// Verifica se é gasto operacional (não colaborador, não transferência)
function isGastoOperacional(mov: Movimento): boolean {
  if (mov.debito <= 0) return false;
  if (CATEGORIAS_COLABORADORES.includes(mov.categoriaId)) return false;
  if (CATEGORIAS_IGNORAR.includes(mov.categoriaId)) return false;
  return true;
}

interface GastoCategoria {
  categoria: string;
  categoriaId: number;
  total: number;
  count: number;
  percentual: number;
  lancamentos: Movimento[];
  valorAporteDireto?: number; // Valor pago diretamente pela Usifix nesta categoria
}

export default function InvestimentoOperacional() {
  const { dados, loading, error } = useMovimentos(withBase('dados/movimentos.csv'));
  const [isAporteDiretoExpanded, setIsAporteDiretoExpanded] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaAgregada | null>(null);
  const [showAporteModal, setShowAporteModal] = useState(false);
  const { colors, isDark } = useChartTheme();

  // Processa dados
  const { 
    aporteUsifixTotal, 
    aporteUsifixBancario,
    totalGastosOper,
    categorias,
    deficitPagina1,
    saldoAposAporte,
    deficitFinal
  } = useMemo(() => {
    if (!dados) {
      return { 
        aporteBrivio: 0, 
        aporteUsifixTotal: 0, 
        aporteUsifixBancario: 0,
        gastosColaboradores: [], 
        gastosOperacionais: [],
        totalGastosColab: 0, 
        totalGastosOper: 0,
        totalLiquidacao: 0,
        categorias: [],
        liquidacaoAgrupada: [],
        deficitPagina1: 0,
        saldoAposAporte: 0,
        saldoComLiquidacao: 0,
        deficitFinal: 0
      };
    }

    const movimentos = dados.movimentos;

    // Calcula aportes
    const aportesBrivio = movimentos.filter(isAporteBrivio);
    const totalAporteBrivio = aportesBrivio.reduce((sum, m) => sum + m.credito, 0);

    const aportesUsifix = movimentos.filter(isAporteUsifix);
    const totalAporteUsifix = aportesUsifix.reduce((sum, m) => sum + m.credito, 0);

    // Filtra gastos
    const gastosColab = movimentos.filter(isGastoColaborador);
    const totalGastosColab = gastosColab.reduce((sum, m) => sum + m.debito, 0);

    const gastosOper = movimentos.filter(isGastoOperacional);
    // Total de gastos operacionais inclui os aportes diretos (que são também gastos)
    const totalGastosOperBancario = gastosOper.reduce((sum, m) => sum + m.debito, 0);
    const totalGastosOper = totalGastosOperBancario + TOTAL_APORTES_DIRETOS;

    // Aporte total Usifix = transferências bancárias + pagamentos diretos (MDS + SOFKA)
    const aporteUsifixTotal = totalAporteUsifix + TOTAL_APORTES_DIRETOS;

    // Cálculo do fluxo
    const deficitPagina1 = totalGastosColab - totalAporteBrivio; // Déficit vindo da página 1
    const saldoAposAporte = aporteUsifixTotal - (deficitPagina1 > 0 ? deficitPagina1 : 0);
    
    // Déficit final (SEM liquidação - ela vai para página 3)
    const deficitFinal = totalGastosOper - saldoAposAporte;

    // Agrupa por categoria
    const porCategoria = new Map<number, Movimento[]>();
    gastosOper.forEach((mov) => {
      const lista = porCategoria.get(mov.categoriaId) || [];
      lista.push(mov);
      porCategoria.set(mov.categoriaId, lista);
    });

    // Calcula valores adicionais dos aportes diretos por categoria
    const aportesDirectosPorCategoria = new Map<number, number>();
    APORTES_DIRETOS_USIFIX.forEach((aporte) => {
      const atual = aportesDirectosPorCategoria.get(aporte.categoriaId) || 0;
      aportesDirectosPorCategoria.set(aporte.categoriaId, atual + aporte.valor);
    });

    // Cria array de categorias (incluindo valores dos aportes diretos)
    const cats: GastoCategoria[] = Array.from(porCategoria.entries())
      .map(([catId, lista]) => {
        const totalBancario = lista.reduce((sum, m) => sum + m.debito, 0);
        const totalAporteDireto = aportesDirectosPorCategoria.get(catId) || 0;
        const total = totalBancario + totalAporteDireto;
        return {
          categoria: CATEGORIAS_OPERACIONAIS[catId] || lista[0]?.categoria || 'Outros',
          categoriaId: catId,
          total,
          count: lista.length + (totalAporteDireto > 0 ? 1 : 0),
          percentual: totalGastosOper > 0 ? (total / totalGastosOper) * 100 : 0,
          lancamentos: lista.sort((a, b) => b.debito - a.debito),
          valorAporteDireto: totalAporteDireto, // Adiciona informação do aporte direto
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      aporteBrivio: totalAporteBrivio,
      aporteUsifixTotal,
      aporteUsifixBancario: totalAporteUsifix,
      gastosColaboradores: gastosColab,
      gastosOperacionais: gastosOper,
      totalGastosColab,
      totalGastosOper,
      categorias: cats,
      deficitPagina1: deficitPagina1 > 0 ? deficitPagina1 : 0,
      saldoAposAporte,
      deficitFinal
    };
  }, [dados]);

  // Função para converter GastoCategoria para CategoriaAgregada (para o modal)
  const handleCategoriaClick = (cat: GastoCategoria) => {
    const categoriaAgregada: CategoriaAgregada = {
      categoria: cat.categoria,
      categoriaId: cat.categoriaId,
      total: cat.total,
      count: cat.count,
      lancamentos: cat.lancamentos,
      top3: cat.lancamentos.slice(0, 3),
      percentual: cat.percentual,
    };
    setSelectedCategoria(categoriaAgregada);
  };

  // Dados para gráficos
  const chartData = categorias.map((cat, index) => ({
    ...cat,
    fill: PIE_COLORS[index % PIE_COLORS.length],
    name: cat.categoria,
    value: cat.total,
  }));

  // Dados para gráfico de pizza (agrupa < 1% em "Outros")
  const pieChartData = useMemo(() => {
    const threshold = 0.01; // 1%
    const mainItems = chartData.filter(item => item.percentual >= threshold * 100);
    const otherItems = chartData.filter(item => item.percentual < threshold * 100);
    
    if (otherItems.length === 0) return mainItems;
    
    const otherTotal = otherItems.reduce((sum, item) => sum + item.value, 0);
    const otherPercentual = otherItems.reduce((sum, item) => sum + item.percentual, 0);
    
    return [
      ...mainItems,
      {
        categoria: 'Outros',
        categoriaId: -1,
        total: otherTotal,
        count: otherItems.length,
        percentual: otherPercentual,
        lancamentos: [],
        fill: '#6B7280', // gray
        name: 'Outros',
        value: otherTotal,
      }
    ];
  }, [chartData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-usifix border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando dados...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center text-red-400">
          <p>Erro ao carregar dados: {error.message}</p>
        </div>
      </div>
    );
  }

  // Total de investimento Usifix (aporte bancário + aportes diretos)
  const totalInvestimentoUsifix = aporteUsifixTotal;

  return (
    <motion.div 
      className="min-h-screen bg-background"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Botão Toggle de Tema - Fixo no canto superior direito */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Botão Flutuante - Página Anterior */}
      <Link
        to="/"
        className="fixed left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-usifix/90 hover:bg-usifix text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
        title="Página 1 - Colaboradores"
      >
        <ArrowLeft size={24} />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Página 1 - Colaboradores
        </span>
      </Link>

      {/* Botão Flutuante - Próxima Página */}
      <Link
        to="/investimento-vendas"
        className="fixed right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-usifix/90 hover:bg-usifix text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
        title="Página 3 - Vendas"
      >
        <ArrowRight size={24} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Página 3 - Vendas
        </span>
      </Link>

      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-usifix/20 via-transparent to-usifix/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-usifix/10 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Destinação do Investimento - Operacional
                </h1>
                <p className="text-gray-400 text-lg">
                  Investimentos Usifix + Déficit Anterior → Gastos Operacionais
                </p>
              </div>
              <img
                src={withBase('logos/usifix.svg')}
                alt="Usifix"
                className="h-12 md:h-14"
              />
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* KPIs - Layout em 2 linhas */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Linha 1: Entradas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 1. DÉFICIT (da página anterior) */}
            <div className="glass-card p-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Déficit Anterior
                </span>
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-red-400 mb-2">
                {formatCurrency(deficitPagina1)}
              </div>
              <p className="text-gray-500 text-sm">Vindo da Página 1</p>
            </div>

            {/* 2. APORTE USIFIX - Clicável */}
            <motion.button
              onClick={() => setShowAporteModal(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card p-6 bg-gradient-to-br from-usifix/10 to-transparent border-usifix/20 text-left cursor-pointer hover:border-usifix/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aporte Usifix
                </span>
                <div className="p-2 rounded-lg bg-usifix/20 text-usifix-light">
                  <Wallet size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-usifix-light mb-2">
                +{formatCurrency(aporteUsifixTotal)}
              </div>
              <p className="text-gray-500 text-sm flex items-center gap-2">
                Bancário + Diretos
                <Info size={14} className="text-usifix-light opacity-60" />
              </p>
            </motion.button>
          </div>

          {/* Seta indicadora de fluxo */}
          <div className="flex justify-center my-4">
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-gray-400 text-sm">Déficit + Aportes</span>
              <span className="text-gray-500">→</span>
              <span className="text-green-400 font-semibold">{formatCurrency(saldoAposAporte)}</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400 text-sm">Gastos Operacionais</span>
            </div>
          </div>

          {/* Linha 2: Saídas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 4. SALDO */}
            <div className={`glass-card p-6 bg-gradient-to-br ${saldoAposAporte >= 0 ? 'from-green-500/10 to-transparent border-green-500/20' : 'from-red-500/10 to-transparent border-red-500/20'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo Disponível
                </span>
                <div className={`p-2 rounded-lg ${saldoAposAporte >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  <Wallet size={18} />
                </div>
              </div>
              <div className={`text-3xl font-bold mb-2 ${saldoAposAporte >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(saldoAposAporte)}
              </div>
              <p className="text-gray-500 text-sm">Após investimentos</p>
            </div>

            {/* 5. GASTOS OPERACIONAIS */}
            <div className="glass-card p-6 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gastos Operacionais
                </span>
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Factory size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-amber-400 mb-2">
                -{formatCurrency(totalGastosOper)}
              </div>
              <p className="text-gray-500 text-sm">{categorias.length} categorias</p>
            </div>

            {/* 6. NOVO DÉFICIT */}
            <div className={`glass-card p-6 bg-gradient-to-br ${
              deficitFinal <= 0
                ? 'from-green-500/10 to-transparent border-green-500/20'
                : 'from-red-500/10 to-transparent border-red-500/20'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {deficitFinal > 0 ? 'Novo Déficit' : 'Superávit'}
                </span>
                <div className={`p-2 rounded-lg ${
                  deficitFinal <= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {deficitFinal > 0 ? <AlertTriangle size={18} /> : <TrendingDown size={18} />}
                </div>
              </div>
              <div className={`text-3xl font-bold mb-2 ${
                deficitFinal <= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {deficitFinal > 0 ? '-' : '+'}{formatCurrency(Math.abs(deficitFinal))}
              </div>
              <p className="text-gray-500 text-sm">
                {deficitFinal > 0 ? 'Passa para Página 3' : 'Disponível'}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Seção de Aportes Diretos da Usifix (Recolhível) */}
        {APORTES_DIRETOS_USIFIX.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mb-8"
          >
            <div className="glass-card bg-gradient-to-r from-usifix/10 to-usifix-light/5 border-usifix/30 overflow-hidden">
              {/* Header clicável */}
              <button
                onClick={() => setIsAporteDiretoExpanded(!isAporteDiretoExpanded)}
                className="w-full p-6 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                <div className="p-2 rounded-lg bg-usifix/20 text-usifix-light">
                  <HandCoins size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-bold text-white">
                    Aportes Diretos da Usifix
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Pagamentos diretos pela Usifix a fornecedores da Maclinea
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-2xl font-bold text-usifix-light">
                    +{formatCurrency(TOTAL_APORTES_DIRETOS)}
                  </p>
                  <p className="text-xs text-gray-500">{APORTES_DIRETOS_USIFIX.length} item(s)</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  {isAporteDiretoExpanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </button>
              
              {/* Conteúdo expansível */}
              {isAporteDiretoExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-white/10"
                >
                  <div className="p-6 pt-4">
                    {/* Lista de Aportes Diretos */}
                    <div className="space-y-3">
                      {APORTES_DIRETOS_USIFIX.map((aporte, index) => (
                        <div
                          key={aporte.empresa}
                          className="glass-card overflow-hidden bg-white/5 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0 bg-usifix"
                              />
                              <div className="text-left">
                                <h4 className="font-semibold text-white">{aporte.empresa}</h4>
                                <p className="text-xs text-gray-500">
                                  {aporte.descricao}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-usifix-light">{formatCurrency(aporte.valor)}</p>
                              <p className="text-xs text-gray-500">Pagamento direto</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Nota explicativa */}
                    <div className="mt-4 p-3 rounded-lg bg-white/5 border border-usifix/20">
                      <div className="flex items-start gap-2">
                        <Info size={16} className="text-usifix-light mt-0.5 flex-shrink-0" />
                        <p className="text-gray-400 text-xs leading-relaxed">
                          Estes valores representam <strong className="text-usifix-light">pagamentos realizados diretamente pela Usifix</strong> a 
                          fornecedores que prestaram serviços para a Maclinea. 
                          <strong className="text-green-400"> São considerados investimento adicional</strong> pois representam 
                          recursos externos aplicados diretamente na operação da Maclinea, mesmo não constando no extrato bancário.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.section>
        )}

        {/* Nota Informativa - Compras Usifix */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-55"
        >
          <div className="glass-card p-5 bg-gradient-to-r from-usifix/5 to-transparent border-usifix/20">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-usifix/20 text-usifix-light flex-shrink-0">
                <Package size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info size={16} className="text-usifix-light" />
                  <h4 className="font-semibold text-white">Investimentos Adicionais Não Contabilizados</h4>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Ainda não foram calculadas as <span className="text-usifix-light font-medium">compras feitas pela Usifix</span> e 
                  entregues na Maclinea para possibilitar entregas de peças, máquinas e gerar faturamentos. 
                  Estes investimentos adicionais contribuem diretamente para a operação e geração de receita da empresa.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Gráfico de Barras */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-usifix/20 text-usifix-light">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-xl font-bold text-white">
                Gastos Operacionais por Categoria
              </h3>
            </div>
            
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.slice(0, 15)}
                  layout="vertical"
                  margin={{ top: 10, right: 80, left: 140, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrencyCompact(value)}
                    tick={{ fill: colors.textSecondary, fontSize: 11 }}
                    axisLine={{ stroke: colors.axis }}
                  />
                  <YAxis
                    type="category"
                    dataKey="categoria"
                    tick={{ fill: colors.textSecondary, fontSize: 10 }}
                    axisLine={{ stroke: colors.axis }}
                    width={130}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as GastoCategoria;
                      return (
                        <div className={`rounded-lg p-4 shadow-xl ${isDark ? 'bg-card border border-white/10' : 'bg-white border border-gray-200'}`}>
                          <p className="font-bold text-white mb-2">{data.categoria}</p>
                          <p className="text-usifix-light text-lg font-semibold">
                            {formatCurrency(data.total)}
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            {data.count} lançamento{data.count > 1 ? 's' : ''} • {formatPercentage(data.percentual)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    radius={[0, 6, 6, 0]}
                    onClick={(data) => {
                      const payload = data as unknown as GastoCategoria;
                      const cat = categorias.find(c => c.categoria === payload.categoria);
                      if (cat) handleCategoriaClick(cat);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.slice(0, 15).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                      style={{ fill: colors.text, fontSize: 10, fontWeight: 500 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* Gráfico de Pizza */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-usifix/20 text-usifix-light">
                <PieChartIcon size={20} />
              </div>
              <h3 className="text-xl font-bold text-white">
                Distribuição Percentual
              </h3>
            </div>
            
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    label={({ percent }) => 
                      (percent ?? 0) > 0.01 ? `${((percent ?? 0) * 100).toFixed(1)}%` : ''
                    }
                    labelLine={{ stroke: colors.textSecondary, strokeWidth: 1 }}
                    onClick={(data) => {
                      if (data.categoriaId === -1) return; // Ignora "Outros"
                      const cat = categorias.find(c => c.categoriaId === data.categoriaId);
                      if (cat) handleCategoriaClick(cat);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as GastoCategoria;
                      return (
                        <div className={`rounded-lg p-4 shadow-xl ${isDark ? 'bg-card border border-white/10' : 'bg-white border border-gray-200'}`}>
                          <p className="font-bold text-white mb-2">{data.categoria}</p>
                          <p className="text-usifix-light text-lg font-semibold">
                            {formatCurrency(data.total)}
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            {formatPercentage(data.percentual)} do total
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 20 }}
                    formatter={(value) => (
                      <span style={{ color: colors.textSecondary }} className="text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        </div>

        {/* Detalhamento por Categoria */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-white/10 text-gray-300">
              <FileText size={20} />
            </div>
            <h3 className="text-xl font-bold text-white">
              Detalhamento por Categoria
            </h3>
          </div>

          <div className="space-y-4">
            {categorias.map((cat, index) => (
              <motion.div
                key={cat.categoriaId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.03 }}
                className="glass-card overflow-hidden"
              >
                {/* Header da Categoria */}
                <button
                  onClick={() => handleCategoriaClick(cat)}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{cat.categoria}</h4>
                        {cat.valorAporteDireto && cat.valorAporteDireto > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-usifix/20 text-usifix-light border border-usifix/30">
                            + Aporte Usifix
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {cat.count} lançamento{cat.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency(cat.total)}</p>
                      <p className="text-sm text-gray-500">{formatPercentage(cat.percentual)}</p>
                    </div>
                    <ArrowRight size={20} className="text-gray-400" />
                  </div>
                </button>

              </motion.div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Clique em uma categoria para ver detalhes e gráficos
          </p>
        </motion.section>

        {/* Card de Continuação */}
        {deficitFinal > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <Link to="/investimento-vendas">
              <div className="glass-card p-8 bg-gradient-to-r from-red-500/10 via-transparent to-green-500/10 border-red-500/20 hover:border-green-500/30 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                        <ShoppingCart size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        Continuar para Página 3 - Vendas
                      </h3>
                    </div>
                    <p className="text-gray-400 mb-4">
                      O déficit de <span className="text-red-400 font-bold">{formatCurrency(deficitFinal)}</span> será compensado pelas receitas de vendas
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
                        Déficit: {formatCurrencyCompact(deficitFinal)}
                      </div>
                      <span className="text-gray-500">→</span>
                      <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                        + Vendas
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-2 text-green-400 group-hover:translate-x-2 transition-transform">
                    <span className="font-medium">Ver Resultado Final</span>
                    <ArrowRight size={24} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.section>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Relatório de Destinação de Investimentos • Gastos Operacionais • Página 2
          </p>
          <div className="flex items-center justify-center gap-4">
            <img
              src={withBase('logos/maclinea.png')}
              alt="Maclinea"
              className="h-8 opacity-50 hover:opacity-100 transition-opacity"
            />
            <img
              src={withBase('logos/usifix.svg')}
              alt="Usifix"
              className="h-6 opacity-50 hover:opacity-100 transition-opacity"
            />
          </div>
        </footer>
      </main>

      {/* Modal de Detalhes com Overlay Charts */}
      <DrillDownModal
        isOpen={selectedCategoria !== null}
        onClose={() => setSelectedCategoria(null)}
        categoria={selectedCategoria}
      />

      {/* Modal de Aporte Usifix */}
      <AnimatePresence>
        {showAporteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAporteModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                         w-full max-w-lg mx-4 z-50 rounded-2xl shadow-2xl overflow-hidden
                         ${isDark ? 'bg-card border border-white/10' : 'bg-white border border-gray-200'}`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-usifix/20">
                    <Wallet className="text-usifix-light" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Aporte Usifix</h2>
                    <p className="text-gray-400 text-sm">Detalhamento do investimento</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAporteModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Fechar"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Total */}
                <div className={`p-4 rounded-xl ${isDark ? 'bg-usifix/10 border border-usifix/20' : 'bg-blue-50 border border-blue-100'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Total Aporte Usifix</span>
                    <span className="text-2xl font-bold text-usifix-light">
                      {formatCurrency(aporteUsifixTotal)}
                    </span>
                  </div>
                </div>

                {/* Detalhamento */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Composição do Aporte
                  </h3>
                  
                  {/* Aporte Bancário */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-usifix/20' : 'bg-blue-100'}`}>
                        <Banknote className="text-usifix-light" size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">Transferências Bancárias</span>
                          <span className="font-bold text-usifix-light">
                            {formatCurrency(aporteUsifixBancario)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Recursos transferidos diretamente para conta Maclinea
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Aportes Diretos */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-usifix/20' : 'bg-blue-100'}`}>
                        <CreditCard className="text-usifix-light" size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">Pagamentos Diretos</span>
                          <span className="font-bold text-usifix-light">
                            {formatCurrency(TOTAL_APORTES_DIRETOS)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                          Pagamentos feitos diretamente pela Usifix a fornecedores da Maclinea
                        </p>
                        
                        {/* Lista de pagamentos diretos */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          {APORTES_DIRETOS_USIFIX.map((aporte, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div>
                                <span className="text-gray-300">{aporte.empresa}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                  {aporte.categoriaGasto}
                                </span>
                              </div>
                              <span className="text-white font-medium">
                                {formatCurrency(aporte.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nota explicativa */}
                <div className={`flex items-start gap-3 p-4 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                  <Info className="text-amber-400 mt-0.5 flex-shrink-0" size={18} />
                  <p className="text-sm text-gray-400">
                    <strong className="text-amber-400">Nota:</strong> Os pagamentos diretos representam serviços 
                    contratados pela Maclinea mas pagos diretamente pela Usifix, funcionando tanto como 
                    investimento quanto como despesa operacional.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-6 py-4 border-t ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                <button
                  onClick={() => setShowAporteModal(false)}
                  className="w-full py-2.5 px-4 rounded-lg bg-usifix/20 hover:bg-usifix/30 
                           text-usifix-light font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
