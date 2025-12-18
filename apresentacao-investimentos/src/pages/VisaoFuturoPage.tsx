import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Scale,
  Zap,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { withBase } from '../utils/assetUrl';
import { ThemeToggle } from '../components/ui/ThemeToggle';

// Dados completos do DRE - PONTO DE EQUILÍBRIO ANTES vs DEPOIS
const DRE = {
  antes: {
    faturamento: 4730000,
    maquina: 3180000,
    impostoMaquina: 546960,
    peca: 1550000,
    impostoPeca: 364250,
    resultadoLiquido: 3818790,
    materiaPrima: 2365000,
    maoDeObra: 908886,
    despesasAdm: 289780,
    comissao: 141900,
    servicosTerceiros: 77000,
    lucroLiquido: 36224,
  },
  depois: {
    faturamento: 1600000,
    maquina: 600000,
    impostoMaquina: 103200,
    peca: 1000000,
    impostoPeca: 235000,
    resultadoLiquido: 1261800,
    materiaPrima: 720000,
    maoDeObra: 276505.38,
    despesasAdm: 147983.46,
    comissao: 48000,
    servicosTerceiros: 25000,
    lucroLiquido: 44311.16,
  },
};

// Cálculos de eficiência
const reducaoFaturamento = ((DRE.antes.faturamento - DRE.depois.faturamento) / DRE.antes.faturamento) * 100;
const aumentoLucro = ((DRE.depois.lucroLiquido - DRE.antes.lucroLiquido) / DRE.antes.lucroLiquido) * 100;
const margemAntes = (DRE.antes.lucroLiquido / DRE.antes.faturamento) * 100;
const margemDepois = (DRE.depois.lucroLiquido / DRE.depois.faturamento) * 100;

interface DRERowProps {
  label: string;
  antes: number;
  depois: number;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  showDiff?: boolean;
}

function DRERow({ label, antes, depois, isHeader, isTotal, indent, showDiff = true }: DRERowProps) {
  const diff = antes - depois;
  const diffPercent = antes !== 0 ? (diff / Math.abs(antes)) * 100 : 0;
  const isPositiveDiff = diff > 0;

  return (
    <div className={`flex items-center justify-between py-3 px-4 ${isHeader ? 'bg-white/5' : ''} ${isTotal ? 'bg-green-500/10 border-t-2 border-green-500/30' : 'border-b border-white/5'}`}>
      <span className={`${indent ? 'pl-4' : ''} ${isTotal ? 'font-bold text-green-400' : 'text-gray-400'} ${isHeader ? 'font-semibold text-white' : ''}`}>
        {label}
      </span>
      <div className="flex items-center gap-6">
        <span className={`w-32 text-right ${isTotal || isHeader ? 'font-bold' : ''} ${isTotal ? 'text-amber-400' : 'text-gray-300'}`}>
          {formatCurrency(antes)}
        </span>
        <span className={`w-32 text-right ${isTotal || isHeader ? 'font-bold' : ''} ${isTotal ? 'text-green-400' : 'text-green-400'}`}>
          {formatCurrency(depois)}
        </span>
        {showDiff && (
          <span className={`w-28 text-right text-xs ${isPositiveDiff ? 'text-green-400' : 'text-amber-400'}`}>
            {diff !== 0 ? (isPositiveDiff ? '-' : '+') + formatPercentage(Math.abs(diffPercent), 0) : '—'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function VisaoFuturoPage() {
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
        to="/reducao-folha"
        className="fixed left-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-maclinea/90 hover:bg-maclinea text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowLeft size={24} />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Folha
        </span>
      </Link>

      {/* Navegação - Próxima Página */}
      <Link
        to="/meta-objetivo"
        className="fixed right-6 top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-green-500/90 hover:bg-green-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
      >
        <ArrowRight size={24} />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-card border border-white/10 text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Meta 10% Lucro
        </span>
      </Link>

      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-maclinea/20 via-transparent to-green-500/10" />
        <div className="relative container mx-auto px-6 py-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Ponto de Equilíbrio: Antes vs Depois
                </h1>
                <p className="text-gray-400 text-lg">
                  Eficiência Operacional Conquistada • Página 6
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
            DESTAQUE PRINCIPAL - Mensagem Chave
            ============================================ */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <div className="glass-card p-8 bg-gradient-to-r from-green-500/10 via-usifix/10 to-maclinea/10 border-green-500/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <Scale size={28} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">O Ponto de Equilíbrio Mudou</h2>
                <p className="text-gray-400">Antes precisávamos faturar muito mais para ter o mesmo resultado</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400/80 text-sm mb-1">Faturamento Necessário ANTES</p>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(DRE.antes.faturamento)}</p>
                <p className="text-gray-500 text-xs mt-1">para lucrar {formatCurrency(DRE.antes.lucroLiquido)}</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-green-400/80 text-sm mb-1">Faturamento Necessário DEPOIS</p>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(DRE.depois.faturamento)}</p>
                <p className="text-gray-500 text-xs mt-1">para lucrar {formatCurrency(DRE.depois.lucroLiquido)}</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-usifix/10 border border-usifix/20">
                <p className="text-usifix-light/80 text-sm mb-1">Redução de Faturamento</p>
                <p className="text-3xl font-bold text-usifix-light">-{formatPercentage(reducaoFaturamento, 0)}</p>
                <p className="text-gray-500 text-xs mt-1">com lucro {formatPercentage(aumentoLucro, 0)} maior</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ============================================
            SEÇÃO - KPIs de Eficiência
            ============================================ */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Faturamento ANTES */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-400 uppercase">FATURAMENTO ANTES</span>
                <TrendingDown size={16} className="text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400">{formatCurrency(DRE.antes.faturamento)}</div>
              <p className="text-gray-500 text-xs mt-1">68 funcionários</p>
            </motion.div>

            {/* Faturamento DEPOIS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-5 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-green-400 uppercase">FATURAMENTO DEPOIS</span>
                <TrendingUp size={16} className="text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400">{formatCurrency(DRE.depois.faturamento)}</div>
              <p className="text-gray-500 text-xs mt-1">29 funcionários</p>
            </motion.div>

            {/* Margem ANTES */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase">MARGEM ANTES</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{formatPercentage(margemAntes, 2)}</div>
              <p className="text-gray-500 text-xs mt-1">{formatCurrency(DRE.antes.lucroLiquido)} de lucro</p>
            </motion.div>

            {/* Margem DEPOIS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-5 bg-gradient-to-br from-usifix/10 to-transparent border-usifix/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-usifix-light uppercase">MARGEM DEPOIS</span>
                <Zap size={16} className="text-usifix-light" />
              </div>
              <div className="text-2xl font-bold text-usifix-light">{formatPercentage(margemDepois, 2)}</div>
              <p className="text-gray-500 text-xs mt-1">{formatCurrency(DRE.depois.lucroLiquido)} de lucro</p>
            </motion.div>
          </div>
        </section>

        {/* ============================================
            DRE COMPLETO - ANTES vs DEPOIS
            ============================================ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="glass-card overflow-hidden">
            {/* Cabeçalho da tabela */}
            <div className="flex items-center justify-between py-4 px-4 bg-white/5 border-b border-white/10">
              <span className="font-bold text-white">DEMONSTRATIVO DE RESULTADO</span>
              <div className="flex items-center gap-6">
                <span className="w-32 text-right text-amber-400 font-semibold text-sm">P.E. ANTERIOR</span>
                <span className="w-32 text-right text-green-400 font-semibold text-sm">P.E. ATUAL</span>
                <span className="w-28 text-right text-gray-500 text-xs">VARIAÇÃO</span>
              </div>
            </div>

            {/* Receitas */}
            <DRERow label="FATURAMENTO" antes={DRE.antes.faturamento} depois={DRE.depois.faturamento} isHeader />
            <DRERow label="Máquinas" antes={DRE.antes.maquina} depois={DRE.depois.maquina} indent />
            <DRERow label="(-) Imposto Máquinas" antes={DRE.antes.impostoMaquina} depois={DRE.depois.impostoMaquina} indent />
            <DRERow label="Peças" antes={DRE.antes.peca} depois={DRE.depois.peca} indent />
            <DRERow label="(-) Imposto Peças" antes={DRE.antes.impostoPeca} depois={DRE.depois.impostoPeca} indent />

            {/* Resultado Líquido */}
            <DRERow label="= RESULTADO LÍQUIDO" antes={DRE.antes.resultadoLiquido} depois={DRE.depois.resultadoLiquido} isHeader />

            {/* Custos */}
            <DRERow label="(-) Matéria Prima" antes={DRE.antes.materiaPrima} depois={DRE.depois.materiaPrima} indent />
            <DRERow label="(-) Mão de Obra" antes={DRE.antes.maoDeObra} depois={DRE.depois.maoDeObra} indent />
            <DRERow label="(-) Despesas Adm." antes={DRE.antes.despesasAdm} depois={DRE.depois.despesasAdm} indent />
            <DRERow label="(-) Comissão" antes={DRE.antes.comissao} depois={DRE.depois.comissao} indent />
            <DRERow label="(-) Serviços Terceiros" antes={DRE.antes.servicosTerceiros} depois={DRE.depois.servicosTerceiros} indent />

            {/* Lucro Líquido */}
            <DRERow label="= LUCRO LÍQUIDO" antes={DRE.antes.lucroLiquido} depois={DRE.depois.lucroLiquido} isTotal />
          </div>
        </motion.section>

        {/* Resumo - Custos que Reduziram o Ponto de Equilíbrio */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="glass-card p-6 bg-gradient-to-r from-green-500/10 to-maclinea/10 border-green-500/20">
            <h3 className="text-lg font-bold text-white mb-4">Como Reduzimos o Ponto de Equilíbrio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-gray-400 text-xs mb-1">Mão de Obra</p>
                <p className="text-green-400 font-bold">-{formatPercentage(((DRE.antes.maoDeObra - DRE.depois.maoDeObra) / DRE.antes.maoDeObra) * 100, 0)}</p>
                <p className="text-gray-500 text-xs">{formatCurrency(DRE.antes.maoDeObra - DRE.depois.maoDeObra)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Despesas Adm.</p>
                <p className="text-green-400 font-bold">-{formatPercentage(((DRE.antes.despesasAdm - DRE.depois.despesasAdm) / DRE.antes.despesasAdm) * 100, 0)}</p>
                <p className="text-gray-500 text-xs">{formatCurrency(DRE.antes.despesasAdm - DRE.depois.despesasAdm)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Serv. Terceiros</p>
                <p className="text-green-400 font-bold">-{formatPercentage(((DRE.antes.servicosTerceiros - DRE.depois.servicosTerceiros) / DRE.antes.servicosTerceiros) * 100, 0)}</p>
                <p className="text-gray-500 text-xs">{formatCurrency(DRE.antes.servicosTerceiros - DRE.depois.servicosTerceiros)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Matéria Prima</p>
                <p className="text-green-400 font-bold">-{formatPercentage(((DRE.antes.materiaPrima - DRE.depois.materiaPrima) / DRE.antes.materiaPrima) * 100, 0)}</p>
                <p className="text-gray-500 text-xs">{formatCurrency(DRE.antes.materiaPrima - DRE.depois.materiaPrima)}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Mensagem Final */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <div className="glass-card p-6 border-usifix/30 bg-gradient-to-r from-usifix/5 to-green-500/5">
            <p className="text-center text-lg text-gray-300">
              <span className="text-amber-400 font-bold">Antes:</span> Precisávamos faturar <span className="text-red-400 font-bold">{formatCurrency(DRE.antes.faturamento)}</span> para ter lucro de <span className="text-amber-400">{formatCurrency(DRE.antes.lucroLiquido)}</span>
            </p>
            <p className="text-center text-lg text-gray-300 mt-2">
              <span className="text-green-400 font-bold">Agora:</span> Com apenas <span className="text-green-400 font-bold">{formatCurrency(DRE.depois.faturamento)}</span> já temos lucro de <span className="text-usifix-light font-bold">{formatCurrency(DRE.depois.lucroLiquido)}</span>
            </p>
            <p className="text-center text-2xl font-bold text-white mt-4">
              Eficiência Operacional <span className="text-green-400">3x maior!</span>
            </p>
          </div>
        </motion.section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">Ponto de Equilíbrio: Antes vs Depois • Página 6</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <img src={withBase('logos/maclinea.png')} alt="Maclinea" className="h-8 opacity-50" />
            <img src={withBase('logos/usifix.svg')} alt="Usifix" className="h-6 opacity-50" />
          </div>
        </footer>
      </main>
    </motion.div>
  );
}
