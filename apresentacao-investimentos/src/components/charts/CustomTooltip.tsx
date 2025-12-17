import { motion } from 'framer-motion';
import { formatCurrency, formatPercentage, truncateText } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nProvider';
import { useDataTranslation } from '../../hooks/useDataTranslation';
import { useTheme } from '../../theme/ThemeProvider';

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    nome?: string;
    categoria?: string;
    total?: number;
    count?: number;
    percentual?: number;
    descricao?: string;
    data?: string;
    top3?: Array<{ historico: string; debito: number }>;
    [key: string]: unknown;
  };
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  type?: 'origem' | 'destino' | 'fluxo';
}

export function CustomTooltip({ active, payload, label, type = 'destino' }: CustomTooltipProps) {
  const { t } = useI18n();
  const { tData } = useDataTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`backdrop-blur-xl p-4 rounded-xl border min-w-[220px] max-w-[300px]
        ${isDark 
          ? 'bg-card/95 border-white/10 shadow-2xl shadow-black/50' 
          : 'bg-white/98 border-gray-200 shadow-xl shadow-black/10'
        }
      `}
    >
      {type === 'origem' && (
        <OrigemTooltipContent data={data} t={t} />
      )}
      
      {type === 'destino' && (
        <DestinoTooltipContent data={data} t={t} tData={tData} />
      )}

      {type === 'fluxo' && (
        <FluxoTooltipContent data={data} label={label} t={t} />
      )}

      <p className={`text-xs mt-3 pt-2 border-t ${isDark ? 'text-gray-500 border-white/5' : 'text-gray-400 border-gray-200'}`}>
        {t('tooltip.clickDetalhes')}
      </p>
    </motion.div>
  );
}

function OrigemTooltipContent({ data, t }: { data: TooltipPayload['payload']; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <>
      <h4 className="font-bold text-white text-lg mb-2">
        {data.nome}
      </h4>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">{t('tooltip.valor')}:</span>
          <span className="font-bold text-usifix-light">
            {formatCurrency(data.total || 0)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">{t('tooltip.percentual')}:</span>
          <span className="px-2 py-0.5 rounded-full bg-usifix/20 text-usifix-light text-sm font-medium">
            {formatPercentage(data.percentual || 0)}
          </span>
        </div>

        {data.descricao && (
          <p className="text-sm text-gray-500 italic">
            {data.descricao}
          </p>
        )}

        {data.data && (
          <p className="text-xs text-gray-500">
            {t('tooltip.data')}: {data.data}
          </p>
        )}
      </div>
    </>
  );
}

function DestinoTooltipContent({
  data,
  t,
  tData,
}: {
  data: TooltipPayload['payload'];
  t: (key: string, params?: Record<string, string | number>) => string;
  tData: (text: string) => string;
}) {
  return (
    <>
      <h4 className="font-bold text-white text-base mb-2">
        {data.categoria}
      </h4>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">{t('tooltip.total')}:</span>
          <span className="font-bold text-maclinea-light">
            {formatCurrency(data.total || 0)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">{t('tooltip.percentual')}:</span>
          <span className="px-2 py-0.5 rounded-full bg-maclinea/20 text-maclinea-light text-sm font-medium">
            {formatPercentage(data.percentual || 0)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">{t('tooltip.lancamentos')}:</span>
          <span className="text-white">{data.count}</span>
        </div>
      </div>

      {data.top3 && data.top3.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/5">
          <p className="text-xs text-maclinea-light font-medium mb-2">
            {t('tooltip.maioresPagamentos')}
          </p>
          <div className="space-y-1">
            {data.top3.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-400 truncate max-w-[140px]">
                  {truncateText(tData(item.historico), 25)}
                </span>
                <span className="text-white font-medium">
                  {formatCurrency(item.debito)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function FluxoTooltipContent({
  data,
  label,
  t,
}: {
  data: TooltipPayload['payload'];
  label?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const entradas = (data as { entradas?: number }).entradas || 0;
  const saidas = (data as { saidas?: number }).saidas || 0;
  const saldoAcumulado = (data as { saldoAcumulado?: number }).saldoAcumulado || 0;
  const saldo = entradas - saidas;

  return (
    <>
      <h4 className="font-bold text-white text-base mb-2">
        {label}
      </h4>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-green-400">{t('chart.entradas')}:</span>
          <span className="font-medium text-green-400">
            {formatCurrency(entradas)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-red-400">{t('chart.saidas')}:</span>
          <span className="font-medium text-red-400">
            {formatCurrency(saidas)}
          </span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <span className="text-gray-400">{t('tooltip.saldo')}:</span>
          <span className={`font-bold ${saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(saldo)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-usifix-light">{t('chart.saldoConta')}:</span>
          <span className={`font-bold ${saldoAcumulado >= 0 ? 'text-usifix-light' : 'text-red-400'}`}>
            {formatCurrency(saldoAcumulado)}
          </span>
        </div>
      </div>
    </>
  );
}

