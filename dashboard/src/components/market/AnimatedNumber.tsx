import { useEffect, useState } from 'react';
import { countUpFormatter } from '@/lib/insights';
import { cn } from '@/lib/utils';

type Props = {
  value: number | null | undefined;
  kind?: 'brl' | 'pct' | 'int' | 'plain';
  className?: string;
  fallback?: string;
};

export function AnimatedNumber({ value, kind = 'plain', className, fallback = '—' }: Props) {
  const [display, setDisplay] = useState(0);
  const target = value ?? 0;

  useEffect(() => {
    if (value == null) return;
    let frame = 0;
    const start = display;
    const delta = target - start;
    const steps = 18;
    const id = window.setInterval(() => {
      frame += 1;
      const t = frame / steps;
      const eased = 1 - (1 - t) ** 3;
      setDisplay(start + delta * eased);
      if (frame >= steps) {
        setDisplay(target);
        window.clearInterval(id);
      }
    }, 16);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate only on value change
  }, [target, value]);

  if (value == null) {
    return <span className={cn('tabular-price', className)}>{fallback}</span>;
  }

  return (
    <span className={cn('tabular-price', className)}>{countUpFormatter(display, kind)}</span>
  );
}
