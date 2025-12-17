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
  Users, 
  Wallet, 
  TrendingDown, 
  PieChartIcon, 
  BarChart3, 
  FileText, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { useMovimentos } from '../hooks/useMovimentos';
import { formatCurrency, formatCurrencyCompact, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { DrillDownModal } from '../components/ui/DrillDownModal';
import { useChartTheme } from '../hooks/useChartTheme';
import type { Movimento, CategoriaAgregada } from '../types/movimento';

// IDs das categorias trabalhistas (gastos com colaboradores)
const CATEGORIAS_COLABORADORES: Record<number, string> = {
  87: 'FGTS Rescisão',
  88: 'Salários Rescisão',
  94: 'Ações Trabalhistas',
  24: 'Folha de Pagamento',
  73: '13º Salário',
  38: 'Adiantamento Salário',
  22: 'FGTS Mensal',
  56: 'Vale Transporte',
  59: 'Alimentação',
  97: 'Plano de Saúde',
  31: 'Seguro Funcionários',
  58: 'Segurança Trabalho',
};

// Gastos manuais com colaboradores (não presentes no CSV)
// Esses valores são adicionados manualmente ao cálculo
const GASTOS_MANUAIS_COLABORADORES = [
  { descricao: '2ª Parcela 13º Salário', valor: 62566.93, categoriaId: 73 },
  { descricao: 'Vale dia 20 (Adiantamento)', valor: 38279.33, categoriaId: 38 },
];
const TOTAL_GASTOS_MANUAIS = GASTOS_MANUAIS_COLABORADORES.reduce((sum, g) => sum + g.valor, 0);

// Cores vibrantes para o gráfico de pizza
const PIE_COLORS = [
  '#8B1538', // maclinea
  '#008DD0', // usifix
  '#B91C4A', // maclinea-light
  '#95C6EB', // usifix-light
  '#5C0E25', // maclinea-dark
  '#006699', // usifix-dark
  '#FF6B6B', // coral
  '#4ECDC4', // teal
  '#FFA726', // orange
  '#7E57C2', // purple
  '#26A69A', // green
  '#42A5F5', // blue
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

// Verifica se é gasto com colaborador
function isGastoColaborador(mov: Movimento): boolean {
  return mov.debito > 0 && CATEGORIAS_COLABORADORES[mov.categoriaId] !== undefined;
}

interface GastoCategoria {
  categoria: string;
  categoriaId: number;
  total: number;
  count: number;
  percentual: number;
  lancamentos: Movimento[];
}

export default function InvestimentoColaboradores() {
  const { dados, loading, error } = useMovimentos(withBase('dados/movimentos.csv'));
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaAgregada | null>(null);
  const { colors, isDark } = useChartTheme();

  // Processa dados
  const { aporteBrivio, totalGastos, categorias } = useMemo(() => {
    if (!dados) {
      return { aporteBrivio: 0, gastosColaboradores: [], totalGastos: 0, categorias: [] };
    }

    const movimentos = dados.movimentos;

    // Calcula aporte Brivio
    const aportesBrivio = movimentos.filter(isAporteBrivio);
    const totalAporteBrivio = aportesBrivio.reduce((sum, m) => sum + m.credito, 0);

    // Filtra gastos com colaboradores
    const gastosColab = movimentos.filter(isGastoColaborador);
    const totalGastosBancarios = gastosColab.reduce((sum, m) => sum + m.debito, 0);
    // Total inclui gastos manuais (2ª parcela 13º salário)
    const totalGastos = totalGastosBancarios + TOTAL_GASTOS_MANUAIS;

    // Agrupa por categoria
    const porCategoria = new Map<number, Movimento[]>();
    gastosColab.forEach((mov) => {
      const lista = porCategoria.get(mov.categoriaId) || [];
      lista.push(mov);
      porCategoria.set(mov.categoriaId, lista);
    });

    // Cria lançamentos virtuais para os gastos manuais (para aparecer nos overlays)
    const lancamentosManuais: Movimento[] = GASTOS_MANUAIS_COLABORADORES.map((gasto, index) => ({
      id: -1000 - index, // IDs negativos para não conflitar
      data: new Date('2025-12-20'),
      dataStr: '20/12/2025',
      diaSemana: 'Sexta-Feira',
      tipo: 'Pagar' as const,
      credito: 0,
      debito: gasto.valor,
      banco: 'MANUAL',
      documento: 'MANUAL',
      parcela: '',
      categoria: CATEGORIAS_COLABORADORES[gasto.categoriaId] || 'Outros',
      categoriaId: gasto.categoriaId,
      historico: `${gasto.descricao} (LANÇAMENTO MANUAL)`,
      fornecedor: 'Maclinea',
    }));

    // Adiciona lançamentos manuais às suas categorias
    lancamentosManuais.forEach((mov) => {
      const lista = porCategoria.get(mov.categoriaId) || [];
      lista.push(mov);
      porCategoria.set(mov.categoriaId, lista);
    });

    // Cria array de categorias (incluindo valores manuais)
    const cats: GastoCategoria[] = Array.from(porCategoria.entries())
      .map(([catId, lista]) => {
        const total = lista.reduce((sum, m) => sum + m.debito, 0);
        return {
          categoria: CATEGORIAS_COLABORADORES[catId] || 'Outros',
          categoriaId: catId,
          total,
          count: lista.length,
          percentual: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
          lancamentos: lista.sort((a, b) => b.debito - a.debito),
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      aporteBrivio: totalAporteBrivio,
      gastosColaboradores: gastosColab,
      totalGastos,
      categorias: cats,
    };
  }, [dados]);

  const saldoRestante = aporteBrivio - totalGastos;

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
    const threshold = 0.015; // 1%
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
          <div className="w-12 h-12 border-4 border-maclinea border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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

      {/* Botão Flutuante - Próxima Página */}
      <Link
        to="/investimento-operacional"
        className="fixed right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-maclinea/90 hover:bg-maclinea text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
        title="Página 2 - Operacional"
      >
        <ArrowRight size={24} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Página 2 - Operacional
        </span>
      </Link>

      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-maclinea/20 via-transparent to-maclinea/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-maclinea/10 via-transparent to-transparent" />
        
        <div className="relative container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Destinação do Investimento - Colaboradores
                </h1>
                <p className="text-gray-400 text-lg">
                  Aporte Família Brivio → Gastos com Colaboradores
                </p>
              </div>
              <img
                src={withBase('logos/maclinea.png')}
                alt="Maclinea"
                className="h-20 md:h-12"
              />
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Aporte */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 bg-gradient-to-br from-maclinea/20 to-transparent border-maclinea/30"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                ① Aporte Família Brivio
              </h3>
              <div className="p-2 rounded-xl bg-maclinea/20 text-maclinea-light">
                <Wallet size={20} />
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-white mb-2">
              {formatCurrency(aporteBrivio)}
            </div>
            <p className="text-gray-500 text-sm">Câmbio Financeiro - Itália</p>
          </motion.div>

          {/* Total Gastos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 bg-gradient-to-br from-amber-500/20 to-transparent border-amber-500/30"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                ② Gastos com Colaboradores
              </h3>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Users size={20} />
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-amber-400 mb-2">
              -{formatCurrency(totalGastos)}
            </div>
            <p className="text-gray-500 text-sm">{categorias.length} categorias</p>
          </motion.div>

          {/* Saldo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`glass-card p-6 bg-gradient-to-br ${
              saldoRestante >= 0
                ? 'from-green-500/20 to-transparent border-green-500/30'
                : 'from-red-500/20 to-transparent border-red-500/30'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                ③ {saldoRestante >= 0 ? 'Saldo' : 'Déficit'}
              </h3>
              <div className={`p-2 rounded-xl ${
                saldoRestante >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {saldoRestante >= 0 ? <TrendingDown size={20} /> : <AlertTriangle size={20} />}
              </div>
            </div>
            <div className={`text-3xl md:text-4xl font-bold mb-2 ${
              saldoRestante >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {saldoRestante >= 0 ? '+' : ''}{formatCurrency(saldoRestante)}
            </div>
            <p className="text-gray-500 text-sm">
              {saldoRestante >= 0 
                ? 'Recursos disponíveis'
                : 'Passa para Página 2'
              }
            </p>
          </motion.div>
        </section>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32">
          {/* Gráfico de Barras */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-maclinea/20 text-maclinea-light">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-xl font-bold text-white">
                Gastos por Plano de Contas
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
                    dataKey="categoria"
                    tick={{ fill: colors.textSecondary, fontSize: 11 }}
                    axisLine={{ stroke: colors.axis }}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as GastoCategoria;
                      return (
                        <div className={`rounded-lg p-4 shadow-xl ${isDark ? 'bg-card border border-white/10' : 'bg-white border border-gray-200'}`}>
                          <p className="font-bold text-white mb-2">{data.categoria}</p>
                          <p className="text-maclinea-light text-lg font-semibold">
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
              <div className="p-2 rounded-lg bg-maclinea/20 text-maclinea-light">
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
                          <p className="text-maclinea-light text-lg font-semibold">
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
                      <h4 className="font-semibold text-white">{cat.categoria}</h4>
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
        {saldoRestante < 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <Link to="/investimento-operacional">
              <div className="glass-card p-8 bg-gradient-to-r from-red-500/10 via-transparent to-usifix/10 border-red-500/20 hover:border-usifix/30 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                        <ArrowRight size={20} />
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        Continuar para Página 2
                      </h3>
                    </div>
                    <p className="text-gray-400 mb-4">
                      O déficit de <span className="text-red-400 font-bold">{formatCurrency(Math.abs(saldoRestante))}</span> será coberto pelo aporte da Usifix
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
                        Déficit: {formatCurrencyCompact(Math.abs(saldoRestante))}
                      </div>
                      <span className="text-gray-500">→</span>
                      <div className="px-3 py-1 rounded-full bg-usifix/20 text-usifix-light text-sm">
                        Aporte Usifix
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-2 text-usifix-light group-hover:translate-x-2 transition-transform">
                    <span className="font-medium">Ver Gastos Operacionais</span>
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
            Relatório de Destinação de Investimentos • Aporte Família Brivio • Página 1
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
    </motion.div>
  );
}
