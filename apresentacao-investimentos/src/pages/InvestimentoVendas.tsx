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
  ShoppingCart, 
  Wallet, 
  TrendingUp,
  TrendingDown, 
  PieChartIcon, 
  BarChart3, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  FileText,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Package,
  Info,
  X
} from 'lucide-react';
import { useMovimentos } from '../hooks/useMovimentos';
import { formatCurrency, formatCurrencyCompact, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { DrillDownModal } from '../components/ui/DrillDownModal';
import { useChartTheme } from '../hooks/useChartTheme';
import type { Movimento, CategoriaAgregada } from '../types/movimento';

// IDs das categorias trabalhistas (gastos com colaboradores)
const CATEGORIAS_COLABORADORES: number[] = [87, 88, 94, 24, 73, 38, 22, 56, 59, 97, 31, 58];

// Categorias especiais a ignorar
const CATEGORIAS_IGNORAR: number[] = [6, 5]; // Transferência, Implantação Saldo

// IDs de vendas
const CATEGORIAS_VENDAS = [3, 4]; // Venda de Produtos, Venda de Serviços

// Termos para identificar liquidação de ativos (vendas internas do grupo - NÃO conta como venda)
const TERMOS_LIQUIDACAO_ATIVOS = ['MECA', 'IANCO'];

// Aportes diretos da Usifix (pagamentos feitos diretamente pela Usifix para fornecedores da Maclinea)
const TOTAL_APORTES_DIRETOS = 55748.00 + 71117.00; // MDS Instalação + SOFKA

// Gastos manuais com colaboradores (não presentes no CSV) - usado para consistência entre páginas
// 2ª Parcela 13º Salário (62566.93) + Vale dia 20 (38279.33)
const TOTAL_GASTOS_MANUAIS_COLAB = 62566.93 + 38279.33;

// Mapeamento de nomes duplicados (normalização)
const NOMES_NORMALIZADOS: Record<string, string> = {
  'GRUPO K1 SA': 'Receb Grupo K1',
  'Grupo K1 SA': 'Receb Grupo K1',
  'GRUPO K1': 'Receb Grupo K1',
};

// Função para normalizar descrições duplicadas
function normalizarDescricao(desc: string): string {
  // Verifica mapeamento direto
  if (NOMES_NORMALIZADOS[desc]) {
    return NOMES_NORMALIZADOS[desc];
  }
  // Verifica se contém algum termo conhecido
  const descUpper = desc.toUpperCase();
  for (const [key, value] of Object.entries(NOMES_NORMALIZADOS)) {
    if (descUpper.includes(key.toUpperCase())) {
      return value;
    }
  }
  return desc;
}

// Cores vibrantes para o gráfico
const PIE_COLORS = [
  '#00C853', // green
  '#4CAF50', // green-500
  '#8BC34A', // light-green
  '#CDDC39', // lime
  '#009688', // teal
  '#00BCD4', // cyan
  '#03A9F4', // light-blue
  '#2196F3', // blue
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
  
  if (historico.includes('CAMBIO') || mov.credito > 3000000) return false;
  
  return historico.includes('USIFIX') || historico.includes('APORTE');
}

// Verifica se é gasto com colaborador
function isGastoColaborador(mov: Movimento): boolean {
  return mov.debito > 0 && CATEGORIAS_COLABORADORES.includes(mov.categoriaId);
}

// Verifica se é gasto operacional
function isGastoOperacional(mov: Movimento): boolean {
  if (mov.debito <= 0) return false;
  if (CATEGORIAS_COLABORADORES.includes(mov.categoriaId)) return false;
  if (CATEGORIAS_IGNORAR.includes(mov.categoriaId)) return false;
  return true;
}

// Verifica se é liquidação de ativos (vendas para empresas do grupo - conta como investimento na pág 2)
function isLiquidacaoAtivos(mov: Movimento): boolean {
  if (!CATEGORIAS_VENDAS.includes(mov.categoriaId)) return false;
  if (mov.credito <= 0) return false;
  
  const historico = (mov.historico || '').toUpperCase();
  const fornecedor = (mov.fornecedor || '').toUpperCase();
  
  return TERMOS_LIQUIDACAO_ATIVOS.some(termo => 
    historico.includes(termo) || fornecedor.includes(termo)
  );
}

// Verifica se é venda normal (não liquidação de ativos)
function isVendaNormal(mov: Movimento): boolean {
  if (!CATEGORIAS_VENDAS.includes(mov.categoriaId)) return false;
  if (mov.credito <= 0) return false;
  
  // Não é venda normal se for liquidação de ativos
  return !isLiquidacaoAtivos(mov);
}

interface VendaAgrupada {
  descricao: string;
  total: number;
  count: number;
  percentual: number;
  lancamentos: Movimento[];
}

interface LiquidacaoItem {
  descricao: string;
  total: number;
  count: number;
  percentual: number;
  lancamentos: Movimento[];
}

// Cores para liquidação de ativos
const LIQUIDACAO_COLORS = [
  '#008DD0', // usifix
  '#95C6EB', // usifix-light
];

export default function InvestimentoVendas() {
  const { dados, loading, error } = useMovimentos(withBase('dados/movimentos.csv'));
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaAgregada | null>(null);
  const [expandedLiquidacao, setExpandedLiquidacao] = useState<string | null>(null);
  const [isLiquidacaoExpanded, setIsLiquidacaoExpanded] = useState(false);
  const [isLiquidacaoModalOpen, setIsLiquidacaoModalOpen] = useState(false);
  const { colors, isDark } = useChartTheme();

  // Processa dados
  const { 
    aporteBrivio, 
    aporteUsifixTotal, 
    totalGastosColab,
    totalGastosOper,
    totalVendas,
    totalLiquidacao,
    vendasAgrupadas,
    liquidacaoAgrupada,
    deficitPagina2,
    resultadoFinal
  } = useMemo(() => {
    if (!dados) {
      return { 
        aporteBrivio: 0, 
        aporteUsifixTotal: 0, 
        totalGastosColab: 0, 
        totalGastosOper: 0,
        totalVendas: 0,
        totalLiquidacao: 0,
        vendasAgrupadas: [],
        liquidacaoAgrupada: [],
        deficitPagina1: 0,
        deficitPagina2: 0,
        resultadoFinal: 0
      };
    }

    const movimentos = dados.movimentos;

    // Calcula aportes
    const aportesBrivio = movimentos.filter(isAporteBrivio);
    const totalAporteBrivio = aportesBrivio.reduce((sum, m) => sum + m.credito, 0);

    const aportesUsifix = movimentos.filter(isAporteUsifix);
    const totalAporteUsifix = aportesUsifix.reduce((sum, m) => sum + m.credito, 0);

    // Calcula gastos
    const gastosColab = movimentos.filter(isGastoColaborador);
    // Total inclui gastos manuais (2ª parcela 13º salário)
    const totalGastosColab = gastosColab.reduce((sum, m) => sum + m.debito, 0) + TOTAL_GASTOS_MANUAIS_COLAB;

    const gastosOper = movimentos.filter(isGastoOperacional);
    // Total de gastos operacionais inclui os aportes diretos (que são também gastos)
    const totalGastosOperBancario = gastosOper.reduce((sum, m) => sum + m.debito, 0);
    const totalGastosOper = totalGastosOperBancario + TOTAL_APORTES_DIRETOS;

    // Calcula liquidação de ativos (investimento adicional contabilizado na pág 2)
    const liquidacaoAtivos = movimentos.filter(isLiquidacaoAtivos);
    const totalLiquidacao = liquidacaoAtivos.reduce((sum, m) => sum + m.credito, 0);

    // Separa vendas normais (sem liquidação de ativos)
    const vendasNormais = movimentos.filter(isVendaNormal);
    const totalVendas = vendasNormais.reduce((sum, m) => sum + m.credito, 0);

    // Cálculo do fluxo das páginas anteriores
    // Aporte total Usifix = bancário + diretos (MDS + SOFKA)
    const aporteUsifixTotal = totalAporteUsifix + TOTAL_APORTES_DIRETOS;
    const deficitPagina1 = totalGastosColab - totalAporteBrivio;
    const saldoAposAporte = aporteUsifixTotal - (deficitPagina1 > 0 ? deficitPagina1 : 0);
    // Déficit página 2 agora é SEM liquidação (liquidação vai para página 3)
    const deficitPagina2 = totalGastosOper - saldoAposAporte;

    // Resultado final: (vendas + liquidação) - déficit página 2
    const resultadoFinal = (totalVendas + totalLiquidacao) - (deficitPagina2 > 0 ? deficitPagina2 : 0);

    // Agrupa vendas normais por descrição/histórico (com normalização de nomes duplicados)
    const porDescricao = new Map<string, Movimento[]>();
    vendasNormais.forEach((mov) => {
      const descOriginal = mov.historico || mov.categoria || 'Venda';
      const desc = normalizarDescricao(descOriginal); // Normaliza nomes duplicados
      const lista = porDescricao.get(desc) || [];
      lista.push(mov);
      porDescricao.set(desc, lista);
    });

    // Cria array de vendas agrupadas
    const vendasAgrupadas: VendaAgrupada[] = Array.from(porDescricao.entries())
      .map(([desc, lista]) => {
        const total = lista.reduce((sum, m) => sum + m.credito, 0);
        return {
          descricao: desc,
          total,
          count: lista.length,
          percentual: totalVendas > 0 ? (total / totalVendas) * 100 : 0,
          lancamentos: lista.sort((a, b) => b.credito - a.credito),
        };
      })
      .sort((a, b) => b.total - a.total);

    // Agrupa liquidação de ativos
    const porLiquidacao = new Map<string, Movimento[]>();
    liquidacaoAtivos.forEach((mov) => {
      const desc = mov.historico || mov.fornecedor || 'Liquidação';
      const lista = porLiquidacao.get(desc) || [];
      lista.push(mov);
      porLiquidacao.set(desc, lista);
    });

    const liquidacaoAgrupada: LiquidacaoItem[] = Array.from(porLiquidacao.entries())
      .map(([desc, lista]) => {
        const total = lista.reduce((sum, m) => sum + m.credito, 0);
        return {
          descricao: desc,
          total,
          count: lista.length,
          percentual: totalLiquidacao > 0 ? (total / totalLiquidacao) * 100 : 0,
          lancamentos: lista.sort((a, b) => b.credito - a.credito),
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      aporteBrivio: totalAporteBrivio,
      aporteUsifixTotal,
      totalGastosColab,
      totalGastosOper,
      totalVendas,
      totalLiquidacao,
      vendasAgrupadas,
      liquidacaoAgrupada,
      deficitPagina1: deficitPagina1 > 0 ? deficitPagina1 : 0,
      deficitPagina2: deficitPagina2 > 0 ? deficitPagina2 : 0,
      resultadoFinal
    };
  }, [dados]);

  // Função para converter VendaAgrupada para CategoriaAgregada (para o modal)
  const handleVendaClick = (venda: VendaAgrupada) => {
    const categoriaAgregada: CategoriaAgregada = {
      categoria: venda.descricao,
      categoriaId: 0, // Vendas não têm ID de categoria específico
      total: venda.total,
      count: venda.count,
      lancamentos: venda.lancamentos,
      top3: venda.lancamentos.slice(0, 3),
      percentual: venda.percentual,
    };
    setSelectedCategoria(categoriaAgregada);
  };

  // Dados para gráficos de vendas
  const chartData = vendasAgrupadas.slice(0, 10).map((venda, index) => ({
    ...venda,
    fill: PIE_COLORS[index % PIE_COLORS.length],
    name: venda.descricao.length > 25 ? venda.descricao.substring(0, 25) + '...' : venda.descricao,
    value: venda.total,
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
        descricao: 'Outros',
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
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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

  const totalEntradas = aporteBrivio + aporteUsifixTotal + totalLiquidacao + totalVendas;
  const totalSaidas = totalGastosColab + totalGastosOper;

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
        to="/investimento-operacional"
        className="fixed left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-green-500/90 hover:bg-green-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
        title="Página 2 - Operacional"
      >
        <ArrowLeft size={24} />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Página 2 - Operacional
        </span>
      </Link>

      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-transparent to-green-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Resultado Final - Vendas
                </h1>
                <p className="text-gray-400 text-lg">
                  Déficit Anterior + Receita de Vendas → Resultado Final
                </p>
              </div>
              <img
                src={withBase('logos/maclinea.png')}
                alt="Maclinea"
                className="h-20 md:h-10"
              />
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Vendas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                ① Total de Vendas
              </h3>
              <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
                <ShoppingCart size={20} />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white mb-2">
              {formatCurrency(totalVendas)}
            </div>
            <p className="text-gray-500 text-xs">{vendasAgrupadas.length} tipos de receita</p>
          </motion.div>

          {/* Liquidação de Ativos e MP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6 bg-gradient-to-br from-usifix/20 to-transparent border-usifix/30 cursor-pointer hover:border-usifix/50 transition-colors"
            onClick={() => setIsLiquidacaoModalOpen(true)}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                ② Liquidação Ativos
              </h3>
              <div className="p-2 rounded-xl bg-usifix/20 text-usifix-light">
                <Package size={20} />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-usifix-light mb-2">
              +{formatCurrency(totalLiquidacao)}
            </div>
            <p className="text-gray-500 text-xs">MECA + IANCO • Clique para detalhes</p>
          </motion.div>

          {/* Déficit Acumulado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 bg-gradient-to-br from-red-500/20 to-transparent border-red-500/30"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                ③ Déficit a Cobrir
              </h3>
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                <TrendingDown size={20} />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-red-400 mb-2">
              -{formatCurrency(deficitPagina2)}
            </div>
            <p className="text-gray-500 text-xs">Vindo da página 2</p>
          </motion.div>

          {/* Resultado Final */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`glass-card p-6 bg-gradient-to-br ${
              resultadoFinal >= 0
                ? 'from-green-500/20 to-transparent border-green-500/30'
                : 'from-red-500/20 to-transparent border-red-500/30'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                ④ Resultado Final
              </h3>
              <div className={`p-2 rounded-xl ${
                resultadoFinal >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {resultadoFinal >= 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
            </div>
            <div className={`text-2xl md:text-3xl font-bold mb-2 ${
              resultadoFinal >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {resultadoFinal >= 0 ? '+' : ''}{formatCurrency(resultadoFinal)}
            </div>
            <p className="text-gray-500 text-xs">
              {resultadoFinal >= 0 ? 'Superávit' : 'Déficit final'}
            </p>
          </motion.div>
        </section>

        {/* Hint - Contas Recebidas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8 flex items-center gap-3 text-gray-400 text-sm"
        >
          <Info size={16} className="text-green-400 flex-shrink-0" />
          <p>
            <span className="text-green-400 font-medium">Nota:</span> Os valores de vendas representam{' '}
            <span className="text-white font-medium">contas recebidas</span> no período, não vendas efetivadas no mês.
          </p>
        </motion.div>

        {/* Gráficos */}
        {vendasAgrupadas.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32">
            {/* Gráfico de Barras */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                  <BarChart3 size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Receitas por Tipo
                </h3>
              </div>
              
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 10, right: 80, left: 120, bottom: 10 }}
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
                      dataKey="name"
                      tick={{ fill: colors.textSecondary, fontSize: 10 }}
                      axisLine={{ stroke: colors.axis }}
                      width={110}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as VendaAgrupada;
                        return (
                          <div className={`rounded-lg p-4 shadow-xl ${isDark ? 'bg-card border border-white/10' : 'bg-white border border-gray-200'}`}>
                            <p className="font-bold text-white mb-2">{data.descricao}</p>
                            <p className="text-green-400 text-lg font-semibold">
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
                        const payload = data as unknown as VendaAgrupada;
                        const venda = vendasAgrupadas.find(v => v.descricao === payload.descricao);
                        if (venda) handleVendaClick(venda);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {chartData.map((entry, index) => (
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
              <p className="text-xs text-gray-500 mt-3 text-center">
                Clique nas barras para ver detalhes
              </p>
            </motion.section>

            {/* Gráfico de Pizza */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                  <PieChartIcon size={20} />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Distribuição das Vendas
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
                        const venda = vendasAgrupadas.find(v => v.descricao === data.descricao);
                        if (venda) handleVendaClick(venda);
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
                        const data = payload[0].payload as VendaAgrupada;
                        return (
                          <div className={`rounded-lg p-4 shadow-xl ${isDark ? 'bg-card border border-white/10' : 'bg-white border border-gray-200'}`}>
                            <p className="font-bold text-white mb-2">{data.descricao}</p>
                            <p className="text-green-400 text-lg font-semibold">
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
              <p className="text-xs text-gray-500 mt-3 text-center">
                Clique nas fatias para ver detalhes
              </p>
            </motion.section>
          </div>
        )}

        {/* Detalhamento das Vendas */}
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
              Detalhamento das Vendas
            </h3>
          </div>

          <div className="space-y-4">
            {vendasAgrupadas.map((venda, index) => (
              <motion.div
                key={venda.descricao}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.03 }}
                className="glass-card overflow-hidden"
              >
                {/* Header da Venda */}
                <button
                  onClick={() => handleVendaClick(venda)}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <div className="text-left">
                      <h4 className="font-semibold text-white">{venda.descricao}</h4>
                      <p className="text-sm text-gray-500">
                        {venda.count} lançamento{venda.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-green-400">{formatCurrency(venda.total)}</p>
                      <p className="text-sm text-gray-500">{formatPercentage(venda.percentual)}</p>
                    </div>
                    <ArrowRight size={20} className="text-gray-400" />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Clique em uma venda para ver detalhes e gráficos
          </p>
        </motion.section>

        {/* Seção de Liquidação de Ativos - Detalhamento (Recolhível) */}
        {liquidacaoAgrupada.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <div className="glass-card bg-gradient-to-r from-usifix/10 to-usifix-light/5 border-usifix/30 overflow-hidden">
              {/* Header clicável */}
              <button
                onClick={() => setIsLiquidacaoExpanded(!isLiquidacaoExpanded)}
                className="w-full p-6 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                <div className="p-2 rounded-lg bg-usifix/20 text-usifix-light">
                  <Package size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-bold text-white">
                    Compras de Empresas do Grupo
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Aquisições feitas pela MECA e IANCO da Maclinea
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-2xl font-bold text-usifix-light">
                    +{formatCurrency(totalLiquidacao)}
                  </p>
                  <p className="text-xs text-gray-500">{liquidacaoAgrupada.length} item(s)</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  {isLiquidacaoExpanded ? (
                    <ChevronUp size={20} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                  )}
                </div>
              </button>
              
              {/* Conteúdo expansível */}
              {isLiquidacaoExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-white/10"
                >
                  <div className="p-6 pt-4">
                    {/* Lista de Liquidações */}
                    <div className="space-y-3">
                      {liquidacaoAgrupada.map((item, index) => {
                        const isMeca = item.descricao.toUpperCase().includes('MECA');
                        const isIanco = item.descricao.toUpperCase().includes('IANCO');
                        
                        return (
                          <div
                            key={item.descricao}
                            className="glass-card overflow-hidden bg-white/5"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedLiquidacao(
                                  expandedLiquidacao === item.descricao ? null : item.descricao
                                );
                              }}
                              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: LIQUIDACAO_COLORS[index % LIQUIDACAO_COLORS.length] }}
                                />
                                <div className="text-left">
                                  <h4 className="font-semibold text-white">{item.descricao}</h4>
                                  <p className="text-xs text-gray-500">
                                    {isMeca 
                                      ? 'MECA Metalúrgica - Compra de Ativos' 
                                      : isIanco
                                        ? 'IANCO Metalúrgica - Compra de Matéria Prima'
                                        : 'Empresa do Grupo Usifix'
                                    }
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold text-usifix-light">{formatCurrency(item.total)}</p>
                                  <p className="text-xs text-gray-500">{formatPercentage(item.percentual)}</p>
                                </div>
                                {expandedLiquidacao === item.descricao ? (
                                  <ChevronUp size={18} className="text-gray-400" />
                                ) : (
                                  <ChevronDown size={18} className="text-gray-400" />
                                )}
                              </div>
                            </button>

                            {expandedLiquidacao === item.descricao && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-white/10"
                              >
                                <div className="p-4">
                                  <table className="w-full text-sm">
                                    <thead className="text-gray-500 border-b border-white/10">
                                      <tr>
                                        <th className="text-left py-2 px-2">Descrição</th>
                                        <th className="text-left py-2 px-2 hidden md:table-cell">Empresa</th>
                                        <th className="text-right py-2 px-2">Valor</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.lancamentos.map((lanc, idx) => (
                                        <tr
                                          key={`${lanc.id}-${idx}`}
                                          className="border-b border-white/5 hover:bg-white/5"
                                        >
                                          <td className="py-3 px-2 text-gray-300">
                                            {lanc.historico || lanc.categoria}
                                          </td>
                                          <td className="py-3 px-2 text-gray-500 hidden md:table-cell">
                                            {lanc.fornecedor || '-'}
                                          </td>
                                          <td className="py-3 px-2 text-right font-medium text-usifix-light">
                                            {formatCurrency(lanc.credito)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Nota explicativa */}
                    <div className="mt-4 p-3 rounded-lg bg-white/5 border border-usifix/20">
                      <div className="flex items-start gap-2">
                        <Info size={16} className="text-usifix-light mt-0.5 flex-shrink-0" />
                        <p className="text-gray-400 text-xs leading-relaxed">
                          <strong className="text-usifix-light">MECA</strong>: Compra de <strong className="text-green-400">ativos</strong> (máquinas e equipamentos) da Maclinea. 
                          <strong className="text-usifix-light"> IANCO</strong>: Compra de <strong className="text-green-400">matéria prima</strong> da Maclinea.
                          Ambas são empresas do grupo Usifix e essas transações representam recursos internos aplicados na operação.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.section>
        )}

        {/* Resumo Consolidado Final */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <div className={`glass-card p-8 ${
            resultadoFinal >= 0 
              ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/30' 
              : 'bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/30'
          }`}>
            <div className="flex items-center justify-center gap-3 mb-6">
              <DollarSign className={resultadoFinal >= 0 ? 'text-green-400' : 'text-red-400'} size={32} />
              <h3 className="text-2xl font-bold text-white">
                Balanço Final dos Investimentos
              </h3>
            </div>
            
            {/* Entradas */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Entradas de Recursos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-400 mb-2">Aporte Brivio</p>
                  <p className="text-xl font-bold text-maclinea-light">{formatCurrencyCompact(aporteBrivio)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-400 mb-2">Aporte Usifix</p>
                  <p className="text-xl font-bold text-usifix-light">{formatCurrencyCompact(aporteUsifixTotal)}</p>
                  <p className="text-xs text-gray-500 mt-1">Bancário + Diretos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-400 mb-2">Liquidação Ativos</p>
                  <p className="text-xl font-bold text-usifix-light">{formatCurrencyCompact(totalLiquidacao)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-400 mb-2">Vendas</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrencyCompact(totalVendas)}</p>
                </div>
              </div>
              <div className="mt-4 text-center p-3 rounded-lg bg-green-500/10">
                <p className="text-green-400 font-bold text-lg">
                  Total Entradas: {formatCurrency(totalEntradas)}
                </p>
              </div>
            </div>

            {/* Saídas */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <TrendingDown size={20} />
                Saídas de Recursos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-400 mb-2">Gastos Colaboradores</p>
                  <p className="text-xl font-bold text-amber-400">{formatCurrencyCompact(totalGastosColab)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-gray-400 mb-2">Gastos Operacionais</p>
                  <p className="text-xl font-bold text-amber-400">{formatCurrencyCompact(totalGastosOper)}</p>
                </div>
              </div>
              <div className="mt-4 text-center p-3 rounded-lg bg-red-500/10">
                <p className="text-red-400 font-bold text-lg">
                  Total Saídas: {formatCurrency(totalSaidas)}
                </p>
              </div>
            </div>

            {/* Resultado */}
            <div className="pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-gray-400 mb-2 text-lg">Resultado Final</p>
                <p className={`text-5xl font-bold ${resultadoFinal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {resultadoFinal >= 0 ? '+' : ''}{formatCurrency(resultadoFinal)}
                </p>
                <p className={`mt-4 text-lg ${resultadoFinal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {resultadoFinal >= 0 
                    ? '✓ Recursos suficientes para cobrir todas as despesas'
                    : '⚠ Déficit a ser coberto por outras fontes'
                  }
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Relatório de Destinação de Investimentos • Resultado Final • Página 3
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

      {/* Modal de Liquidação de Ativos */}
      <AnimatePresence>
        {isLiquidacaoModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setIsLiquidacaoModalOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] max-h-[80vh] overflow-y-auto z-50 glass-card border-usifix/30 rounded-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-usifix/20 to-transparent backdrop-blur-xl p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-usifix/20 text-usifix-light">
                    <Package size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Compras de Empresas do Grupo</h2>
                    <p className="text-gray-400 text-sm">Aquisições feitas pela MECA e IANCO da Maclinea</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-usifix-light">+{formatCurrency(totalLiquidacao)}</div>
                    <div className="text-gray-400 text-xs">{liquidacaoAgrupada.length} item(s)</div>
                  </div>
                  <button
                    onClick={() => setIsLiquidacaoModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    title="Fechar"
                    aria-label="Fechar modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4">
                {liquidacaoAgrupada.map((item, index) => (
                  <div
                    key={item.descricao}
                    className="glass-card p-5 bg-gradient-to-r from-usifix/10 to-transparent border-usifix/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-usifix/20 flex items-center justify-center text-usifix-light font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-white">{item.descricao}</h4>
                            <p className="text-gray-400 text-sm">
                              {item.descricao.includes('MECA') 
                                ? 'Compra de Ativos' 
                                : item.descricao.includes('IANCO') 
                                  ? 'Compra de Matéria Prima' 
                                  : 'Liquidação'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-usifix-light">{formatCurrency(item.total)}</div>
                            <div className="text-sm text-gray-500">{item.percentual.toFixed(2)}%</div>
                          </div>
                        </div>
                        {/* Barra de progresso */}
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentual}%` }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-usifix to-usifix-light rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Nota explicativa */}
                <div className="glass-card p-4 bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/20 mt-6">
                  <div className="flex items-start gap-3">
                    <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-400 text-sm leading-relaxed">
                      <span className="text-blue-400 font-medium">MECA</span>: Compra de <span className="text-blue-400">ativos</span> (máquinas e equipamentos) da Maclinea. 
                      <span className="text-blue-400 font-medium ml-2">IANCO</span>: Compra de <span className="text-blue-400">matéria prima</span> da Maclinea. 
                      Ambas são empresas do grupo Usifix e essas transações representam recursos internos aplicados na operação.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes com Overlay Charts */}
      <DrillDownModal
        isOpen={selectedCategoria !== null}
        onClose={() => setSelectedCategoria(null)}
        categoria={selectedCategoria}
        valueField="credito"
      />
    </motion.div>
  );
}
