import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useMovimentos } from '../hooks/useMovimentos';
import { formatCurrency, formatCurrencyCompact, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import type { Movimento } from '../types/movimento';

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

export default function InvestimentoVendas() {
  const { dados, loading, error } = useMovimentos(withBase('dados/movimentos.csv'));
  const [expandedVenda, setExpandedVenda] = useState<string | null>(null);

  // Processa dados
  const { 
    aporteBrivio, 
    aporteUsifixTotal, 
    totalGastosColab,
    totalGastosOper,
    totalVendas,
    totalLiquidacao,
    vendasAgrupadas,
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
    const totalGastosColab = gastosColab.reduce((sum, m) => sum + m.debito, 0);

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
    const saldoComLiquidacao = saldoAposAporte + totalLiquidacao;
    const deficitPagina2 = totalGastosOper - saldoComLiquidacao;

    // Resultado final: déficit página 2 + vendas
    const resultadoFinal = totalVendas - (deficitPagina2 > 0 ? deficitPagina2 : 0);

    // Agrupa vendas normais por descrição/histórico
    const porDescricao = new Map<string, Movimento[]>();
    vendasNormais.forEach((mov) => {
      const desc = mov.historico || mov.categoria || 'Venda';
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

    return {
      aporteBrivio: totalAporteBrivio,
      aporteUsifixTotal,
      totalGastosColab,
      totalGastosOper,
      totalVendas,
      totalLiquidacao,
      vendasAgrupadas,
      deficitPagina1: deficitPagina1 > 0 ? deficitPagina1 : 0,
      deficitPagina2: deficitPagina2 > 0 ? deficitPagina2 : 0,
      resultadoFinal
    };
  }, [dados]);

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
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
            <div className="text-3xl md:text-4xl font-bold text-white mb-2">
              {formatCurrency(totalVendas)}
            </div>
            <p className="text-gray-500 text-sm">{vendasAgrupadas.length} tipos de receita</p>
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
                ② Déficit a Cobrir
              </h3>
              <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                <TrendingDown size={20} />
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">
              -{formatCurrency(deficitPagina2)}
            </div>
            <p className="text-gray-500 text-sm">Vindo da página 2</p>
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
                ③ Resultado Final
              </h3>
              <div className={`p-2 rounded-xl ${
                resultadoFinal >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {resultadoFinal >= 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
            </div>
            <div className={`text-3xl md:text-4xl font-bold mb-2 ${
              resultadoFinal >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {resultadoFinal >= 0 ? '+' : ''}{formatCurrency(resultadoFinal)}
            </div>
            <p className="text-gray-500 text-sm">
              {resultadoFinal >= 0 ? 'Superávit' : 'Déficit final'}
            </p>
          </motion.div>
        </section>

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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatCurrencyCompact(value)}
                      tick={{ fill: '#8B98A5', fontSize: 11 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#8B98A5', fontSize: 10 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      width={110}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as VendaAgrupada;
                        return (
                          <div className="bg-card border border-white/10 rounded-lg p-4 shadow-xl">
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
                    <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="total"
                        position="right"
                        formatter={(value) => formatCurrency(Number(value) || 0)}
                        style={{ fill: '#E5E7EB', fontSize: 10, fontWeight: 500 }}
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
                      labelLine={{ stroke: '#8B98A5', strokeWidth: 1 }}
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
                          <div className="bg-card border border-white/10 rounded-lg p-4 shadow-xl">
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
                        <span className="text-gray-300 text-xs">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
                  onClick={() => setExpandedVenda(
                    expandedVenda === venda.descricao ? null : venda.descricao
                  )}
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
                    {expandedVenda === venda.descricao ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Lançamentos Expandidos */}
                {expandedVenda === venda.descricao && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/10"
                  >
                    <div className="p-4 max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="text-gray-500 border-b border-white/10">
                          <tr>
                            <th className="text-left py-2 px-2">Descrição</th>
                            <th className="text-left py-2 px-2 hidden md:table-cell">Cliente</th>
                            <th className="text-right py-2 px-2">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {venda.lancamentos.map((lanc, idx) => (
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
                              <td className="py-3 px-2 text-right font-medium text-green-400">
                                {formatCurrency(lanc.credito)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

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
    </motion.div>
  );
}
