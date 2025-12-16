import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { formatPercentage } from '../../utils/formatters';

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  percentage?: number;
  icon?: LucideIcon;
  color?: 'maclinea' | 'usifix' | 'success' | 'default';
  format?: 'currency' | 'number' | 'percentage';
  delay?: number;
  onClick?: () => void;
}

const colorClasses = {
  maclinea: 'from-maclinea/20 to-maclinea/5 border-maclinea/30',
  usifix: 'from-usifix/20 to-usifix/5 border-usifix/30',
  success: 'from-green-500/20 to-green-500/5 border-green-500/30',
  default: 'from-card to-card border-white/10',
};

const iconColorClasses = {
  maclinea: 'text-maclinea-light bg-maclinea/20',
  usifix: 'text-usifix-light bg-usifix/20',
  success: 'text-green-400 bg-green-500/20',
  default: 'text-gray-400 bg-white/10',
};

export function KPICard({
  title,
  value,
  subtitle,
  percentage,
  icon: Icon,
  color = 'default',
  format = 'currency',
  delay = 0,
  onClick,
}: KPICardProps) {
  const clickable = typeof onClick === 'function';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: delay * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={clickable ? { scale: 1.02, y: -2 } : undefined}
      whileTap={clickable ? { scale: 0.99 } : undefined}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        bg-gradient-to-br ${colorClasses[color]}
        border backdrop-blur-xl
        shadow-lg shadow-black/20
        transition-shadow duration-300
        hover:shadow-xl hover:shadow-black/30
        ${clickable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-usifix/40' : ''}
      `}
    >
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {title}
          </h3>
          {Icon && (
            <div className={`p-2 rounded-xl ${iconColorClasses[color]}`}>
              <Icon size={20} />
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="kpi-value text-white">
            <AnimatedNumber 
              value={value} 
              format={format}
              delay={delay * 100 + 200}
              duration={1500}
            />
          </div>
          
          {(subtitle || percentage !== undefined) && (
            <div className="flex items-center gap-2 text-sm">
              {percentage !== undefined && (
                <span className={`
                  font-semibold px-2 py-0.5 rounded-full text-xs
                  ${color === 'maclinea' ? 'bg-maclinea/30 text-maclinea-light' : 
                    color === 'usifix' ? 'bg-usifix/30 text-usifix-light' : 
                    'bg-white/10 text-gray-300'}
                `}>
                  {formatPercentage(percentage)}
                </span>
              )}
              {subtitle && (
                <span className="text-gray-500">{subtitle}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

