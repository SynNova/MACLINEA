import { Wallet, TrendingUp, Building2, ShoppingCart, Loader2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react';
import { useMovimentos } from './hooks/useMovimentos';
import { Header } from './components/layout/Header';
import { Section, SectionDivider } from './components/layout/Section';
import { KPICard } from './components/ui/KPICard';
import { DestinoBarChart } from './components/charts/DestinoBarChart';
import { FluxoAreaChart } from './components/charts/FluxoAreaChart';
import { MovimentosTable } from './components/tables/MovimentosTable';
import { FluxoDayModal } from './components/ui/FluxoDayModal';
import { isAporteBrivio, isAporteIanco, isDespesaValida, isVenda, isTransferenciaInterna, isImplantacaoSaldo, parseMovimentosCSV } from './utils/csvParser';
import { useI18n } from './i18n/I18nProvider';
import { translateGrupo } from './i18n/mappings';
import { useBancoScope } from './filters/BancoScopeProvider';
import { AporteInfoModal, type AporteModalType } from './components/ui/AporteInfoModal';
import { VendasInfoModal } from './components/ui/VendasInfoModal';
import { useCurrency } from './currency/CurrencyProvider';
import { extractBancoNome } from './utils/bancoFilter';
import { withBase } from './utils/assetUrl';

function App() {
  const { t, locale, setLocale } = useI18n();
  const { scope: bancoScope, setScope: setBancoScope, isCustomSelection } = useBancoScope();
  const { currency, setCurrency, brlPerEur, setBrlPerEur } = useCurrency();
  const { dados, loading, error, refetch } = useMovimentos(withBase('dados/movimentos.csv'));
  const [aporteModal, setAporteModal] = useState<AporteModalType | null>(null);
  const [vendasModalOpen, setVendasModalOpen] = useState(false);
  const [fluxoDaySelected, setFluxoDaySelected] = useState<string | null>(null);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [allBancos, setAllBancos] = useState<string[]>([]);
  const bankDropdownRef = useRef<HTMLDivElement>(null);

  // Bancos selecionados no modo customizado
  const selectedBanks = Array.isArray(bancoScope) ? bancoScope : [];

  // Toggle de banco individual
  const toggleBank = (banco: string) => {
    if (Array.isArray(bancoScope)) {
      if (bancoScope.includes(banco)) {
        const newSelection = bancoScope.filter(b => b !== banco);
        setBancoScope(newSelection.length > 0 ? newSelection : 'all');
      } else {
        setBancoScope([...bancoScope, banco]);
      }
    } else {
      // Iniciando seleção customizada
      setBancoScope([banco]);
    }
  };

  // Carrega lista de bancos únicos (independente do filtro atual)
  useEffect(() => {
    async function loadBancos() {
      try {
        const movs = await parseMovimentosCSV(withBase('dados/movimentos.csv'));
        const bancosSet = new Set<string>();
        movs.forEach(m => {
          const nome = extractBancoNome(m.banco);
          if (nome) bancosSet.add(nome);
        });
        setAllBancos(Array.from(bancosSet).sort());
      } catch {
        // ignore
      }
    }
    loadBancos();
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
        setBankDropdownOpen(false);
      }
    }
    if (bankDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [bankDropdownOpen]);

  // IMPORTANTE: hooks (incl. useMemo) não podem ser condicionais.

  const categoriasDisplay = useMemo(() => {
    const categorias = dados?.categorias ?? [];
    return categorias.map((c) => ({
      ...c,
      categoria: translateGrupo(c.categoria, locale),
    }));
  }, [dados, locale]);

  const despesas = useMemo(() => {
    const movimentos = dados?.movimentos ?? [];
    return movimentos.filter(isDespesaValida);
  }, [dados]);

  // Todos os movimentos para a tabela detalhada (exclui apenas transferências e implantação de saldo)
  const todosMovimentos = useMemo(() => {
    const movimentos = dados?.movimentos ?? [];
    return movimentos.filter((m) => !isTransferenciaInterna(m) && !isImplantacaoSaldo(m));
  }, [dados]);

  const movimentosBrivio = useMemo(() => {
    const movimentos = dados?.movimentos ?? [];
    return movimentos.filter(isAporteBrivio);
  }, [dados]);

  const movimentosIanco = useMemo(() => {
    const movimentos = dados?.movimentos ?? [];
    return movimentos.filter(isAporteIanco);
  }, [dados]);

  const movimentosVendas = useMemo(() => {
    const movimentos = dados?.movimentos ?? [];
    return movimentos.filter(isVenda);
  }, [dados]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-usifix animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t('loading.data')}</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t('error.load.title')}</h2>
          <p className="text-gray-400 mb-6">{error.message}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg
                       bg-usifix hover:bg-usifix-dark transition-colors
                       text-white font-medium"
          >
            <RefreshCw size={18} />
            {t('actions.retry')}
          </button>
        </motion.div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-400">{t('empty.noData')}</p>
      </div>
    );
  }

  const { resumo, fluxoDiario } = dados;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header 
        periodoInicio={resumo.periodoInicio}
        periodoFim={resumo.periodoFim}
      />

      <main className="container mx-auto px-4 md:px-6 pb-16">
        {/* Tabs */}
        <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-300">
              {t('tabs.dashboard')}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {/* Banks scope */}
              <div className="inline-flex items-center rounded-xl bg-card/60 border border-white/10 p-1">
                <ScopeButton
                  active={bancoScope === 'core'}
                  onClick={() => setBancoScope('core')}
                  label={t('filters.banks.coreShort')}
                  title={t('filters.banks.coreLong')}
                />
                <ScopeButton
                  active={bancoScope === 'all'}
                  onClick={() => setBancoScope('all')}
                  label={t('filters.banks.allShort')}
                  title={t('filters.banks.allLong')}
                />
                
                {/* Dropdown para seleção customizada de bancos */}
                <div className="relative" ref={bankDropdownRef}>
                  <button
                    onClick={() => setBankDropdownOpen(!bankDropdownOpen)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors
                      ${isCustomSelection
                        ? 'bg-usifix/20 text-usifix-light border border-usifix/30'
                        : 'text-gray-300 hover:bg-white/5'
                      }
                    `}
                    title={t('filters.banks.customLong')}
                  >
                    {isCustomSelection 
                      ? `${selectedBanks.length} ${selectedBanks.length === 1 ? t('filters.banks.singleShort') : t('filters.banks.multipleShort')}`
                      : t('filters.banks.customShort')
                    }
                    <ChevronDown size={14} className={`transition-transform ${bankDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {bankDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 w-56 max-h-72 overflow-y-auto
                                   rounded-xl bg-card border border-white/10 shadow-2xl p-2"
                      >
                        <p className="text-xs text-gray-500 px-2 pb-2 border-b border-white/10 mb-2">
                          {t('filters.banks.selectMultiple')}
                        </p>
                        {allBancos.map((banco) => {
                          const isSelected = selectedBanks.includes(banco);
                          return (
                            <label
                              key={banco}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors
                                ${isSelected ? 'bg-usifix/10 text-usifix-light' : 'text-gray-300 hover:bg-white/5'}
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBank(banco)}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-usifix 
                                           "
                              />
                              {banco}
                            </label>
                          );
                        })}
                        
                        {selectedBanks.length > 0 && (
                          <div className="pt-2 mt-2 border-t border-white/10">
                            <button
                              onClick={() => {
                                setBancoScope('all');
                                setBankDropdownOpen(false);
                              }}
                              className="w-full text-center text-xs text-gray-400 hover:text-white py-1 transition-colors"
                            >
                              {t('filters.banks.clearSelection')}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Language */}
              <div className="inline-flex rounded-xl bg-card/60 border border-white/10 p-1">
                <LangButton active={locale === 'pt-BR'} onClick={() => setLocale('pt-BR')} label="PT" />
                <LangButton active={locale === 'it-IT'} onClick={() => setLocale('it-IT')} label="IT" />
              </div>

              {/* Currency */}
              <div className="inline-flex rounded-xl bg-card/60 border border-white/10 p-1">
                <ScopeButton
                  active={currency === 'BRL'}
                  onClick={() => setCurrency('BRL')}
                  label="BRL"
                  title={t('filters.currency.brlLong')}
                />
                <ScopeButton
                  active={currency === 'EUR'}
                  onClick={() => setCurrency('EUR')}
                  label="EUR"
                  title={t('filters.currency.eurLong')}
                />
              </div>

              {currency === 'EUR' && (
                <div
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                             text-gray-300 text-sm"
                  title={t('filters.currency.rate')}
                >
                  <span className="text-xs text-gray-500">{t('filters.currency.rate')}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={brlPerEur}
                    onChange={(e) => {
                      const n = Number(String(e.target.value).replace(',', '.'));
                      if (Number.isFinite(n) && n > 0) setBrlPerEur(n);
                    }}
                    className="w-20 bg-transparent text-white text-sm text-right
                               border-b border-white/15 focus:outline-none focus:border-usifix/50"
                  />
                  <span className="text-xs text-gray-500">BRL</span>
                </div>
              )}

              <button
                onClick={refetch}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10
                           text-gray-300 hover:bg-white/10 transition-colors text-sm"
                title={t('actions.reload')}
              >
                <RefreshCw size={16} />
                {t('actions.update')}
              </button>
            </div>
          </div>
        </div>
        
        {/* KPI Cards */}
        <Section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <KPICard
              title={t('kpi.totalAportes')}
              value={resumo.totalAportes}
              subtitle={t('kpi.totalAportes.subtitle')}
              icon={Wallet}
              color="default"
              delay={0}
              onClick={() => {
                setVendasModalOpen(false);
                setAporteModal('total');
              }}
            />
            <KPICard
              title={t('kpi.brivio')}
              value={resumo.aporteBrivio}
              percentage={(resumo.aporteBrivio / resumo.totalAportes) * 100}
              subtitle={t('kpi.brivio.subtitle')}
              icon={Building2}
              color="maclinea"
              delay={1}
              onClick={() => {
                setVendasModalOpen(false);
                setAporteModal('brivio');
              }}
            />
            <KPICard
              title={t('kpi.ianco')}
              value={resumo.aporteIanco}
              percentage={(resumo.aporteIanco / resumo.totalAportes) * 100}
              subtitle={t('kpi.ianco.subtitle')}
              icon={TrendingUp}
              color="usifix"
              delay={2}
              onClick={() => {
                setVendasModalOpen(false);
                setAporteModal('ianco');
              }}
            />
            <KPICard
              title={t('kpi.vendas')}
              value={resumo.totalVendas}
              subtitle={t('kpi.vendas.subtitle')}
              icon={ShoppingCart}
              color="success"
              delay={3}
              onClick={() => {
                setAporteModal(null);
                setVendasModalOpen(true);
              }}
            />
          </div>
        </Section>

        <SectionDivider />

        {/* Destino dos Recursos */}
        <Section
          title={t('section.destino.title')}
          subtitle={t('section.destino.subtitle')}
        >
          <DestinoBarChart data={categoriasDisplay} maxItems={25} />
        </Section>

        <SectionDivider />

        {/* Fluxo Financeiro */}
        <Section
          title={t('section.fluxo.title')}
          subtitle={t('section.fluxo.subtitle')}
        >
          <FluxoAreaChart data={fluxoDiario} onDayClick={setFluxoDaySelected} />
        </Section>

        <SectionDivider />

        {/* Tabela de Lançamentos */}
        <Section
          title={t('section.lancamentos.title')}
          subtitle={t('section.lancamentos.subtitle')}
        >
          <MovimentosTable data={todosMovimentos} />
        </Section>

        <AporteInfoModal
          isOpen={aporteModal !== null}
          onClose={() => setAporteModal(null)}
          type={aporteModal ?? 'total'}
          totalAportes={resumo.totalAportes}
          aporteBrivio={resumo.aporteBrivio}
          aporteIanco={resumo.aporteIanco}
          movimentosBrivio={movimentosBrivio}
          movimentosIanco={movimentosIanco}
        />

        <VendasInfoModal
          isOpen={vendasModalOpen}
          onClose={() => setVendasModalOpen(false)}
          totalVendas={resumo.totalVendas}
          movimentosVendas={movimentosVendas}
        />

        <FluxoDayModal
          isOpen={fluxoDaySelected !== null}
          onClose={() => setFluxoDaySelected(null)}
          dataStr={fluxoDaySelected}
          movimentos={dados?.movimentos ?? []}
        />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">
            {t('footer.generated', { inicio: resumo.periodoInicio, fim: resumo.periodoFim })}
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <img src={withBase('logos/maclinea.png')} alt="Maclinea" className="h-8 opacity-50 hover:opacity-100 transition-opacity" />
            <img src={withBase('logos/usifix.svg')} alt="Usifix" className="h-6 opacity-50 hover:opacity-100 transition-opacity" />
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;

function LangButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors
        ${active ? 'bg-usifix/20 text-usifix-light border border-usifix/30' : 'text-gray-300 hover:bg-white/5'}
      `}
    >
      {label}
    </button>
  );
}

function ScopeButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-colors
        ${active ? 'bg-usifix/20 text-usifix-light border border-usifix/30' : 'text-gray-300 hover:bg-white/5'}
      `}
    >
      {label}
    </button>
  );
}

