export const COLORS = {
  maclinea: {
    DEFAULT: '#8B1538',
    dark: '#5C0E25',
    light: '#B91C4A',
  },
  usifix: {
    DEFAULT: '#008DD0',
    light: '#95C6EB',
    dark: '#006699',
  },
  background: '#0F1419',
  card: '#1A1F26',
  cardHover: '#242B33',
  text: {
    primary: '#F7F9FA',
    secondary: '#8B98A5',
    muted: '#536471',
  },
  success: '#00C853',
  danger: '#FF5252',
  warning: '#FFB300',
};

// Cores de texto para modo claro
export const COLORS_LIGHT = {
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
  },
  background: '#f1f5f9',
  card: '#ffffff',
  grid: 'rgba(0, 0, 0, 0.08)',
  axis: 'rgba(0, 0, 0, 0.15)',
};

// Cores para gráficos alternando entre maclinea e usifix
export const CHART_COLORS = [
  COLORS.maclinea.DEFAULT,
  COLORS.usifix.DEFAULT,
  COLORS.maclinea.light,
  COLORS.usifix.light,
  COLORS.maclinea.dark,
  COLORS.usifix.dark,
];

// Gradientes para gráficos
export const GRADIENTS = {
  maclinea: ['#8B1538', '#B91C4A'],
  usifix: ['#006699', '#95C6EB'],
  mixed: ['#8B1538', '#008DD0'],
};

// Função para obter cor por índice
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// Cores específicas para categorias de despesa
export const CATEGORIA_COLORS: Record<string, string> = {
  'Trabalhista - FGTS Rescisão': COLORS.maclinea.DEFAULT,
  'Trabalhista - Salários Rescisão': COLORS.maclinea.light,
  'Trabalhista - Ações Trabalhistas': COLORS.maclinea.dark,
  'Folha de Pagamento': COLORS.usifix.DEFAULT,
  '13º Salário': COLORS.usifix.light,
  'Despesas Financeiras': '#FF6B6B',
  'Empréstimos/Parcelas': '#FFA726',
  'Compras - Matéria Prima': COLORS.usifix.dark,
  'Compras - Serviços': '#7E57C2',
  'Compras - Insumos': '#26A69A',
  'Compras - Importação': '#42A5F5',
};

export function getCategoriaColor(categoria: string): string {
  return CATEGORIA_COLORS[categoria] || getChartColor(
    Object.keys(CATEGORIA_COLORS).length
  );
}

// Utilitário para obter cores de tema
export function getThemeColors(isDark: boolean) {
  return {
    text: isDark ? '#E5E7EB' : '#1e293b',
    textSecondary: isDark ? '#8B98A5' : '#475569',
    textMuted: isDark ? '#6b7280' : '#94a3b8',
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
    axis: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
    tooltip: {
      bg: isDark ? '#1A1F26' : '#ffffff',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      shadow: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
    },
    cursor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  };
}

