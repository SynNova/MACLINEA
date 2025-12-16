import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import type { ColumnFiltersState, SortingState, RowSelectionState, Row } from '@tanstack/react-table';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Filter,
  X,
  CheckSquare,
  Square,
  MinusSquare,
  Copy,
  Check,
  Calendar,
  DollarSign,
} from 'lucide-react';
import type { Movimento } from '../../types/movimento';
import { formatCurrency, truncateText, formatNumber, formatPercentage } from '../../utils/formatters';
import { useI18n } from '../../i18n/I18nProvider';
import { translateTipoMovimento } from '../../i18n/mappings';
import { useDataTranslation } from '../../hooks/useDataTranslation';

interface MovimentosTableProps {
  data: Movimento[];
}

const columnHelper = createColumnHelper<Movimento>();

// Componente para valores clicáveis que copiam ao clicar
function CopyableValue({ value, formatted, color }: { value: number; formatted: string; color: 'red' | 'green' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const textToCopy = Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 font-medium whitespace-nowrap text-xs md:text-sm 
                  hover:opacity-80 transition-opacity cursor-copy group
                  ${color === 'red' ? 'text-red-400' : 'text-green-400'}`}
      title="Clique para copiar"
    >
      {formatted}
      {copied ? (
        <Check size={12} className="text-green-400" />
      ) : (
        <Copy size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );
}

// Dropdown de filtro rápido para cabeçalhos
interface HeaderFilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  translateFn?: (value: string) => string;
  anchorEl: HTMLElement | null;
}

function HeaderFilterDropdown({
  isOpen,
  onClose,
  options,
  value,
  onChange,
  placeholder,
  translateFn,
  anchorEl,
}: HeaderFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((opt) => {
      const label = translateFn ? translateFn(opt) : opt;
      return label.toLowerCase().includes(lower);
    });
  }, [options, search, translateFn]);

  if (!isOpen || !anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  
  // Calcula a posição left para centralizar o dropdown na coluna
  // Se não couber na tela, ajusta para não sair da viewport
  const dropdownWidth = 256; // w-64 = 16rem = 256px
  let leftPos = rect.left + (rect.width / 2) - (dropdownWidth / 2);
  
  // Garante que não saia da tela pela esquerda
  if (leftPos < 8) leftPos = 8;
  // Garante que não saia da tela pela direita
  if (leftPos + dropdownWidth > window.innerWidth - 8) {
    leftPos = window.innerWidth - dropdownWidth - 8;
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 mt-1 w-64 max-h-80 overflow-hidden rounded-xl bg-card border border-white/10 shadow-2xl"
      style={{ top: rect.bottom + 4, left: leftPos }}
    >
      <div className="p-2 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-white/10 text-white text-sm focus:outline-none focus:border-usifix/50 placeholder-gray-500"
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        <button
          onClick={() => {
            onChange('');
            onClose();
          }}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            !value ? 'bg-usifix/20 text-usifix-light' : 'text-gray-300 hover:bg-white/5'
          }`}
        >
          Todos
        </button>
        {filteredOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onChange(opt);
              onClose();
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
              value === opt ? 'bg-usifix/20 text-usifix-light' : 'text-gray-300 hover:bg-white/5'
            }`}
            title={translateFn ? translateFn(opt) : opt}
          >
            {translateFn ? translateFn(opt) : opt}
          </button>
        ))}
        {filteredOptions.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-500">Nenhum resultado</p>
        )}
      </div>
    </div>
  );
}

// Context menu para seleção de período/valor
interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  type: 'date' | 'value';
  dateStart: string;
  dateEnd: string;
  onDateStartChange: (v: string) => void;
  onDateEndChange: (v: string) => void;
  valueMin: string;
  valueMax: string;
  onValueMinChange: (v: string) => void;
  onValueMaxChange: (v: string) => void;
  t: (key: string) => string;
}

function ContextMenu({
  isOpen,
  onClose,
  position,
  type,
  dateStart,
  dateEnd,
  onDateStartChange,
  onDateEndChange,
  valueMin,
  valueMax,
  onValueMinChange,
  onValueMaxChange,
  t,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed z-50 w-72 rounded-xl bg-card border border-white/10 shadow-2xl p-4"
      style={{ top: position.y, left: Math.min(position.x, window.innerWidth - 300) }}
    >
      {type === 'date' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-usifix-light text-sm font-medium">
            <Calendar size={16} />
            {t('table.contextMenu.dateRange')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('table.filters.dataInicio')}</label>
              <input
                type="text"
                placeholder="dd/mm/aaaa"
                value={dateStart}
                onChange={(e) => onDateStartChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-white text-sm focus:outline-none focus:border-usifix/50 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('table.filters.dataFim')}</label>
              <input
                type="text"
                placeholder="dd/mm/aaaa"
                value={dateEnd}
                onChange={(e) => onDateEndChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-white text-sm focus:outline-none focus:border-usifix/50 placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                onDateStartChange('');
                onDateEndChange('');
              }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-usifix/20 border border-usifix/30 text-usifix-light text-xs font-medium hover:bg-usifix/30 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-usifix-light text-sm font-medium">
            <DollarSign size={16} />
            {t('table.contextMenu.valueRange')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('table.filters.valorMin')}</label>
              <input
                type="text"
                placeholder="0,00"
                value={valueMin}
                onChange={(e) => onValueMinChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-white text-sm focus:outline-none focus:border-usifix/50 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('table.filters.valorMax')}</label>
              <input
                type="text"
                placeholder="999.999,99"
                value={valueMax}
                onChange={(e) => onValueMaxChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-white text-sm focus:outline-none focus:border-usifix/50 placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                onValueMinChange('');
                onValueMaxChange('');
              }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-usifix/20 border border-usifix/30 text-usifix-light text-xs font-medium hover:bg-usifix/30 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function MovimentosTable({ data }: MovimentosTableProps) {
  const { t, locale } = useI18n();
  const { tData } = useDataTranslation();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'valor', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const lastClickedIndexRef = useRef<number | null>(null);

  // Filtros
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterBanco, setFilterBanco] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterHistorico, setFilterHistorico] = useState('');
  const [filterValorMin, setFilterValorMin] = useState('');
  const [filterValorMax, setFilterValorMax] = useState('');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  // Dropdowns inline nos cabeçalhos
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<HTMLElement | null>(null);

  // Context menus
  const [contextMenu, setContextMenu] = useState<{ type: 'date' | 'value'; x: number; y: number } | null>(null);

  // Opções únicas para filtros
  const uniqueOptions = useMemo(() => {
    const categorias = new Set<string>();
    const bancos = new Set<string>();
    const tipos = new Set<string>();
    const historicos = new Set<string>();
    data.forEach((mov) => {
      if (mov.categoria) categorias.add(mov.categoria);
      if (mov.banco) bancos.add(mov.banco);
      if (mov.tipo) tipos.add(mov.tipo);
      if (mov.historico) historicos.add(mov.historico);
    });
    return {
      categorias: Array.from(categorias).sort(),
      bancos: Array.from(bancos).sort(),
      tipos: Array.from(tipos).sort(),
      historicos: Array.from(historicos).sort(),
    };
  }, [data]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    let result = data;

    if (filterCategoria) {
      result = result.filter((mov) => mov.categoria === filterCategoria);
    }
    if (filterBanco) {
      result = result.filter((mov) => mov.banco === filterBanco);
    }
    if (filterTipo) {
      result = result.filter((mov) => mov.tipo === filterTipo);
    }
    if (filterHistorico) {
      result = result.filter((mov) => mov.historico === filterHistorico);
    }
    if (filterValorMin) {
      const min = parseFloat(filterValorMin.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(min)) {
        result = result.filter((mov) => mov.debito >= min || mov.credito >= min);
      }
    }
    if (filterValorMax) {
      const max = parseFloat(filterValorMax.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(max)) {
        result = result.filter((mov) => (mov.debito > 0 ? mov.debito <= max : mov.credito <= max));
      }
    }
    if (filterDataInicio) {
      const [d, m, y] = filterDataInicio.split('/');
      if (d && m && y) {
        const startDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        result = result.filter((mov) => mov.data >= startDate);
      }
    }
    if (filterDataFim) {
      const [d, m, y] = filterDataFim.split('/');
      if (d && m && y) {
        const endDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 23, 59, 59);
        result = result.filter((mov) => mov.data <= endDate);
      }
    }

    return result;
  }, [data, filterCategoria, filterBanco, filterTipo, filterHistorico, filterValorMin, filterValorMax, filterDataInicio, filterDataFim]);


  // Colunas
  const columns = useMemo(() => {
    const colSelect = columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <button
          onClick={() => {
            const allSelected = table.getIsAllPageRowsSelected();
            table.toggleAllPageRowsSelected(!allSelected);
          }}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          {table.getIsAllPageRowsSelected() ? (
            <CheckSquare size={16} className="text-usifix" />
          ) : table.getIsSomePageRowsSelected() ? (
            <MinusSquare size={16} className="text-usifix/60" />
          ) : (
            <Square size={16} className="text-gray-500" />
          )}
        </button>
      ),
      cell: ({ row }) => (
        <button onClick={() => row.toggleSelected()} className="p-1 hover:bg-white/10 rounded transition-colors">
          {row.getIsSelected() ? (
            <CheckSquare size={16} className="text-usifix" />
          ) : (
            <Square size={16} className="text-gray-500" />
          )}
        </button>
      ),
      size: 40,
    });

    const colData = columnHelper.accessor('dataStr', {
      id: 'dataStr',
      header: t('table.col.data'),
      cell: (info) => <span className="text-gray-300 whitespace-nowrap text-xs md:text-sm">{info.getValue()}</span>,
      size: 90,
      meta: { sortable: true, contextMenu: 'date' },
      sortingFn: (rowA, rowB) => {
        // Ordena usando o campo Date, não a string formatada
        return rowA.original.data.getTime() - rowB.original.data.getTime();
      },
    });

    const colTipo = columnHelper.accessor('tipo', {
      id: 'tipo',
      header: t('table.col.tipo'),
      cell: (info) => {
        const tipo = info.getValue();
        const isCredito = tipo === 'Receber';
        const label = translateTipoMovimento(tipo, locale);
        return (
          <span
            className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap
            ${isCredito ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
          `}
          >
            {isCredito ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {label}
          </span>
        );
      },
      size: 110,
      meta: { filterable: true },
    });

    const colValor = columnHelper.display({
      id: 'valor',
      header: t('table.col.valor'),
      cell: ({ row }) => {
        const debito = row.original.debito;
        const credito = row.original.credito;
        if (debito > 0) {
          return <CopyableValue value={-debito} formatted={`-${formatCurrency(debito)}`} color="red" />;
        }
        if (credito > 0) {
          return <CopyableValue value={credito} formatted={`+${formatCurrency(credito)}`} color="green" />;
        }
        return <span className="text-gray-600">-</span>;
      },
      sortingFn: (rowA, rowB) => {
        const valorA = rowA.original.credito > 0 ? rowA.original.credito : -rowA.original.debito;
        const valorB = rowB.original.credito > 0 ? rowB.original.credito : -rowB.original.debito;
        return valorA - valorB;
      },
      size: 140,
      meta: { sortable: true, contextMenu: 'value' },
    });

    const colDocumento = columnHelper.accessor('documento', {
      id: 'documento',
      header: t('table.col.documento'),
      cell: (info) => {
        const doc = info.getValue();
        return doc ? (
          <span className="text-gray-300 text-xs md:text-sm whitespace-nowrap">{doc}</span>
        ) : (
          <span className="text-gray-600">-</span>
        );
      },
      size: 100,
    });

    const colCategoria = columnHelper.accessor('categoria', {
      id: 'categoria',
      header: t('table.col.categoria'),
      cell: (info) => {
        const raw = info.getValue();
        const label = tData(raw);
        return (
          <span className="text-white" title={label}>
            {truncateText(label, 25)}
          </span>
        );
      },
      size: 180,
      meta: { filterable: true },
    });

    const colHistorico = columnHelper.accessor('historico', {
      id: 'historico',
      header: t('table.col.historico'),
      cell: (info) => {
        const raw = info.getValue();
        const label = tData(raw);
        return (
          <span className="text-gray-400" title={label}>
            {truncateText(label, 40)}
          </span>
        );
      },
      size: 300,
      meta: { filterable: true },
    });

    const colBanco = columnHelper.accessor('banco', {
      id: 'banco',
      header: t('table.col.banco'),
      meta: { thClassName: 'hidden sm:table-cell', tdClassName: 'hidden sm:table-cell', filterable: true },
      cell: (info) => <span className="text-gray-400 text-xs md:text-sm whitespace-nowrap">{info.getValue()}</span>,
      size: 120,
    });

    return [colSelect, colData, colTipo, colValor, colDocumento, colCategoria, colHistorico, colBanco];
  }, [t, locale, tData]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(row.id),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  // Totais - inclui rowSelection nas dependências para recalcular quando a seleção mudar
  const totals = useMemo(() => {
    const geralDebito = data.reduce((s, m) => s + m.debito, 0);
    const geralCredito = data.reduce((s, m) => s + m.credito, 0);
    const geralCount = data.length;

    const exibidoRows = table.getFilteredRowModel().rows;
    const exibidoDebito = exibidoRows.reduce((s, r) => s + r.original.debito, 0);
    const exibidoCredito = exibidoRows.reduce((s, r) => s + r.original.credito, 0);
    const exibidoCount = exibidoRows.length;

    const selectedRows = table.getSelectedRowModel().rows;
    const selecionadoDebito = selectedRows.reduce((s, r) => s + r.original.debito, 0);
    const selecionadoCredito = selectedRows.reduce((s, r) => s + r.original.credito, 0);
    const selecionadoCount = selectedRows.length;

    return {
      geral: { debito: geralDebito, credito: geralCredito, count: geralCount },
      exibido: {
        debito: exibidoDebito,
        credito: exibidoCredito,
        count: exibidoCount,
        pctDebito: geralDebito > 0 ? (exibidoDebito / geralDebito) * 100 : 0,
        pctCredito: geralCredito > 0 ? (exibidoCredito / geralCredito) * 100 : 0,
      },
      selecionado: {
        debito: selecionadoDebito,
        credito: selecionadoCredito,
        count: selecionadoCount,
        pctDebitoTotal: geralDebito > 0 ? (selecionadoDebito / geralDebito) * 100 : 0,
        pctDebitoExibido: exibidoDebito > 0 ? (selecionadoDebito / exibidoDebito) * 100 : 0,
        pctCreditoTotal: geralCredito > 0 ? (selecionadoCredito / geralCredito) * 100 : 0,
        pctCreditoExibido: exibidoCredito > 0 ? (selecionadoCredito / exibidoCredito) * 100 : 0,
      },
    };
  }, [data, table, rowSelection]);

  const clearFilters = useCallback(() => {
    setFilterCategoria('');
    setFilterBanco('');
    setFilterTipo('');
    setFilterHistorico('');
    setFilterValorMin('');
    setFilterValorMax('');
    setFilterDataInicio('');
    setFilterDataFim('');
    setGlobalFilter('');
  }, []);

  const hasActiveFilters =
    filterCategoria || filterBanco || filterTipo || filterHistorico || filterValorMin || filterValorMax || filterDataInicio || filterDataFim || globalFilter;

  // Handler para seleção de linha
  const handleRowClick = useCallback(
    (e: React.MouseEvent, row: Row<Movimento>, index: number) => {
      const rows = table.getRowModel().rows;

      if (e.shiftKey && lastClickedIndexRef.current !== null) {
        const start = Math.min(lastClickedIndexRef.current, index);
        const end = Math.max(lastClickedIndexRef.current, index);

        const newSelection: RowSelectionState = { ...rowSelection };
        for (let i = start; i <= end; i++) {
          const r = rows[i];
          if (r) {
            newSelection[r.id] = true;
          }
        }
        setRowSelection(newSelection);
      } else {
        row.toggleSelected();
        lastClickedIndexRef.current = index;
      }
    },
    [table, rowSelection]
  );

  // Função para renderizar cabeçalho com ícones de ordenação/filtro
  const renderHeaderContent = (header: any) => {
    const columnId = header.column.id;
    const meta = header.column.columnDef.meta as { filterable?: boolean; sortable?: boolean; contextMenu?: string } | undefined;
    const isSortable = meta?.sortable || ['dataStr', 'valor'].includes(columnId);
    const isFilterable = meta?.filterable || ['tipo', 'categoria', 'historico', 'banco'].includes(columnId);

    // Determina o filtro ativo para esta coluna
    const getActiveFilter = () => {
      switch (columnId) {
        case 'tipo': return filterTipo;
        case 'categoria': return filterCategoria;
        case 'historico': return filterHistorico;
        case 'banco': return filterBanco;
        default: return '';
      }
    };

    const activeFilter = isFilterable ? getActiveFilter() : '';

    return (
      <div className="flex items-center gap-2 w-full">
        <span className="flex items-center gap-1">
          {flexRender(header.column.columnDef.header, header.getContext())}
          {activeFilter && (
            <span className="w-1.5 h-1.5 rounded-full bg-usifix animate-pulse" />
          )}
        </span>
        {isSortable && (
          <span className="text-gray-600">
            {{
              asc: <ChevronUp size={14} className="text-usifix" />,
              desc: <ChevronDown size={14} className="text-usifix" />,
            }[header.column.getIsSorted() as string] ?? <ArrowUpDown size={14} />}
          </span>
        )}
        {isFilterable && (
          <Filter size={12} className={activeFilter ? 'text-usifix' : 'text-gray-600'} />
        )}
      </div>
    );
  };

  // Funções de tradução para filtros
  const getFilterOptions = (columnId: string) => {
    switch (columnId) {
      case 'tipo': return uniqueOptions.tipos;
      case 'categoria': return uniqueOptions.categorias;
      case 'historico': return uniqueOptions.historicos;
      case 'banco': return uniqueOptions.bancos;
      default: return [];
    }
  };

  const getFilterValue = (columnId: string) => {
    switch (columnId) {
      case 'tipo': return filterTipo;
      case 'categoria': return filterCategoria;
      case 'historico': return filterHistorico;
      case 'banco': return filterBanco;
      default: return '';
    }
  };

  const setFilterValue = (columnId: string, value: string) => {
    switch (columnId) {
      case 'tipo': setFilterTipo(value); break;
      case 'categoria': setFilterCategoria(value); break;
      case 'historico': setFilterHistorico(value); break;
      case 'banco': setFilterBanco(value); break;
    }
  };

  const getTranslateFn = (columnId: string) => {
    if (columnId === 'tipo') return (v: string) => translateTipoMovimento(v, locale);
    if (columnId === 'categoria' || columnId === 'historico') return tData;
    return undefined;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg md:text-xl font-bold text-white">{t('table.mov.title')}</h3>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder={t('table.search')}
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg
                           bg-background border border-white/10
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-usifix/50
                           transition-colors"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
              >
                <X size={14} />
                {t('table.filters.clear')}
              </button>
            )}
          </div>
        </div>

        {/* Active filters badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4">
            {filterTipo && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-usifix/10 border border-usifix/20 text-usifix-light text-xs">
                {t('table.col.tipo')}: {translateTipoMovimento(filterTipo, locale)}
                <button onClick={() => setFilterTipo('')} className="hover:text-white"><X size={12} /></button>
              </span>
            )}
            {filterCategoria && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-usifix/10 border border-usifix/20 text-usifix-light text-xs">
                {t('table.col.categoria')}: {truncateText(tData(filterCategoria), 20)}
                <button onClick={() => setFilterCategoria('')} className="hover:text-white"><X size={12} /></button>
              </span>
            )}
            {filterHistorico && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-usifix/10 border border-usifix/20 text-usifix-light text-xs">
                {t('table.col.historico')}: {truncateText(tData(filterHistorico), 20)}
                <button onClick={() => setFilterHistorico('')} className="hover:text-white"><X size={12} /></button>
              </span>
            )}
            {filterBanco && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-usifix/10 border border-usifix/20 text-usifix-light text-xs">
                {t('table.col.banco')}: {filterBanco}
                <button onClick={() => setFilterBanco('')} className="hover:text-white"><X size={12} /></button>
              </span>
            )}
            {(filterDataInicio || filterDataFim) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-usifix/10 border border-usifix/20 text-usifix-light text-xs">
                {t('table.col.data')}: {filterDataInicio || '...'} - {filterDataFim || '...'}
                <button onClick={() => { setFilterDataInicio(''); setFilterDataFim(''); }} className="hover:text-white"><X size={12} /></button>
              </span>
            )}
            {(filterValorMin || filterValorMax) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-usifix/10 border border-usifix/20 text-usifix-light text-xs">
                {t('table.col.valor')}: {filterValorMin || '0'} - {filterValorMax || '∞'}
                <button onClick={() => { setFilterValorMin(''); setFilterValorMax(''); }} className="hover:text-white"><X size={12} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Selection controls */}
      <div className="px-6 py-3 bg-background/30 border-b border-white/5 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => table.toggleAllRowsSelected(true)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {t('table.select.all')}
        </button>
        <button
          onClick={() => table.toggleAllRowsSelected(false)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {t('table.select.none')}
        </button>
        <button
          onClick={() => {
            const pageRows = table.getRowModel().rows;
            pageRows.forEach((row) => row.toggleSelected(true));
          }}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {t('table.select.visible')}
        </button>

        {totals.selecionado.count > 0 && (
          <span className="text-xs text-usifix-light ml-auto">
            {totals.selecionado.count} {t('table.totals.selected')}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-20 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-white/10 bg-background">
                  {headerGroup.headers.map((header) => {
                    const columnId = header.column.id;
                    const meta = header.column.columnDef.meta as { filterable?: boolean; sortable?: boolean; contextMenu?: string; thClassName?: string } | undefined;
                    const isSortable = meta?.sortable || ['dataStr', 'valor'].includes(columnId);
                    const isFilterable = meta?.filterable || ['tipo', 'categoria', 'historico', 'banco'].includes(columnId);
                    const hasContextMenu = meta?.contextMenu;

                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 text-left text-sm font-medium text-gray-400
                                   bg-background cursor-pointer select-none
                                   hover:bg-card transition-colors
                                   ${meta?.thClassName ?? ''}`}
                        style={{ width: header.getSize() }}
                        onClick={(e) => {
                          if (isFilterable) {
                            e.stopPropagation();
                            if (openDropdown === columnId) {
                              setOpenDropdown(null);
                              setDropdownAnchor(null);
                            } else {
                              setOpenDropdown(columnId);
                              setDropdownAnchor(e.currentTarget);
                            }
                          } else if (isSortable) {
                            header.column.getToggleSortingHandler()?.(e);
                          }
                        }}
                        onContextMenu={(e) => {
                          if (hasContextMenu) {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({ type: hasContextMenu as 'date' | 'value', x: e.clientX, y: e.clientY });
                          }
                        }}
                      >
                        {renderHeaderContent(header)}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.2) }}
                  onClick={(e) => handleRowClick(e, row, index)}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer select-none ${
                    row.getIsSelected() ? 'bg-usifix/10' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 ${((cell.column.columnDef.meta as { tdClassName?: string } | undefined)?.tdClassName) ?? ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: Totalizadores */}
      <div className="p-4 border-t border-white/10 bg-background/50 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Geral */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 mb-1">{t('table.totals.geral')}</p>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-red-400 font-bold">{formatCurrency(totals.geral.debito)}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-green-400 font-bold">{formatCurrency(totals.geral.credito)}</span>
              </div>
              <span className="text-xs text-gray-500">{formatNumber(totals.geral.count)} {t('table.totals.itens')}</span>
            </div>
          </div>

          {/* Total Exibido */}
          <div className="p-4 rounded-xl bg-usifix/10 border border-usifix/20">
            <p className="text-xs text-gray-400 mb-1">{t('table.totals.exibido')}</p>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-red-400 font-bold">{formatCurrency(totals.exibido.debito)}</span>
                <span className="text-gray-500 mx-1">/</span>
                <span className="text-green-400 font-bold">{formatCurrency(totals.exibido.credito)}</span>
              </div>
              <span className="text-xs text-gray-500">{formatNumber(totals.exibido.count)} {t('table.totals.itens')}</span>
            </div>
            <p className="text-xs text-usifix-light mt-1">
              {formatPercentage(totals.exibido.pctDebito)} / {formatPercentage(totals.exibido.pctCredito)} {t('table.totals.ofTotal')}
            </p>
          </div>

          {/* Total Selecionado */}
          <div className={`p-4 rounded-xl border ${totals.selecionado.count > 0 ? 'bg-maclinea/10 border-maclinea/20' : 'bg-white/5 border-white/10'}`}>
            <p className="text-xs text-gray-400 mb-1">{t('table.totals.selecionado')}</p>
            {totals.selecionado.count > 0 ? (
              <>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-red-400 font-bold">{formatCurrency(totals.selecionado.debito)}</span>
                    <span className="text-gray-500 mx-1">/</span>
                    <span className="text-green-400 font-bold">{formatCurrency(totals.selecionado.credito)}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatNumber(totals.selecionado.count)} {t('table.totals.itens')}</span>
                </div>
                <p className="text-xs text-maclinea-light mt-1">
                  {formatPercentage(totals.selecionado.pctDebitoTotal)} {t('table.totals.ofTotal')} •{' '}
                  {formatPercentage(totals.selecionado.pctDebitoExibido)} {t('table.totals.ofDisplayed')}
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-sm">-</p>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <span className="text-sm text-gray-400">
            {t('table.showing', { shown: table.getRowModel().rows.length, total: table.getFilteredRowModel().rows.length })}
          </span>

          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg bg-white/5 border border-white/10
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-white/10 transition-colors"
            >
              <ChevronsLeft size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg bg-white/5 border border-white/10
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-400" />
            </button>

            <span className="px-4 py-2 text-sm text-white">
              {t('table.page', { page: table.getState().pagination.pageIndex + 1, pages: table.getPageCount() })}
            </span>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg bg-white/5 border border-white/10
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg bg-white/5 border border-white/10
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-white/10 transition-colors"
            >
              <ChevronsRight size={16} className="text-gray-400" />
            </button>
          </div>

          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-background border border-white/10
                       text-white text-sm focus:outline-none focus:border-usifix/50"
          >
            {[10, 15, 25, 50, 100].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {t('table.perPage', { n: pageSize })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dropdown de filtro para cabeçalhos */}
      <HeaderFilterDropdown
        isOpen={openDropdown !== null}
        onClose={() => { setOpenDropdown(null); setDropdownAnchor(null); }}
        options={openDropdown ? getFilterOptions(openDropdown) : []}
        value={openDropdown ? getFilterValue(openDropdown) : ''}
        onChange={(v) => { if (openDropdown) setFilterValue(openDropdown, v); }}
        placeholder={t('table.search')}
        translateFn={openDropdown ? getTranslateFn(openDropdown) : undefined}
        anchorEl={dropdownAnchor}
      />

      {/* Context menu para período/valor */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            isOpen={true}
            onClose={() => setContextMenu(null)}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            type={contextMenu.type}
            dateStart={filterDataInicio}
            dateEnd={filterDataFim}
            onDateStartChange={setFilterDataInicio}
            onDateEndChange={setFilterDataFim}
            valueMin={filterValorMin}
            valueMax={filterValorMax}
            onValueMinChange={setFilterValorMin}
            onValueMaxChange={setFilterValorMax}
            t={t}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
