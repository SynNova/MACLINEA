import { useMemo, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nProvider';

export interface PessoaRowUI {
  pessoa: string;
  salariosRescisao: number;
  fgtsRescisao: number;
  acoes: number;
  total: number;
  parcelasSal: number;
  parcelasFgts: number;
}

interface PessoasRescisaoTableProps {
  pessoas: PessoaRowUI[];
  somenteEmComum?: boolean;
}

export function PessoasRescisaoTable({ pessoas, somenteEmComum = false }: PessoasRescisaoTableProps) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [onlyCommon, setOnlyCommon] = useState(somenteEmComum);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return pessoas
      .filter((p) => {
        if (onlyCommon && !(p.salariosRescisao > 0 && p.fgtsRescisao > 0)) return false;
        if (!query) return true;
        return p.pessoa.toLowerCase().includes(query);
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 80);
  }, [pessoas, q, onlyCommon]);

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">{t('pessoas.title')}</h3>
          <p className="text-gray-400 text-sm mt-1">
            {t('pessoas.subtitle')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('pessoas.search')}
              className="w-full sm:w-72 pl-10 pr-4 py-2 rounded-lg bg-background border border-white/10
                         text-white placeholder-gray-500 focus:outline-none focus:border-usifix/50 transition-colors"
            />
          </div>

          <button
            onClick={() => setOnlyCommon((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
              ${onlyCommon ? 'bg-usifix/20 border-usifix/40 text-usifix-light' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}
            `}
          >
            <Filter size={16} />
            {t('pessoas.onlyCommon')}
          </button>
        </div>
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-3">
        {filtered.map((p) => (
          <div
            key={p.pessoa}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-semibold leading-snug break-words">
                  {p.pessoa}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('pessoas.col.parcelas')}: {p.parcelasSal}x / {p.parcelasFgts}x
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold">{formatCurrency(p.total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">{t('pessoas.col.rescisao')}</p>
                <p className="text-gray-200 font-medium">{formatCurrency(p.salariosRescisao)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{t('pessoas.col.fgts')}</p>
                <p className={`font-medium ${p.fgtsRescisao > 0 ? 'text-maclinea-light' : 'text-gray-500'}`}>
                  {formatCurrency(p.fgtsRescisao)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('pessoas.col.acoes')}</p>
                <p className={`font-medium ${p.acoes > 0 ? 'text-usifix-light' : 'text-gray-500'}`}>
                  {formatCurrency(p.acoes)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-background/50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">{t('pessoas.col.pessoa')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">{t('pessoas.col.rescisao')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">{t('pessoas.col.fgts')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">{t('pessoas.col.acoes')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">{t('pessoas.col.total')}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">{t('pessoas.col.parcelas')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.pessoa} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{p.pessoa}</td>
                <td className="px-4 py-3 text-right text-gray-200">{formatCurrency(p.salariosRescisao)}</td>
                <td className={`px-4 py-3 text-right ${p.fgtsRescisao > 0 ? 'text-maclinea-light' : 'text-gray-500'}`}>
                  {formatCurrency(p.fgtsRescisao)}
                </td>
                <td className={`px-4 py-3 text-right ${p.acoes > 0 ? 'text-usifix-light' : 'text-gray-500'}`}>
                  {formatCurrency(p.acoes)}
                </td>
                <td className="px-4 py-3 text-right text-white font-semibold">{formatCurrency(p.total)}</td>
                <td className="px-4 py-3 text-right text-gray-400">
                  {p.parcelasSal}x / {p.parcelasFgts}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        {t('pessoas.nota')}
      </p>
    </div>
  );
}


