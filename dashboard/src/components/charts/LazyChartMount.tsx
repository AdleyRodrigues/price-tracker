import type { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  /** Altura reservada (evita CLS ao montar/desmontar). */
  minHeight?: number | string;
  className?: string;
  /**
   * Above-the-fold: margem menor para montar cedo.
   * Em ambos os casos o gráfico DESMONTA ao sair da viewport.
   */
  eager?: boolean;
};

/**
 * Monta Recharts só enquanto está (quase) visível.
 * Ao scrollar para longe, desmonta o SVG — libera o scroll a ~60fps.
 */
export function LazyChartMount({
  children,
  minHeight = 280,
  className,
  eager = false,
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>(eager ? '40px 0px' : '220px 0px');
  const height = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  return (
    <div ref={ref} className={cn('relative', className)} style={{ minHeight: height }}>
      {inView ? children : null}
    </div>
  );
}
