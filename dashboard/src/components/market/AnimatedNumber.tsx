import { useEffect, useRef, useState } from 'react';
import { countUpFormatter } from '@/lib/insights';
import { cn } from '@/lib/utils';

type Props = {
  value: number | null | undefined;
  kind?: 'brl' | 'pct' | 'int' | 'plain';
  className?: string;
  fallback?: string;
};

/** Count-up com rAF (1 write/frame) em vez de setInterval + setState em rajada. */
export function AnimatedNumber({ value, kind = 'plain', className, fallback = '—' }: Props) {
  const [display, setDisplay] = useState(() => value ?? 0);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    if (value == null) return;
    const start = displayRef.current;
    const target = value;
    const delta = target - start;
    if (Math.abs(delta) < 0.001) {
      setDisplay(target);
      return;
    }

    const durationMs = 280;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(start + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  if (value == null) {
    return <span className={cn('tabular-price', className)}>{fallback}</span>;
  }

  return (
    <span className={cn('tabular-price', className)}>{countUpFormatter(display, kind)}</span>
  );
}
