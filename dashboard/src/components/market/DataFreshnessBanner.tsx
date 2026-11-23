import { Clock3 } from 'lucide-react';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

type Props = {
  atualizadoEm: string | null | undefined;
};

export function DataFreshnessBanner({ atualizadoEm }: Props) {
  if (!atualizadoEm) {
    return (
      <div className="panel-warn flex items-center gap-3">
        <Clock3 className="h-4 w-4 shrink-0" />
        <p>Ainda sem dados reais no gráfico. Aguarde a próxima coleta do tracker.</p>
      </div>
    );
  }

  return (
    <div className="market-panel flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
          <Clock3 className="h-4 w-4" />
        </span>
        <div>
          <p className="text-eyebrow">Última atualização com dados reais</p>
          <p className="font-display text-base font-semibold tracking-tight">
            {formatDateTime(atualizadoEm)}
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              ({formatRelativeTime(atualizadoEm)})
            </span>
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground sm:text-right">
        Timestamp do último snapshot gravado no histórico
      </p>
    </div>
  );
}
