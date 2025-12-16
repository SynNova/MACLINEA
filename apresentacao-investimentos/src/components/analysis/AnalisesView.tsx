import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, TrendingDown, Repeat2, ArrowLeftRight, Users } from 'lucide-react';
import { KPICard } from '../ui/KPICard';
import { Section } from '../layout/Section';
import { formatCurrency } from '../../utils/formatters';
import { useAnalises } from '../../hooks/useAnalises';
import { PessoasRescisaoTable } from './PessoasRescisaoTable';
import { useI18n } from '../../i18n/I18nProvider';
import { translateClasseRecorrencia, translateGrupo } from '../../i18n/mappings';

export function AnalisesView() {
  const { t, locale } = useI18n();
  const { data, computed, loading, error, refetch } = useAnalises();

  if (loading) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-gray-400">{t('loading.analises')}</p>
      </div>
    );
  }

  if (error || !computed) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-semibold">{t('error.load.analisesTitle')}</p>
            <p className="text-gray-400 text-sm mt-1">
              {t('error.load.analisesHint')}
            </p>
            <button
              onClick={refetch}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-usifix hover:bg-usifix-dark transition-colors text-white"
            >
              <RefreshCw size={16} />
              {t('actions.reload')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pessoasTable = (data?.pessoas || []).map((p) => ({
    pessoa: p.pessoa,
    salariosRescisao: Number(p.salarios_rescisao_total || 0),
    fgtsRescisao: Number(p.fgts_rescisao_total || 0),
    acoes: Number(p.acoes_trabalhistas_total || 0),
    total: Number(p.total_geral || 0),
    parcelasSal: Number(p.salarios_rescisao_count || 0),
    parcelasFgts: Number(p.fgts_rescisao_count || 0),
  }));

  return (
    <div className="space-y-10">
      <Section
        title={t('analises.title')}
        subtitle={t('analises.subtitle')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <KPICard
            title={t('analises.kpi.saidasOperacionais')}
            value={computed.saidasOperacionais}
            subtitle={t('analises.kpi.saidasOperacionais.subtitle')}
            icon={TrendingDown}
            color="default"
            delay={0}
          />
          <KPICard
            title={t('analises.kpi.transferencias')}
            value={computed.transferenciasDebito}
            subtitle={t('analises.kpi.transferencias.subtitle')}
            icon={ArrowLeftRight}
            color="usifix"
            delay={1}
          />
          <KPICard
            title={t('analises.kpi.implantacaoSaldo')}
            value={computed.implantacaoSaldo}
            subtitle={t('analises.kpi.implantacaoSaldo.subtitle')}
            icon={Repeat2}
            color="maclinea"
            delay={2}
          />
          <KPICard
            title={t('analises.kpi.pessoasComum')}
            value={computed.pessoasEmComumCount}
            subtitle={t('analises.kpi.pessoasComum.subtitle')}
            icon={Users}
            color="success"
            format="number"
            delay={3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-3">{t('analises.resumoRapido')}</h3>
            <div className="space-y-2 text-sm">
              <Linha label={t('analises.resumo.entradasTotais')} value={formatCurrency(computed.entradasTotal)} />
              <Linha label={t('analises.resumo.saidasTotais')} value={formatCurrency(computed.saidasTotal)} />
              <Linha label={t('analises.resumo.saldoPeriodo')} value={formatCurrency(computed.saldoPeriodo)} strong />
              <Linha label={t('analises.resumo.saldoOperacional')} value={formatCurrency(computed.saldoOperacionalAprox)} />
              <Linha label={t('analises.resumo.transferenciasCredito')} value={formatCurrency(computed.transferenciasCredito)} />
            </div>
            <p className="text-xs text-gray-500 mt-4">
              {t('analises.dica')}
            </p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-3">{t('analises.topRecorrentes')}</h3>
            <div className="space-y-2">
              {computed.topRecorrentes.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('analises.semRecorrentes')}</p>
              ) : (
                computed.topRecorrentes.map((r) => (
                  <div key={`${r.categoria}-${r.entidade}`} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{translateGrupo(r.categoria, locale)}</p>
                      <p className="text-gray-500 text-xs truncate">{r.entidade}</p>
                      <p className="text-gray-600 text-xs">
                        {(locale === 'it-IT' ? translateClasseRecorrencia(r.classe, locale) : (r.classe || '').replaceAll('_', ' ')) || '—'}
                        {' '}• {r.count}x • {t('analises.meses')}: {r.meses.join(', ')}
                      </p>
                    </div>
                    <p className="text-white font-semibold text-sm whitespace-nowrap">{formatCurrency(r.total)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Section>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <PessoasRescisaoTable pessoas={pessoasTable} />
      </motion.div>
    </div>
  );
}

function Linha({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className={`text-white ${strong ? 'font-bold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}


