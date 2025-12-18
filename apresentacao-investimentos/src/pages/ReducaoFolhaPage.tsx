import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  ArrowRight,
  ArrowDownRight,
  TrendingDown,
  UserMinus,
  UserCheck,
  Factory,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import { ThemeToggle } from '../components/ui/ThemeToggle';

// Dados de Mão de Obra
const FOLHA_ANTES = 908886;
const FOLHA_DEPOIS = 276505.38;
const ECONOMIA_FOLHA = FOLHA_ANTES - FOLHA_DEPOIS;
const PERCENT_ECONOMIA = (ECONOMIA_FOLHA / FOLHA_ANTES) * 100;

// Dados de Funcionários
const RESCISOES = 39;
const FUNCIONARIOS_MANTIDOS = 29;
const RECONTRATADOS_USIFIX = 8;
const FUNCIONARIOS_ANTES = 68;
const FOLHA_MEDIA_ANTES = FOLHA_ANTES / FUNCIONARIOS_ANTES;
const FOLHA_MEDIA_DEPOIS = FOLHA_DEPOIS / FUNCIONARIOS_MANTIDOS;
const REDUCAO_MEDIA = ((FOLHA_MEDIA_ANTES - FOLHA_MEDIA_DEPOIS) / FOLHA_MEDIA_ANTES) * 100;

export default function ReducaoFolhaPage() {
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
        to="/reducao-despesas"
        className="fixed left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-usifix/90 hover:bg-usifix text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowLeft size={24} />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Despesas Adm.
        </span>
      </Link>

      {/* Navegação - Próxima Página */}
      <Link
        to="/visao-futuro"
        className="fixed right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-green-500/90 hover:bg-green-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowRight size={24} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Meta 10% Lucro
        </span>
      </Link>

      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-maclinea/20 via-transparent to-maclinea/10" />
        <div className="relative container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Redução de Folha de Pagamento
                </h1>
                <p className="text-gray-400 text-lg">
                  Reestruturação 2025/2026 • Página 5
                </p>
              </div>
              <img src={withBase('logos/maclinea.png')} alt="Maclinea" className="h-12" />
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
              <div className="text-3xl font-bold text-red-400">{formatCurrency(FOLHA_ANTES)}</div>
              <p className="text-gray-500 text-sm mt-1">Folha mensal</p>
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
              <div className="text-3xl font-bold text-green-400">{formatCurrency(FOLHA_DEPOIS)}</div>
              <p className="text-gray-500 text-sm mt-1">Nova estrutura</p>
            </motion.div>

            {/* Economia */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 bg-gradient-to-br from-maclinea/20 to-transparent border-maclinea/30"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ECONOMIA</span>
                <div className="p-2 rounded-lg bg-maclinea/20 text-maclinea-light">
                  <Users size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-maclinea-light">{formatCurrency(ECONOMIA_FOLHA)}</div>
              <p className="text-gray-500 text-sm mt-1">-{formatPercentage(PERCENT_ECONOMIA, 0)} por mês</p>
            </motion.div>
          </div>

          {/* Visualização Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Indicador Visual Grande - Redução Percentual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-8 flex flex-col items-center justify-center"
            >
              <div className="relative w-48 h-48 mb-6">
                {/* Círculo de fundo */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="rgba(239, 68, 68, 0.2)"
                    strokeWidth="16"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="80"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${(PERCENT_ECONOMIA / 100) * 502} 502`}
                    initial={{ strokeDasharray: '0 502' }}
                    animate={{ strokeDasharray: `${(PERCENT_ECONOMIA / 100) * 502} 502` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-green-400">
                    -{formatPercentage(PERCENT_ECONOMIA, 0)}
                  </span>
                  <span className="text-gray-400 text-sm">Redução</span>
                </div>
              </div>
              <p className="text-gray-400 text-center">
                Economia de <span className="text-green-400 font-bold">{formatCurrency(ECONOMIA_FOLHA)}</span> por mês
              </p>
              <p className="text-gray-500 text-sm text-center mt-2">
                Economia anual: <span className="text-green-400 font-semibold">{formatCurrency(ECONOMIA_FOLHA * 12)}</span>
              </p>
            </motion.div>

            {/* Dados de Rescisões e Funcionários */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Users size={20} className="text-maclinea-light" />
                Reestruturação de Equipe
              </h3>

              {/* Cards de Rescisões, Mantidos e Recontratados */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <UserMinus size={18} className="text-red-400" />
                  </div>
                  <p className="text-2xl font-bold text-red-400">{RESCISOES}</p>
                  <p className="text-gray-400 text-xs">Rescisões</p>
                </div>

                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <UserCheck size={18} className="text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-400">{FUNCIONARIOS_MANTIDOS}</p>
                  <p className="text-gray-400 text-xs">Mantidos</p>
                </div>

                <div className="p-4 rounded-xl bg-usifix/10 border border-usifix/20 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Factory size={18} className="text-usifix-light" />
                  </div>
                  <p className="text-2xl font-bold text-usifix-light">{RECONTRATADOS_USIFIX}</p>
                  <p className="text-gray-400 text-xs">USIFIX</p>
                </div>
              </div>

              {/* Nota USIFIX */}
              <div className="p-3 rounded-lg bg-usifix/5 border border-usifix/20 mb-4">
                <p className="text-gray-400 text-xs">
                  <span className="text-usifix-light font-semibold">USIFIX:</span> 8 dos 39 demitidos foram recontratados visando capacidade produtiva.
                </p>
              </div>

              {/* Folha Média */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Folha Média por Funcionário</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-red-400/80 text-sm">Antes</p>
                      <p className="text-xl font-bold text-red-400">{formatCurrency(FOLHA_MEDIA_ANTES)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={20} className="text-gray-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-green-400/80 text-sm">Depois</p>
                      <p className="text-xl font-bold text-green-400">{formatCurrency(FOLHA_MEDIA_DEPOIS)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-center">
                    <span className="text-maclinea-light font-semibold">-{formatPercentage(REDUCAO_MEDIA, 0)} por funcionário</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Resumo */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <div className="glass-card p-6 bg-gradient-to-r from-green-500/10 to-maclinea/10 border-green-500/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-gray-400 text-sm mb-1">Rescisões</p>
                <p className="text-2xl font-bold text-red-400">{RESCISOES}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Mantidos</p>
                <p className="text-2xl font-bold text-green-400">{FUNCIONARIOS_MANTIDOS}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Economia Mensal</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(ECONOMIA_FOLHA)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Economia Anual</p>
                <p className="text-2xl font-bold text-maclinea-light">{formatCurrency(ECONOMIA_FOLHA * 12)}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">Redução de Folha de Pagamento • Página 5</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <img src={withBase('logos/maclinea.png')} alt="Maclinea" className="h-8 opacity-50" />
            <img src={withBase('logos/usifix.svg')} alt="Usifix" className="h-6 opacity-50" />
          </div>
        </footer>
      </main>
    </motion.div>
  );
}

