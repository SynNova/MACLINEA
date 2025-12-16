import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { FluxoDiario } from '../../types/movimento';
import { CustomTooltip } from './CustomTooltip';
import { formatCurrencyCompact, formatCurrency } from '../../utils/formatters';
import { COLORS } from '../../utils/colors';
import { useI18n } from '../../i18n/I18nProvider';

interface FluxoAreaChartProps {
  data: FluxoDiario[];
  onDayClick?: (dataStr: string) => void;
}

export function FluxoAreaChart({ data, onDayClick }: FluxoAreaChartProps) {
  const { t } = useI18n();
  // Calcula totais
  const totalEntradas = data.reduce((sum, d) => sum + d.entradas, 0);
  const totalSaidas = data.reduce((sum, d) => sum + d.saidas, 0);
  const saldoFinal = data[data.length - 1]?.saldoAcumulado || 0;

  // Calcula domínios SINCRONIZADOS para que o 0 esteja EXATAMENTE na mesma posição em ambos os eixos
  const { leftDomain, rightDomain, leftTicks, rightTicks } = useMemo(() => {
    if (data.length === 0) {
      return { 
        leftDomain: [-50, 100] as [number, number], 
        rightDomain: [-50, 100] as [number, number],
        leftTicks: [-50, 0, 50, 100],
        rightTicks: [-50, 0, 50, 100],
      };
    }

    // Eixo esquerdo: entradas e saídas (sempre >= 0)
    const maxLeft = Math.max(...data.map(d => Math.max(d.entradas, d.saidas))) * 1.1;
    
    // Eixo direito: saldo acumulado (pode ser negativo)
    const minRight = Math.min(...data.map(d => d.saldoAcumulado));
    const maxRight = Math.max(...data.map(d => d.saldoAcumulado));
    
    // Adiciona padding
    const rMin = minRight < 0 ? minRight * 1.1 : 0;
    const rMax = maxRight > 0 ? maxRight * 1.1 : 0;

    // Para sincronizar os zeros, calculamos a proporção onde o 0 deve ficar
    // no eixo direito e aplicamos a mesma proporção no eixo esquerdo
    
    // Proporção do zero no eixo direito (0 = bottom, 1 = top)
    const rightRange = rMax - rMin;
    const zeroRatio = rightRange > 0 ? -rMin / rightRange : 0.5;
    
    // Aplica a mesma proporção no eixo esquerdo
    // Se zeroRatio = 0.3, significa que 30% do gráfico está abaixo do zero
    // Então leftMin = -leftMax * (zeroRatio / (1 - zeroRatio))
    let leftMin = 0;
    let leftMax = maxLeft;
    
    if (zeroRatio > 0 && zeroRatio < 1) {
      // O zero não está na borda - precisamos ajustar
      leftMin = -leftMax * (zeroRatio / (1 - zeroRatio));
    } else if (zeroRatio >= 1) {
      // Todos valores são negativos no eixo direito
      leftMin = -leftMax;
      leftMax = 0;
    }

    // Função para gerar ticks "bonitos" que SEMPRE incluem o zero
    function generateTicks(min: number, max: number, count: number = 5): number[] {
      // Se min e max têm o mesmo sinal e não incluem 0, ajusta
      if (min > 0) min = 0;
      if (max < 0) max = 0;
      
      const range = max - min;
      if (range === 0) return [0];
      
      const step = range / (count - 1);
      
      // Arredonda o step para um valor "bonito"
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(step))));
      const residual = step / magnitude;
      let niceStep: number;
      if (residual <= 1.5) niceStep = magnitude;
      else if (residual <= 3) niceStep = 2 * magnitude;
      else if (residual <= 7) niceStep = 5 * magnitude;
      else niceStep = 10 * magnitude;

      const ticks: number[] = [0]; // Sempre começa com 0
      
      // Adiciona ticks positivos
      for (let v = niceStep; v <= max; v += niceStep) {
        ticks.push(Math.round(v));
      }
      
      // Adiciona ticks negativos
      for (let v = -niceStep; v >= min; v -= niceStep) {
        ticks.push(Math.round(v));
      }
      
      return ticks.sort((a, b) => a - b);
    }

    const lTicks = generateTicks(leftMin, leftMax, 5);
    const rTicks = generateTicks(rMin, rMax, 5);

    return {
      leftDomain: [leftMin, leftMax] as [number, number],
      rightDomain: [rMin, rMax] as [number, number],
      leftTicks: lTicks,
      rightTicks: rTicks,
    };
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="glass-card p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-bold text-white">
          {t('chart.fluxo.title')}
        </h3>
        
        <div className="flex flex-wrap gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-400">{t('chart.entradas')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-400">{t('chart.saidas')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-dashed border-usifix" />
            <span className="text-sm text-gray-400">{t('chart.saldoConta')}</span>
          </div>
        </div>
      </div>

      <div className="h-[380px] min-h-[380px]">
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: 20, bottom: 30 }}
            onClick={(e: unknown) => {
              const evt = e as { activePayload?: Array<{ payload?: { dataFormatada?: string } }> } | null;
              if (evt?.activePayload?.[0]?.payload?.dataFormatada && onDayClick) {
                onDayClick(evt.activePayload[0].payload.dataFormatada);
              }
            }}
            style={{ cursor: onDayClick ? 'pointer' : 'default' }}
          >
            <defs>
              <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C853" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00C853" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF5252" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF5252" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(255,255,255,0.05)" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="dataFormatada" 
              tick={{ fill: '#8B98A5', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              height={50}
              angle={-45}
              textAnchor="end"
              dy={10}
            />
            
            {/* Eixo Y esquerdo - Entradas/Saídas */}
            <YAxis 
              yAxisId="left"
              domain={leftDomain}
              ticks={leftTicks}
              tickFormatter={(value) => formatCurrencyCompact(value)}
              tick={{ fill: '#8B98A5', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              width={75}
            />
            
            {/* Eixo Y direito - Saldo em Conta */}
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={rightDomain}
              ticks={rightTicks}
              tickFormatter={(value) => formatCurrencyCompact(value)}
              tick={{ fill: '#008DD0', fontSize: 10 }}
              axisLine={{ stroke: '#008DD0', strokeOpacity: 0.3 }}
              tickLine={false}
              width={75}
            />
            
            <Tooltip 
              content={<CustomTooltip type="fluxo" />}
              wrapperStyle={{ outline: 'none' }}
            />
            
            {/* Linha do zero - serve para ambos os eixos */}
            <ReferenceLine 
              yAxisId="left"
              y={0} 
              stroke="rgba(255,255,255,0.6)" 
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="entradas"
              stroke="#00C853"
              strokeWidth={2}
              fill="url(#colorEntradas)"
              animationBegin={200}
              animationDuration={1000}
            />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="saidas"
              stroke="#FF5252"
              strokeWidth={2}
              fill="url(#colorSaidas)"
              animationBegin={400}
              animationDuration={1000}
            />
            
            {/* Linha pontilhada do saldo acumulado */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="saldoAcumulado"
              stroke="#008DD0"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              activeDot={{ r: 6, fill: '#008DD0', stroke: '#fff', strokeWidth: 2 }}
              animationBegin={600}
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">{t('chart.totalEntradas')}</p>
          <p className="text-xl font-bold text-green-400">
            {formatCurrency(totalEntradas)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">{t('chart.totalSaidas')}</p>
          <p className="text-xl font-bold text-red-400">
            {formatCurrency(totalSaidas)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">{t('chart.saldoFinal')}</p>
          <p className={`text-xl font-bold ${saldoFinal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(saldoFinal)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

