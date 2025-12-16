import { format, parse } from 'date-fns';
import { ptBR, it as itLocale } from 'date-fns/locale';
import { getLocale } from '../i18n/locale';
import { getBrlPerEur, getCurrency } from '../currency/currency';

function convertFromBRL(valueBrl: number): { value: number; currency: 'BRL' | 'EUR' } {
  const currency = getCurrency();
  if (currency === 'EUR') {
    const rate = getBrlPerEur();
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 6;
    return { value: valueBrl / safeRate, currency: 'EUR' };
  }
  return { value: valueBrl, currency: 'BRL' };
}

function formatBRLByLocale(locale: string, valueBrl: number, options: { compact?: boolean } = {}): string {
  const abs = Math.abs(valueBrl);
  const sign = valueBrl < 0 ? '-' : '';

  const number = options.compact
    ? (() => {
        try {
          return new Intl.NumberFormat(locale, {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 1,
          }).format(abs);
        } catch {
          // fallback compacto manual
          if (abs >= 1_000_000) {
            const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(abs / 1_000_000);
            return `${n}M`;
          }
          if (abs >= 1_000) {
            const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(abs / 1_000);
            return `${n}K`;
          }
          return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
        }
      })()
    : new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);

  // Regra solicitada:
  // - PT: símbolo antes (R$)
  // - IT: código depois (BRL)
  if (locale === 'it-IT') return `${sign}${number} BRL`;
  return `${sign}R$ ${number}`;
}

export function formatCurrency(value: number): string {
  const locale = getLocale();
  const { value: v, currency } = convertFromBRL(value);

  // BRL com regra de exibição por idioma
  if (currency === 'BRL') {
    return formatBRLByLocale(locale, v);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatCurrencyCompact(value: number): string {
  const locale = getLocale();
  const { value: v, currency } = convertFromBRL(value);

  // BRL com regra de exibição por idioma (compacto)
  if (currency === 'BRL') {
    return formatBRLByLocale(locale, v, { compact: true });
  }

  // Preferir Intl (compact) quando disponível, pois respeita separadores e idioma
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(v);
  } catch {
    // Fallback manual (mantém BRL + formatação por locale)
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const symbol = currency === 'EUR' ? '€' : 'R$';
    if (abs >= 1_000_000) {
      const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(abs / 1_000_000);
      return `${sign}${symbol} ${n}M`;
    }
    if (abs >= 1_000) {
      const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(abs / 1_000);
      return `${sign}${symbol} ${n}K`;
    }
    return formatCurrency(value);
  }
}

export function formatNumber(value: number): string {
  const locale = getLocale();
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercentage(value: number, decimals = 1): string {
  const locale = getLocale();
  const n = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${n}%`;
}

export function parseDate(dateStr: string): Date {
  // Formato do CSV: "05/11/2025"
  return parse(dateStr, 'dd/MM/yyyy', new Date());
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  // dd/MM/yyyy é estável em PT/IT e mantém compatibilidade com o CSV
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const locale = getLocale();
  if (locale === 'it-IT') {
    return format(d, 'dd MMMM', { locale: itLocale });
  }
  return format(d, "dd 'de' MMMM", { locale: ptBR });
}

export function parseCSVNumber(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Formato BR: "1.234,56" -> 1234.56
  const cleaned = value
    .replace(/\./g, '')  // Remove pontos de milhar
    .replace(',', '.');   // Troca vírgula por ponto
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

