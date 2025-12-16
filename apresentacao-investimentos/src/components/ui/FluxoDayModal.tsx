import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { X, TrendingDown, TrendingUp, Calendar, Building2, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, List, BarChart2 } from 'lucide-react';
import type { Movimento } from '../../types/movimento';
import { formatCurrency, truncateText } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nProvider';
import { useDataTranslation } from '../../hooks/useDataTranslation';
import { OverlayCharts } from './OverlayCharts';

interface FluxoDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataStr: string | null;
  movimentos: Movimento[];
}

type ViewMode = 'list' | 'chart';

export function FluxoDayModal({ isOpen, onClose, dataStr, movimentos }: FluxoDayModalProps) {
  const { t } = useI18n();
  const { tData } = useDataTranslation();
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<'valor' | 'tipo' | 'descricao'>('valor');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  function normalizeText(value: string): string {
    return (value || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Filtra movimentos do dia
  const dayMovimentos = useMemo(() => {
    if (!dataStr) return [];
    return movimentos.filter((mov) => mov.dataStr === dataStr);
  }, [movimentos, dataStr]);

  // Totais do dia
  const totals = useMemo(() => {
    const entradas = dayMovimentos.reduce((s, m) => s + m.credito, 0);
    const saidas = dayMovimentos.reduce((s, m) => s + m.debito, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [dayMovimentos]);

  // Filtra e ordena
  const visibleMovimentos = useMemo(() => {
    const query = normalizeText(q);
    const base = [...dayMovimentos];

    const filtered = !query
      ? base
      : base.filter((mov) => {
          const desc = tData(mov.historico || mov.categoria || '');
          const forn = tData(mov.fornecedor || '');
          const hay = normalizeText(`${mov.banco} ${mov.documento} ${desc} ${forn} ${mov.tipo}`);
          return hay.includes(query);
        });

    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortKey === 'valor') {
        const valA = a.debito > 0 ? a.debito : a.credito;
        const valB = b.debito > 0 ? b.debito : b.credito;
        return (valA - valB) * dir;
      }
      if (sortKey === 'tipo') {
        const cmp = a.tipo.localeCompare(b.tipo);
        return cmp * dir;
      }
      const aDesc = normalizeText(tData(a.historico || a.categoria || ''));
      const bDesc = normalizeText(tData(b.historico || b.categoria || ''));
      return aDesc.localeCompare(bDesc) * dir;
    });

    return filtered;
  }, [dayMovimentos, q, sortKey, sortDir, tData]);

  return (
    <AnimatePresence>
      {isOpen && dataStr && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal - FULLSCREEN */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-2 md:inset-4 lg:inset-8
                       bg-card border border-white/10 rounded-2xl shadow-2xl z-50
                       flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-usifix" />
                  {t('modal.fluxo.title')} - {dataStr}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {dayMovimentos.length} {t('modal.fluxo.movimentos')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="inline-flex rounded-lg bg-background border border-white/10 p-0.5">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-usifix/20 text-usifix-light' : 'text-gray-400 hover:bg-white/5'
                    }`}
                    title={t('overlay.view.list')}
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'chart' ? 'bg-usifix/20 text-usifix-light' : 'text-gray-400 hover:bg-white/5'
                    }`}
                    title={t('overlay.view.chart')}
                  >
                    <BarChart2 size={16} />
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 md:px-6 border-b border-white/10 bg-background/30">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">{t('chart.entradas')}</p>
                <p className="text-lg font-bold text-green-400">{formatCurrency(totals.entradas)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">{t('chart.saidas')}</p>
                <p className="text-lg font-bold text-red-400">{formatCurrency(totals.saidas)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">{t('tooltip.saldo')}</p>
                <p className={`text-lg font-bold ${totals.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(totals.saldo)}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {viewMode === 'chart' ? (
                <OverlayCharts movimentos={dayMovimentos} valueField="debito" />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={t('table.search')}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-white/10
                                   text-white placeholder-gray-500 focus:outline-none focus:border-usifix/50 transition-colors"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{t('overlay.sortBy')}</span>
                      <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as 'valor' | 'tipo' | 'descricao')}
                        className="px-3 py-2 rounded-lg bg-background border border-white/10 text-white text-sm
                                   focus:outline-none focus:border-usifix/50"
                      >
                        <option value="valor">{t('overlay.sort.valor')}</option>
                        <option value="tipo">{t('table.col.tipo')}</option>
                        <option value="descricao">{t('overlay.sort.descricao')}</option>
                      </select>
                      <button
                        onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                        title={sortDir === 'desc' ? t('overlay.sort.desc') : t('overlay.sort.asc')}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        {sortDir === 'desc' ? (
                          <ArrowDownWideNarrow size={16} className="text-gray-300" />
                        ) : (
                          <ArrowUpNarrowWide size={16} className="text-gray-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    {t('overlay.results', { shown: visibleMovimentos.length, total: dayMovimentos.length })}
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {visibleMovimentos.map((mov, index) => {
                      const isEntrada = mov.credito > 0;
                      const valor = isEntrada ? mov.credito : mov.debito;
                      return (
                        <motion.div
                          key={mov.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 0.5) }}
                          className={`flex items-start gap-4 p-4 rounded-xl bg-background/50 
                                     border border-white/5 hover:border-white/10 transition-colors`}
                        >
                          <div className={`flex-shrink-0 p-2 rounded-lg ${isEntrada ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            {isEntrada ? (
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-white font-medium truncate">
                                  {truncateText(tData(mov.historico), 60)}
                                </p>
                                {mov.fornecedor && (
                                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                    <Building2 className="w-3 h-3" />
                                    <span className="truncate">
                                      {truncateText(tData(mov.fornecedor), 40)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className={`flex-shrink-0 font-bold ${isEntrada ? 'text-green-400' : 'text-red-400'}`}>
                                {isEntrada ? '+' : '-'}{formatCurrency(valor)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className={`px-2 py-0.5 rounded-full ${isEntrada ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {isEntrada ? t('table.tipo.entrada') : t('table.tipo.saida')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white/5">
                                {mov.banco}
                              </span>
                              {mov.documento && (
                                <span className="text-gray-600">
                                  #{mov.documento}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-white/10 bg-background/50">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('modal.fluxo.saldoDia')}</span>
                <span className={`text-2xl font-bold ${totals.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totals.saldo >= 0 ? '+' : ''}{formatCurrency(totals.saldo)}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


