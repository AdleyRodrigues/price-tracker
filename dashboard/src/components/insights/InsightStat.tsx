import { formatBRL, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
};

export function InsightStat({ label, value, hint, className }: Props) {
  return (
    <div className={cn('market-panel p-4', className)}>
      <p className="text-eyebrow">{label}</p>
      <p className="mt-2 font-display text-xl font-bold tracking-tight tabular-price text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function formatInsightValue(
  value: number | null | undefined,
  kind: 'brl' | 'pct' | 'int' | 'days' = 'brl'
): string {
  if (value == null) return '—';
  if (kind === 'brl') return formatBRL(value);
  if (kind === 'pct') return formatPct(value);
  if (kind === 'days') return `${Math.round(value)}d`;
  return Math.round(value).toLocaleString('pt-BR');
}
