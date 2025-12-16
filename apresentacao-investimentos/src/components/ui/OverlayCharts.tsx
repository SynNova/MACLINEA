import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  PieChart as PieIcon, BarChart2, Percent, Calendar, FileText, CalendarDays,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown, ArrowUp
} from 'lucide-react';
import type { Movimento } from '../../types/movimento';
import { formatCurrency, formatCurrencyCompact } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nProvider';
import { useDataTranslation } from '../../hooks/useDataTranslation';

type ChartType = 'pie' | 'bar' | 'barPercent';
type GroupBy = 'descricao' | 'dia' | 'mes';
type SortBy = 'value' | 'name';
type SortDir = 'asc' | 'desc';

interface OverlayChartsProps {
  movimentos: Movimento[];
  valueField?: 'debito' | 'credito';
}

const COLORS = [
  '#008DD0', '#8B1538', '#10B981', '#F59E0B', '#6366F1',
  '#EC4899', '#14B8A6', '#8B5CF6', '#F97316', '#06B6D4',
  '#84CC16', '#D946EF', '#22D3EE', '#EF4444', '#3B82F6',
];

const ITEMS_PER_PAGE = 15;

export function OverlayCharts({ movimentos, valueField = 'debito' }: OverlayChartsProps) {
  const { t } = useI18n();
  const { tData } = useDataTranslation();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [groupBy, setGroupBy] = useState<GroupBy>('descricao');
  const [sortBy, setSortBy] = useState<SortBy>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  // Dados agregados SEM limite
  const allData = useMemo(() => {
    const groups = new Map<string, number>();

    movimentos.forEach((mov) => {
      let key: string;
      if (groupBy === 'dia') {
        key = mov.dataStr;
      } else if (groupBy === 'mes') {
        const [, m, y] = mov.dataStr.split('/');
        key = `${m}/${y}`;
      } else {
        key = tData(mov.historico || mov.categoria || 'Sem descrição');
      }

      const value = mov[valueField] || 0;
      groups.set(key, (groups.get(key) || 0) + value);
    });

    return Array.from(groups.entries()).map(([name, value]) => ({ name, value }));
  }, [movimentos, groupBy, valueField, tData]);

  // Dados ordenados
  const sortedData = useMemo(() => {
    const data = [...allData];
    const dir = sortDir === 'asc' ? 1 : -1;
    
    if (sortBy === 'value') {
      data.sort((a, b) => (a.value - b.value) * dir);
    } else {
      data.sort((a, b) => a.name.localeCompare(b.name) * dir);
    }
    
    return data;
  }, [allData, sortBy, sortDir]);

  const total = useMemo(() => allData.reduce((s, d) => s + d.value, 0), [allData]);
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  // Dados paginados para o gráfico
  const paginatedData = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, page]);

  const dataWithPercent = useMemo(() => {
    return paginatedData.map((item) => ({
      ...item,
      percent: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }, [paginatedData, total]);

  // Reset page quando muda agrupamento
  const handleGroupChange = (newGroup: GroupBy) => {
    setGroupBy(newGroup);
    setPage(0);
  };

  const toggleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortDir('desc');
    }
    setPage(0);
  };

  if (movimentos.length === 0) {
    return null;
  }

  // Calcula altura dinamica baseada na quantidade de itens
  const chartHeight = Math.max(350, dataWithPercent.length * 35 + 80);

  return (
    <div className="glass-card p-5 border border-white/10">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">{t('overlay.chart.title')}</h3>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tipo de gráfico */}
            <div className="inline-flex rounded-lg bg-background border border-white/10 p-0.5">
              <ChartButton
                active={chartType === 'pie'}
                onClick={() => setChartType('pie')}
                icon={<PieIcon size={14} />}
                title={t('overlay.chart.pie')}
              />
              <ChartButton
                active={chartType === 'bar'}
                onClick={() => setChartType('bar')}
                icon={<BarChart2 size={14} />}
                title={t('overlay.chart.bar')}
              />
              <ChartButton
                active={chartType === 'barPercent'}
                onClick={() => setChartType('barPercent')}
                icon={<Percent size={14} />}
                title={t('overlay.chart.barPercent')}
              />
            </div>

            {/* Agrupamento */}
            <div className="inline-flex rounded-lg bg-background border border-white/10 p-0.5">
              <ChartButton
                active={groupBy === 'descricao'}
                onClick={() => handleGroupChange('descricao')}
                icon={<FileText size={14} />}
                title={t('overlay.chart.byDesc')}
              />
              <ChartButton
                active={groupBy === 'dia'}
                onClick={() => handleGroupChange('dia')}
                icon={<Calendar size={14} />}
                title={t('overlay.chart.byDay')}
              />
              <ChartButton
                active={groupBy === 'mes'}
                onClick={() => handleGroupChange('mes')}
                icon={<CalendarDays size={14} />}
                title={t('overlay.chart.byMonth')}
              />
            </div>
          </div>
        </div>

        {/* Ordenação e Paginação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('overlay.sortBy')}:</span>
            <button
              onClick={() => toggleSort('value')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                sortBy === 'value' ? 'bg-usifix/20 text-usifix-light' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {t('overlay.sort.valor')}
              {sortBy === 'value' && (sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
            </button>
            <button
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                sortBy === 'name' ? 'bg-usifix/20 text-usifix-light' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {t('overlay.sort.descricao')}
              {sortBy === 'name' && (sortDir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
            </button>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={14} className="text-gray-400" />
              </button>
              <span className="text-xs text-gray-400 min-w-[80px] text-center">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: chartType === 'pie' ? 350 : chartHeight }}>
        {chartType === 'pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercent}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                label={({ name, percent }) => `${(name ?? '').slice(0, 15)}${(name ?? '').length > 15 ? '...' : ''} (${(percent ?? 0).toFixed(1)}%)`}
                labelLine={false}
              >
                {dataWithPercent.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-card border border-white/10 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-usifix-light font-bold">{formatCurrency(item.value)}</p>
                      <p className="text-gray-400 text-xs">{item.percent.toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataWithPercent} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#D1D5DB', fontSize: 10 }}
                tickFormatter={(v) => (v.length > 12 ? v.slice(0, 10) + '...' : v)}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tickFormatter={(v) => formatCurrencyCompact(v)} 
                tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                width={70}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-card border border-white/10 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-usifix-light font-bold">{formatCurrency(item.value)}</p>
                      <p className="text-gray-400 text-xs">{item.percent.toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {dataWithPercent.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'barPercent' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataWithPercent} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#D1D5DB', fontSize: 10 }}
                tickFormatter={(v) => (v.length > 12 ? v.slice(0, 10) + '...' : v)}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                domain={[0, 100]} 
                tickFormatter={(v) => `${v}%`} 
                tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                width={50}
              />
              <Tooltip
                content={({ payload }) => {
                  if (!payload?.[0]) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-card border border-white/10 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-usifix-light font-bold">{item.percent.toFixed(1)}%</p>
                      <p className="text-gray-400 text-xs">{formatCurrency(item.value)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                {dataWithPercent.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {t('overlay.chart.total')}: <span className="text-white font-semibold">{formatCurrency(total)}</span>
        </span>
        <span className="text-gray-500 text-xs">
          {sortedData.length} {t('overlay.chart.groups')} 
          {totalPages > 1 && ` • ${t('overlay.chart.showing')} ${page * ITEMS_PER_PAGE + 1}-${Math.min((page + 1) * ITEMS_PER_PAGE, sortedData.length)}`}
        </span>
      </div>
    </div>
  );
}

function ChartButton({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-md transition-colors ${
        active ? 'bg-usifix/20 text-usifix-light' : 'text-gray-400 hover:bg-white/5'
      }`}
    >
      {icon}
    </button>
  );
}

