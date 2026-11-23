import { formatBRL, formatPct } from './format';

export function toneClass(tone: 'positive' | 'warning' | 'neutral' | 'accent'): string {
  switch (tone) {
    case 'positive':
      return 'border-success/30 bg-[var(--color-chip-good-bg)] text-[var(--color-chip-good-fg)]';
    case 'warning':
      return 'border-warning/35 bg-[var(--color-chip-warn-bg)] text-[var(--color-chip-warn-fg)]';
    case 'accent':
      return 'border-accent/40 bg-accent/15 text-accent-foreground';
    default:
      return 'border-border bg-card text-foreground';
  }
}

export function variacaoLabel(value: number | null | undefined): string {
  if (value == null) return 'sem série';
  if (value < -0.3) return `caiu ${formatPct(Math.abs(value)).replace('+', '')}`;
  if (value > 0.3) return `subiu ${formatPct(value)}`;
  return 'estável';
}

export function countUpFormatter(value: number, kind: 'brl' | 'pct' | 'int' | 'plain' = 'plain'): string {
  if (kind === 'brl') return formatBRL(value);
  if (kind === 'pct') return formatPct(value);
  if (kind === 'int') return Math.round(value).toLocaleString('pt-BR');
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
