import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from 'recharts';
import type { OrigemRecursos } from '../../types/movimento';
import { CustomTooltip } from './CustomTooltip';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { COLORS } from '../../utils/colors';
import { useI18n } from '../../i18n/I18nProvider';

interface OrigemDonutChartProps {
  data: OrigemRecursos[];
  totalAportes: number;
}

export function OrigemDonutChart({ data, totalAportes }: OrigemDonutChartProps) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = data.map(item => ({
    ...item,
    value: item.valor,
    total: item.valor,
  }));

  const handleMouseEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="glass-card p-6"
    >
      <h3 className="text-xl font-bold text-white mb-6">
        {t('chart.origem.title')}
      </h3>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Chart */}
        <div className="relative w-full lg:w-1/2 h-[300px] min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={activeIndex !== null ? 120 : 115}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                animationBegin={200}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.cor}
                    stroke="transparent"
                    style={{
                      filter: activeIndex === index 
                        ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' 
                        : 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip type="origem" />}
                wrapperStyle={{ outline: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('chart.total')}</p>
              <p className="text-lg md:text-xl font-bold text-white leading-tight whitespace-nowrap">
                {formatCurrency(totalAportes)}
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full lg:w-1/2 space-y-4">
          {data.map((item, index) => (
            <motion.div
              key={item.nome}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 + 0.3 }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`
                p-4 rounded-xl border transition-all cursor-pointer
                ${activeIndex === index 
                  ? 'bg-white/10 border-white/20 scale-[1.02]' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'}
              `}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.cor }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{item.nome}</span>
                    <span className="font-bold text-white">
                      {formatCurrency(item.valor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500">{item.descricao}</span>
                    <span 
                      className="text-sm font-medium px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${item.cor}20`,
                        color: item.cor === COLORS.maclinea.DEFAULT 
                          ? COLORS.maclinea.light 
                          : COLORS.usifix.light
                      }}
                    >
                      {formatPercentage(item.percentual)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

