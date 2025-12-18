import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Target,
  ArrowLeft,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import { ThemeToggle } from '../components/ui/ThemeToggle';

// Dados do cenário OBJETIVO (10% de lucro)
const OBJETIVO = {
  faturamento: 2900000,
  maquina: 1000000,
  impostoMaquina: 172000,
  peca: 1900000,
  impostoPeca: 446500,
  resultadoLiquido: 2281500,
  materiaPrima: 1450000,
  maoDeObra: 276505.38,
  despesasAdm: 147983.46,
  comissao: 87000,
  servicosTerceiros: 25000,
  lucroLiquido: 295011.16,
};

// Dados atuais (DEPOIS)
const ATUAL = {
  faturamento: 1600000,
  lucroLiquido: 44311.16,
};

// Meta calculada
const META_FATURAMENTO = 2834103.66;
const AUMENTO_NECESSARIO = ((META_FATURAMENTO - ATUAL.faturamento) / ATUAL.faturamento) * 100;

// Custos fixos
const CUSTOS_FIXOS = 449488.84;
const MARGEM_CONTRIBUICAO = 25.86;

interface DRERowProps {
  label: string;
  valor: number;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: boolean;
}

function DRERow({ label, valor, isHeader, isTotal, indent }: DRERowProps) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 ${isHeader ? 'bg-white/5' : ''} ${isTotal ? 'bg-green-500/10 border-t-2 border-green-500/30' : 'border-b border-white/5'}`}>
      <span className={`${indent ? 'pl-4' : ''} ${isTotal ? 'font-bold text-green-400' : 'text-gray-400'} ${isHeader ? 'font-semibold text-white' : ''}`}>
        {label}
      </span>
      <span className={`${isTotal ? 'font-bold text-green-400 text-xl' : ''} ${isHeader ? 'font-bold text-white' : 'text-gray-300'}`}>
        {formatCurrency(valor)}
      </span>
    </div>
  );
}

export default function MetaObjetivoPage() {
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
        to="/visao-futuro"
        className="fixed left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-maclinea/90 hover:bg-maclinea text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowLeft size={24} />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Reestruturação
        </span>
      </Link>

      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-transparent to-green-500/10" />
        <div className="relative container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Meta: 10% de Lucro Líquido
                </h1>
                <p className="text-gray-400 text-lg">
                  Objetivo 2026 • Página 7
                </p>
              </div>
              <div className="flex items-center gap-3">
                <img src={withBase('logos/maclinea.png')} alt="Maclinea" className="h-10" />
                <img src={withBase('logos/usifix.svg')} alt="Usifix" className="h-10" />
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* ============================================
            SEÇÃO PRINCIPAL - Meta e Fórmula
            ============================================ */}
        <section className="mb-8">
          {/* KPIs da Meta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-green-400 uppercase">META FATURAMENTO</span>
                <Target size={18} className="text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400">{formatCurrency(META_FATURAMENTO)}</div>
              <p className="text-gray-500 text-sm mt-1">por mês</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 bg-gradient-to-br from-amber-500/20 to-transparent border-amber-500/30"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-400 uppercase">AUMENTO NECESSÁRIO</span>
                <ArrowUpRight size={18} className="text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400">+{formatPercentage(AUMENTO_NECESSARIO, 0)}</div>
              <p className="text-gray-500 text-sm mt-1">sobre atual (R$ 1,6M)</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 bg-gradient-to-br from-usifix/20 to-transparent border-usifix/30"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-usifix-light uppercase">LUCRO ESPERADO</span>
                <TrendingUp size={18} className="text-usifix-light" />
              </div>
              <div className="text-3xl font-bold text-usifix-light">{formatCurrency(OBJETIVO.lucroLiquido)}</div>
              <p className="text-gray-500 text-sm mt-1">10% do faturamento</p>
            </motion.div>
          </div>

          {/* Cálculo da Meta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Custos Variáveis */}
            <div className="glass-card p-6">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Custos Variáveis (% do faturamento)
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400">Matéria Prima</span>
                  <span className="text-white font-semibold">50,00%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400">Impostos (médio)</span>
                  <span className="text-white font-semibold">21,14%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400">Comissão</span>
                  <span className="text-white font-semibold">3,00%</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-amber-500/10 px-3 rounded-lg">
                  <span className="text-amber-400 font-semibold">Total Custos Variáveis</span>
                  <span className="text-amber-400 font-bold">74,14%</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-usifix/10 border border-usifix/30">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Margem de Contribuição</span>
                  <span className="text-2xl font-bold text-usifix-light">{formatPercentage(MARGEM_CONTRIBUICAO, 2)}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">100% - 74,14% = 25,86%</p>
              </div>
            </div>

            {/* Custos Fixos + Fórmula */}
            <div className="glass-card p-6">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Custos Fixos Mensais
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400">Mão de Obra</span>
                  <span className="text-white">{formatCurrency(276505.38)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400">Despesas Adm.</span>
                  <span className="text-white">{formatCurrency(147983.46)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-400">Serviços Terceiros</span>
                  <span className="text-white">{formatCurrency(25000)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-white/5 px-3 rounded-lg">
                  <span className="text-white font-semibold">Total Custos Fixos</span>
                  <span className="text-white font-bold">{formatCurrency(CUSTOS_FIXOS)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <h5 className="text-green-400 font-semibold text-sm mb-2">Fórmula</h5>
                <p className="text-gray-300 text-sm font-mono">
                  Meta = Custos Fixos ÷ (Margem - Lucro)
                </p>
                <p className="text-gray-500 text-xs mt-2 font-mono">
                  = {formatCurrency(CUSTOS_FIXOS)} ÷ (0,2586 - 0,10)
                </p>
                <p className="text-green-400 font-bold mt-2">
                  = {formatCurrency(META_FATURAMENTO)}
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ============================================
            DRE OBJETIVO
            ============================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target size={20} className="text-green-400" />
            DRE Projetado - Cenário Objetivo
          </h3>

          <div className="glass-card overflow-hidden border-green-500/20">
            <DRERow label="FATURAMENTO" valor={OBJETIVO.faturamento} isHeader />
            <DRERow label="Máquinas" valor={OBJETIVO.maquina} indent />
            <DRERow label="(-) Imposto Máquinas" valor={OBJETIVO.impostoMaquina} indent />
            <DRERow label="Peças" valor={OBJETIVO.peca} indent />
            <DRERow label="(-) Imposto Peças" valor={OBJETIVO.impostoPeca} indent />
            <DRERow label="= RESULTADO LÍQUIDO" valor={OBJETIVO.resultadoLiquido} isHeader />
            <DRERow label="(-) Matéria Prima" valor={OBJETIVO.materiaPrima} indent />
            <DRERow label="(-) Mão de Obra" valor={OBJETIVO.maoDeObra} indent />
            <DRERow label="(-) Despesas Adm." valor={OBJETIVO.despesasAdm} indent />
            <DRERow label="(-) Comissão" valor={OBJETIVO.comissao} indent />
            <DRERow label="(-) Serviços Terceiros" valor={OBJETIVO.servicosTerceiros} indent />
            <DRERow label="= LUCRO LÍQUIDO (10%)" valor={OBJETIVO.lucroLiquido} isTotal />
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">Meta: 10% de Lucro Líquido • Página 7</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <img src={withBase('logos/maclinea.png')} alt="Maclinea" className="h-8 opacity-50" />
            <img src={withBase('logos/usifix.svg')} alt="Usifix" className="h-6 opacity-50" />
          </div>
        </footer>
      </main>
    </motion.div>
  );
}

