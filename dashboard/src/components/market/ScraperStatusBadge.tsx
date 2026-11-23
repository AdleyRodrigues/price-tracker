import { Radio } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

type Props = {
  atualizadoEm: string | null | undefined;
};

/** Selo enxuto de saúde da coleta — linguagem de comprador, não de debug. */
export function ScraperStatusBadge({ atualizadoEm }: Props) {
  if (!atualizadoEm) {
    return (
      <div className="chip-warn inline-flex items-center gap-2 rounded-full px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-chip-warn-fg)]" />
        Scraper: aguardando primeira varredura
      </div>
    );
  }

  const relative = formatRelativeTime(atualizadoEm);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-[var(--color-chip-good-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-chip-good-fg)]">
      <Radio className="h-3.5 w-3.5" aria-hidden />
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <span>
        Scraper <span className="font-bold">online</span>
        <span className="font-medium opacity-80"> · última varredura {relative}</span>
      </span>
    </div>
  );
}
