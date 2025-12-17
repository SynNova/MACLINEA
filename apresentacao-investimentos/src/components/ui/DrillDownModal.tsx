import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { X, TrendingDown, Calendar, Building2, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, List, BarChart2 } from 'lucide-react';
import type { Movimento, CategoriaAgregada } from '../../types/movimento';
import { formatCurrency, truncateText } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nProvider';
import { useDataTranslation } from '../../hooks/useDataTranslation';
import { OverlayCharts } from './OverlayCharts';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria: CategoriaAgregada | null;
  valueField?: 'debito' | 'credito';
}

type ViewMode = 'list' | 'chart';

export function DrillDownModal({ isOpen, onClose, categoria, valueField = 'debito' }: DrillDownModalProps) {
  const { t } = useI18n();
  const { tData } = useDataTranslation();
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<'valor' | 'data' | 'descricao'>('valor');
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

  const visibleLancamentos = useMemo(() => {
    const query = normalizeText(q);
    const base = [...(categoria?.lancamentos ?? [])];

    const filtered = !query
      ? base
      : base.filter((mov) => {
          const desc = tData(mov.historico || mov.categoria || '');
          const forn = tData(mov.fornecedor || '');
          const hay = normalizeText(`${mov.dataStr} ${mov.banco} ${mov.documento} ${desc} ${forn}`);
          return hay.includes(query);
        });

    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const aValue = a[valueField] || 0;
      const bValue = b[valueField] || 0;
      if (sortKey === 'valor') return (aValue - bValue) * dir;
      if (sortKey === 'data') return (a.data.getTime() - b.data.getTime()) * dir;
      const aDesc = normalizeText(tData(a.historico || a.categoria || ''));
      const bDesc = normalizeText(tData(b.historico || b.categoria || ''));
      const cmp = aDesc.localeCompare(bDesc);
      if (cmp !== 0) return cmp * dir;
      return (aValue - bValue) * dir;
    });

    return filtered;
  }, [categoria, q, sortKey, sortDir, tData]);

  return (
    <AnimatePresence>
      {isOpen && categoria && (
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
                <h2 className="text-lg md:text-xl font-bold text-white">
                  {categoria.categoria}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {t('modal.lancamentosCount', { n: categoria.count })} • {formatCurrency(categoria.total)}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {viewMode === 'chart' ? (
                <OverlayCharts movimentos={categoria.lancamentos} valueField={valueField} />
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
                        onChange={(e) => setSortKey(e.target.value as 'valor' | 'data' | 'descricao')}
                        className="px-3 py-2 rounded-lg bg-background border border-white/10 text-white text-sm
                                   focus:outline-none focus:border-usifix/50"
                      >
                        <option value="valor">{t('overlay.sort.valor')}</option>
                        <option value="data">{t('overlay.sort.data')}</option>
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
                    {t('overlay.results', { shown: visibleLancamentos.length, total: categoria.lancamentos.length })}
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {visibleLancamentos.map((mov, index) => (
                      <motion.div
                        key={mov.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.5) }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-background/50 
                                   border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex-shrink-0 p-2 rounded-lg bg-maclinea/20">
                          <TrendingDown className="w-4 h-4 text-maclinea-light" />
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
                            <span className={`flex-shrink-0 font-bold ${valueField === 'credito' ? 'text-green-400' : 'text-maclinea-light'}`}>
                              {formatCurrency(mov[valueField] || 0)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {mov.dataStr}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white/5">
                              {mov.banco}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-white/10 bg-background/50">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('modal.totalCategoria')}</span>
                <span className="text-2xl font-bold text-white">
                  {formatCurrency(categoria.total)}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
