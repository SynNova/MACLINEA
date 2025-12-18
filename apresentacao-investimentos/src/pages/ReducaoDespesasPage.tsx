import { useState } from 'react';
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
  LabelList,
} from 'recharts';
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useChartTheme } from '../hooks/useChartTheme';

// Despesas Administrativas - Antes vs Depois
const DESPESAS_ADM = [
  { nome: 'ALUGUEL', antes: 55000, depois: 27500 },
  { nome: 'CONTABILIDADE', antes: 28500, depois: 5000 },
  { nome: 'LUZ', antes: 28000, depois: 11123.46 },
  { nome: 'ALIMENTAÇÃO', antes: 32120, depois: 16000 },
  { nome: 'PORTARIA', antes: 26000, depois: 10000 },
  { nome: 'SISTEMA ERP', antes: 18000, depois: 5000 },
  { nome: 'LIMPEZA', antes: 15000, depois: 5000 },
  { nome: 'INFRA TI', antes: 14000, depois: 8000 },
  { nome: 'JARDINAGEM', antes: 10000, depois: 5000 },
  { nome: 'SEGUROS', antes: 12000, depois: 8500 },
  { nome: 'ÁGUA', antes: 6000, depois: 3000 },
  { nome: 'TELEFONE/INTERNET', antes: 6300, depois: 5000 },
  { nome: 'IMPRESSORAS/PC', antes: 5000, depois: 5000 },
  { nome: 'PUBLICIDADE', antes: 6000, depois: 6000 },
  { nome: 'SEGURANÇA', antes: 4700, depois: 4700 },
  { nome: 'SEGURO FUNC.', antes: 1200, depois: 1200 },
  { nome: 'MEDICINA TRAB.', antes: 1200, depois: 1200 },
  { nome: 'CONSULT', antes: 4760, depois: 4760 },
  { nome: 'DESP. ADM', antes: 10000, depois: 10000 },
  { nome: 'OUTROS', antes: 6000, depois: 6000 },
].map(d => ({ ...d, economia: d.antes - d.depois, percentReduction: d.antes > 0 ? ((d.antes - d.depois) / d.antes) * 100 : 0 }));

const totalAntes = DESPESAS_ADM.reduce((sum, d) => sum + d.antes, 0);
const totalDepois = DESPESAS_ADM.reduce((sum, d) => sum + d.depois, 0);
const totalEconomia = totalAntes - totalDepois;
const percentEconomia = (totalEconomia / totalAntes) * 100;

// Dados para o gráfico (só os que tiveram redução, ordenados)
const chartData = DESPESAS_ADM
  .filter(d => d.economia > 0)
  .sort((a, b) => b.economia - a.economia)
  .slice(0, 10);

export default function ReducaoDespesasPage() {
  const { colors, isDark } = useChartTheme();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Navegação - Página Anterior */}
      <Link
        to="/investimento-vendas"
        className="fixed left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-usifix/90 hover:bg-usifix text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowLeft size={24} />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Vendas
        </span>
      </Link>

      {/* Navegação - Próxima Página */}
      <Link
        to="/reducao-folha"
        className="fixed right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-maclinea/90 hover:bg-maclinea text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowRight size={24} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Folha de Pagamento
        </span>
      </Link>

      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-usifix/20 via-transparent to-green-500/10" />
        <div className="relative container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Redução de Despesas Administrativas
                </h1>
                <p className="text-gray-400 text-lg">
                  Reestruturação 2025/2026 • Página 4
                </p>
              </div>
              <img src={withBase('logos/usifix.svg')} alt="Usifix" className="h-12" />
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* ============================================
            SEÇÃO PRINCIPAL - HERO (100% na tela)
            ============================================ */}
        <section className="min-h-[60vh] flex flex-col justify-center">
          {/* KPIs em destaque */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Antes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ANTES</span>
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-red-400">{formatCurrency(totalAntes)}</div>
              <p className="text-gray-500 text-sm mt-1">Despesas mensais</p>
            </motion.div>

            {/* Depois */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">DEPOIS</span>
                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                  <ArrowDownRight size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-green-400">{formatCurrency(totalDepois)}</div>
              <p className="text-gray-500 text-sm mt-1">Nova estrutura</p>
            </motion.div>

            {/* Economia */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 bg-gradient-to-br from-usifix/20 to-transparent border-usifix/30"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ECONOMIA</span>
                <div className="p-2 rounded-lg bg-usifix/20 text-usifix-light">
                  <Building2 size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-usifix-light">{formatCurrency(totalEconomia)}</div>
              <p className="text-gray-500 text-sm mt-1">-{formatPercentage(percentEconomia, 0)} por mês</p>
            </motion.div>
          </div>

          {/* Gráfico de Barras Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Top 10 Maiores Reduções</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fill: colors.textSecondary, fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fill: colors.textSecondary, fontSize: 11 }} width={95} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className={`rounded-lg p-3 shadow-xl ${isDark ? 'bg-card border border-white/10' : 'bg-white border border-gray-200'}`}>
                          <p className="font-bold text-white text-sm">{d.nome}</p>
                          <p className="text-gray-400 text-xs">Antes: {formatCurrency(d.antes)}</p>
                          <p className="text-gray-400 text-xs">Depois: {formatCurrency(d.depois)}</p>
                          <p className="text-green-400 text-sm font-semibold mt-1">Economia: {formatCurrency(d.economia)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="economia" radius={[0, 6, 6, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="#22c55e" />
                    ))}
                    <LabelList dataKey="economia" position="right" formatter={(v) => formatCurrency(Number(v) || 0)} style={{ fill: '#22c55e', fontSize: 10 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </section>

        {/* ============================================
            DETALHAMENTO (rolagem)
            ============================================ */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-usifix-light" />
                <span className="text-lg font-bold text-white">Ver Todas as Despesas ({DESPESAS_ADM.length} itens)</span>
              </div>
              {showDetails ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/10"
                >
                  <div className="p-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-gray-400">Item</th>
                          <th className="text-right py-3 px-4 text-gray-400">Antes</th>
                          <th className="text-right py-3 px-4 text-gray-400">Depois</th>
                          <th className="text-right py-3 px-4 text-gray-400">Economia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DESPESAS_ADM.map((d, i) => (
                          <tr key={d.nome} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                            <td className="py-3 px-4 text-white">{d.nome}</td>
                            <td className="py-3 px-4 text-right text-red-400/80">{formatCurrency(d.antes)}</td>
                            <td className="py-3 px-4 text-right text-green-400/80">{formatCurrency(d.depois)}</td>
                            <td className="py-3 px-4 text-right">
                              {d.economia > 0 ? (
                                <span className="text-green-400">{formatCurrency(d.economia)}</span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-white/10 bg-white/5">
                          <td className="py-4 px-4 font-bold text-white">TOTAL</td>
                          <td className="py-4 px-4 text-right text-red-400 font-bold">{formatCurrency(totalAntes)}</td>
                          <td className="py-4 px-4 text-right text-green-400 font-bold">{formatCurrency(totalDepois)}</td>
                          <td className="py-4 px-4 text-right text-green-400 font-bold">{formatCurrency(totalEconomia)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">Redução de Despesas Administrativas • Página 4</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <img src={withBase('logos/maclinea.png')} alt="Maclinea" className="h-8 opacity-50" />
            <img src={withBase('logos/usifix.svg')} alt="Usifix" className="h-6 opacity-50" />
          </div>
        </footer>
      </main>
    </motion.div>
  );
}

