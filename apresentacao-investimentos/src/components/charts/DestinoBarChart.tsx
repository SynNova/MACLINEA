import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { CategoriaAgregada } from '../../types/movimento';
import { CustomTooltip } from './CustomTooltip';
import { DrillDownModal } from '../ui/DrillDownModal';
import { formatCurrencyCompact, formatCurrency, formatPercentage } from '../../utils/formatters';
import { getChartColor } from '../../utils/colors';
import { useI18n } from '../../i18n/I18nProvider';

interface DestinoBarChartProps {
  data: CategoriaAgregada[];
  maxItems?: number;
}

export function DestinoBarChart({ data, maxItems = 10 }: DestinoBarChartProps) {
  const { t } = useI18n();
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaAgregada | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = data.slice(0, maxItems).map((item, index) => ({
    ...item,
    fill: getChartColor(index),
  }));

  const handleBarClick = (data: CategoriaAgregada) => {
    setSelectedCategoria(data);
  };

  const CustomXAxisTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-8}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#8B98A5"
          fontSize={11}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const ValueLabel = ({
    x,
    y,
    width,
    height,
    value,
  }: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: number;
  }) => {
    if (value == null || x == null || y == null || width == null || height == null) return null;
    const label = formatCurrencyCompact(Number(value));
    return (
      <text
        x={x + width + 8}
        y={y + height / 2 + 4}
        fill="#E5E7EB"
        fontSize={11}
        textAnchor="start"
      >
        {label}
      </text>
    );
  };

  const maxTotal = chartData[0]?.total || Math.max(...chartData.map((d) => d.total), 0);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-card p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {t('chart.destino.title')}
          </h3>
          <span className="text-xs sm:text-sm text-gray-400">
            {t('chart.destino.topN', { n: maxItems })}
          </span>
        </div>

        {/* Mobile: lista + mini barras */}
        <div className="sm:hidden space-y-3">
          {chartData.map((item, index) => {
            const pctMax = maxTotal > 0 ? Math.min(100, (item.total / maxTotal) * 100) : 0;
            return (
              <motion.button
                key={item.categoria}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleBarClick(item)}
                className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10
                           hover:bg-white/10 hover:border-white/15 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-white font-medium leading-snug break-words">
                        {item.categoria}
                      </p>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-bold">
                          {formatCurrencyCompact(item.total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatPercentage(item.percentual)} • {item.count} {t('chart.items')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pctMax}%`,
                          backgroundColor: item.fill,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}

          <p className="text-xs text-gray-500 pt-2">
            {t('tooltip.clickDetalhes')}
          </p>
        </div>

        {/* Desktop: gráfico */}
        <div className="hidden sm:block">
          <div className="h-[900px] min-h-[900px]">
            <ResponsiveContainer width="100%" height={900}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 110, left: 200, bottom: 10 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.05)" 
                  horizontal={true}
                  vertical={false}
                />
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => formatCurrencyCompact(value)}
                  tick={{ fill: '#8B98A5', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="categoria"
                  tick={<CustomXAxisTick x={0} y={0} payload={{ value: '' }} />}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  width={190}
                />
                <Tooltip 
                  content={<CustomTooltip type="destino" />}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Bar 
                  dataKey="total" 
                  radius={[0, 6, 6, 0]}
                  onClick={(data) => handleBarClick(data as unknown as CategoriaAgregada)}
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <LabelList dataKey="total" content={<ValueLabel />} />
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.fill}
                      style={{
                        cursor: 'pointer',
                        opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.5,
                        transition: 'opacity 0.2s ease',
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
            {chartData.slice(0, 4).map((item, index) => (
              <motion.div
                key={item.categoria}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleBarClick(item)}
                className="p-3 rounded-lg bg-white/5 border border-white/5 
                           hover:bg-white/10 hover:border-white/10 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-gray-400 truncate">
                    {item.categoria}
                  </span>
                </div>
                <p className="font-bold text-white text-sm">
                  {formatCurrency(item.total)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatPercentage(item.percentual)} • {item.count} {t('chart.items')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <DrillDownModal
        isOpen={selectedCategoria !== null}
        onClose={() => setSelectedCategoria(null)}
        categoria={selectedCategoria}
      />
    </>
  );
}

