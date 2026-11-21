import { Radio } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

type Props = {
  atualizadoEm: string | null | undefined;
};

/** Selo enxuto de saúde da coleta — linguagem de comprador, não de debug. */
export function ScraperStatusBadge({ atualizadoEm }: Props) {
  if (!atualizadoEm) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/5 px-3 py-1.5 text-xs font-medium text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        Scraper: aguardando primeira varredura
      </div>
    );
  }

  const relative = formatRelativeTime(atualizadoEm);
  // "há 12 minutos" / "há 1 h" — já vem pronto do formatRelativeTime
  const online = true;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground">
      <Radio className="h-3.5 w-3.5 text-primary" aria-hidden />
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <span>
        Status do Scraper:{' '}
        <span className="font-semibold text-primary">{online ? 'Online' : 'Offline'}</span>
        <span className="text-muted-foreground"> · Última varredura: {relative}</span>
      </span>
    </div>
  );
}
