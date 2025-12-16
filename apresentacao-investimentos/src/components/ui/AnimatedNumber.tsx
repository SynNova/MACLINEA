import { useAnimatedValue } from '../../hooks/useMovimentos';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface AnimatedNumberProps {
  value: number;
  format?: 'currency' | 'number' | 'percentage';
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format = 'currency',
  duration = 1500,
  delay = 0,
  className = '',
}: AnimatedNumberProps) {
  const animatedValue = useAnimatedValue(value, duration, delay);

  const formattedValue = (() => {
    switch (format) {
      case 'currency':
        return formatCurrency(animatedValue);
      case 'percentage':
        return formatPercentage(animatedValue);
      case 'number':
      default:
        return formatNumber(Math.round(animatedValue));
    }
  })();

  return <span className={className}>{formattedValue}</span>;
}


