import { useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Hook que retorna cores otimizadas para gráficos baseado no tema atual.
 * Uso: const { colors, isDark } = useChartTheme();
 */
export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = useMemo(() => ({
    // Cores de texto
    text: isDark ? '#E5E7EB' : '#1e293b',
    textSecondary: isDark ? '#8B98A5' : '#475569',
    textMuted: isDark ? '#6b7280' : '#64748b',
    
    // Linhas de grade e eixos
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
    axis: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    
    // Cursor de hover
    cursor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    
    // Tooltips
    tooltip: {
      bg: isDark ? 'rgba(26, 31, 38, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      shadow: isDark ? '0 20px 25px -5px rgba(0,0,0,0.5)' : '0 10px 15px -3px rgba(0,0,0,0.1)',
    },
    
    // Cores de marca (ajustadas para contraste)
    maclinea: {
      text: isDark ? '#B91C4A' : '#8B1538',
      bg: isDark ? 'rgba(139, 21, 56, 0.2)' : 'rgba(139, 21, 56, 0.12)',
    },
    usifix: {
      text: isDark ? '#95C6EB' : '#0077B6',
      bg: isDark ? 'rgba(0, 141, 208, 0.2)' : 'rgba(0, 141, 208, 0.12)',
    },
    
    // Cores de status (ajustadas para contraste)
    success: {
      text: isDark ? '#4ade80' : '#16a34a',
      bg: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(22, 163, 74, 0.12)',
    },
    danger: {
      text: isDark ? '#f87171' : '#dc2626',
      bg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)',
    },
    warning: {
      text: isDark ? '#fbbf24' : '#d97706',
      bg: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.12)',
    },
  }), [isDark]);

  return { colors, isDark };
}


