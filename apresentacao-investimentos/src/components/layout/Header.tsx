import { motion } from 'framer-motion';
import { useI18n } from '../../i18n/I18nProvider';
import { useBancoScope } from '../../filters/BancoScopeProvider';
import { withBase } from '../../utils/assetUrl';

interface HeaderProps {
  periodoInicio?: string;
  periodoFim?: string;
}

export function Header({ periodoInicio, periodoFim }: HeaderProps) {
  const { t } = useI18n();
  const { scope } = useBancoScope();
  const banksLabel = scope === 'all' ? t('filters.banks.allLong') : t('filters.banks.coreLong');

  return (
    <header className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-maclinea/10 via-background to-usifix/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-usifix/5 via-transparent to-transparent" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 container mx-auto px-4 md:px-6 py-10 md:py-16">
        {/* Logos */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-6 md:gap-8 mb-8 md:mb-12"
        >
          <img 
            src={withBase('logos/maclinea.png')} 
            alt="Maclinea" 
            className="h-12 md:h-20 object-contain"
          />
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <img 
            src={withBase('logos/usifix.svg')} 
            alt="Usifix" 
            className="h-8 md:h-12 object-contain"
          />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-white">{t('header.titlePrefix')}</span>
            <span className="gradient-text">{t('header.titleHighlight')}</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-6">
            {t('header.subtitle')}
          </p>

          {periodoInicio && periodoFim && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="inline-flex flex-wrap items-center justify-center gap-3 px-5 md:px-6 py-3 rounded-2xl
                         bg-card/50 border border-white/10 backdrop-blur-xl"
            >
              <span className="text-gray-500">{t('header.period')}</span>
              <span className="font-semibold text-white">
                {periodoInicio}
              </span>
              <span className="text-usifix">→</span>
              <span className="font-semibold text-white">
                {periodoFim}
              </span>
              <span className="hidden sm:inline text-gray-600">•</span>
              <span className="text-gray-500 text-sm">
                {t('header.banks', { banks: banksLabel })}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px 
                     bg-gradient-to-r from-transparent via-usifix/50 to-transparent"
        />
      </div>
    </header>
  );
}

