import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { X, Info, ShoppingCart, Search, ArrowDownWideNarrow, ArrowUpNarrowWide, List, BarChart2 } from 'lucide-react';
import type { Movimento } from '../../types/movimento';
import { formatCurrency } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nProvider';
import { useBancoScope } from '../../filters/BancoScopeProvider';
import { useDataTranslation } from '../../hooks/useDataTranslation';
import { OverlayCharts } from './OverlayCharts';

interface VendasInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalVendas: number;
  movimentosVendas: Movimento[];
}

type ViewMode = 'list' | 'chart';

export function VendasInfoModal({ isOpen, onClose, totalVendas, movimentosVendas }: VendasInfoModalProps) {
  const { t } = useI18n();
  const { scope } = useBancoScope();
  const { tData } = useDataTranslation();
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<'valor' | 'data' | 'descricao'>('valor');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const scopeLabel = scope === 'all' ? t('filters.banks.allLong') : t('filters.banks.coreLong');

  const vendas = [...movimentosVendas].sort((a, b) => a.data.getTime() - b.data.getTime());
  const produtos = vendas.filter((m) => m.categoriaId === 3);
  const servicos = vendas.filter((m) => m.categoriaId === 4);
  const totalProdutos = produtos.reduce((s, m) => s + m.credito, 0);
  const totalServicos = servicos.reduce((s, m) => s + m.credito, 0);

  function normalizeText(value: string): string {
    return (value || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const visibleVendas = useMemo(() => {
    const query = normalizeText(q);
    const base = [...vendas];

    const filtered = !query
      ? base
      : base.filter((mov) => {
          const desc = tData(mov.historico || mov.categoria || '');
          const cat = tData(mov.categoria || '');
          const hay = normalizeText(`${mov.dataStr} ${mov.banco} ${mov.documento} ${cat} ${desc}`);
          return hay.includes(query);
        });

    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortKey === 'valor') return (a.credito - b.credito) * dir;
      if (sortKey === 'data') return (a.data.getTime() - b.data.getTime()) * dir;
      const aDesc = normalizeText(tData(a.historico || a.categoria || ''));
      const bDesc = normalizeText(tData(b.historico || b.categoria || ''));
      const cmp = aDesc.localeCompare(bDesc);
      if (cmp !== 0) return cmp * dir;
      return (a.credito - b.credito) * dir;
    });

    return filtered;
  }, [vendas, q, sortKey, sortDir, tData]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal - FULLSCREEN */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-2 md:inset-4 lg:inset-8
                       bg-card border border-white/10 rounded-2xl shadow-2xl z-50
                       flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 md:p-6 border-b border-white/10">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-green-500/15 border border-green-500/20">
                  <ShoppingCart className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">{t('kpi.vendas')}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {t('kpi.vendas.subtitle')} •{' '}
                    <span className="text-white font-semibold">{formatCurrency(totalVendas)}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {t('vendas.modal.bankScope', { scope: scopeLabel })}
                  </p>
                </div>
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
                  aria-label={t('actions.close')}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {viewMode === 'chart' ? (
                <OverlayCharts movimentos={vendas} valueField="credito" />
              ) : (
                <>
                  <div className="glass-card p-5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-gray-400" />
                      <h3 className="text-sm font-semibold text-white">{t('vendas.modal.aboutTitle')}</h3>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{t('vendas.modal.about')}</p>
                  </div>

                  <div className="glass-card p-5 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">{t('vendas.modal.criteriaTitle')}</h3>
                    <ul className="space-y-2">
                      {[t('vendas.modal.criteria1'), t('vendas.modal.criteria2'), t('vendas.modal.criteria3')].map((c) => (
                        <li key={c} className="text-sm text-gray-300 flex gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500/60 flex-shrink-0" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ResumoCard
                      title={t('vendas.modal.produtos')}
                      value={totalProdutos}
                      count={produtos.length}
                      tone="border-green-500/25 bg-green-500/10"
                      text="text-green-400"
                    />
                    <ResumoCard
                      title={t('vendas.modal.servicos')}
                      value={totalServicos}
                      count={servicos.length}
                      tone="border-usifix/25 bg-usifix/10"
                      text="text-usifix-light"
                    />
                  </div>

                  <div className="glass-card p-5 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">{t('vendas.modal.recordsTitle')}</h3>

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
                      {t('overlay.results', { shown: visibleVendas.length, total: vendas.length })}
                    </p>

                    {visibleVendas.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('vendas.modal.noRecords')}</p>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {visibleVendas.map((mov) => (
                          <div
                            key={mov.id}
                            className="p-4 rounded-xl bg-background/50 border border-white/5 hover:border-white/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-white font-medium leading-snug">
                                  {tData(mov.historico || mov.categoria)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {mov.dataStr} • {mov.banco} • {tData(mov.categoria)}
                                  {mov.documento ? ` • ${mov.documento}` : ''}
                                </p>
                              </div>
                              <span className="text-green-400 font-bold whitespace-nowrap">
                                {formatCurrency(mov.credito)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-white/10 bg-background/50 flex items-center justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition-colors"
              >
                {t('actions.close')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ResumoCard({
  title,
  value,
  count,
  tone,
  text,
}: {
  title: string;
  value: number;
  count: number;
  tone: string;
  text: string;
}) {
  const { t } = useI18n();
  return (
    <div className={`p-5 rounded-2xl border ${tone}`}>
      <p className="text-white font-semibold">{title}</p>
      <p className={`text-2xl font-bold mt-2 ${text}`}>{formatCurrency(value)}</p>
      <p className="text-xs text-gray-400 mt-1">{t('modal.lancamentosCount', { n: count })}</p>
    </div>
  );
}
