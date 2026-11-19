import { motion } from 'framer-motion';
import { ArrowDownRight, Layers3, LineChart, Store } from 'lucide-react';
import type { OverviewInsightsResponse } from '@/lib/api';
import { formatDateTime, formatPct } from '@/lib/format';
import { AnimatedNumber } from './AnimatedNumber';

type Props = {
  kpis: OverviewInsightsResponse['kpis'];
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function KpiTheater({ kpis }: Props) {
  const cards = [
    {
      label: 'Menor preço agora',
      value: kpis.menorPrecoMercado,
      kind: 'brl' as const,
      hint: kpis.produtoMenorPreco
        ? `${kpis.produtoMenorPreco} · ${kpis.lojaMenorPreco ?? '—'}`
        : 'Aguardando coletas',
      icon: Store,
      tone: 'text-primary',
    },
    {
      label: 'Maior movimento 7d',
      value: kpis.maiorQueda7d,
      kind: 'pct' as const,
      hint: kpis.produtoMaiorQueda ?? 'Sem série suficiente',
      icon: ArrowDownRight,
      tone:
        kpis.maiorQueda7d == null
          ? 'text-foreground'
          : kpis.maiorQueda7d <= 0
            ? 'text-success'
            : 'text-destructive',
    },
    {
      label: 'Volatilidade média',
      value: kpis.volatilidadeMedia,
      kind: 'brl' as const,
      hint: 'Desvio dos mínimos diários',
      icon: LineChart,
      tone: 'text-accent-foreground',
    },
    {
      label: 'Snapshots',
      value: kpis.totalSnapshots,
      kind: 'int' as const,
      hint: `Última coleta ${formatDateTime(kpis.ultimaColeta)}`,
      icon: Layers3,
      tone: 'text-ink',
    },
  ];

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      initial="hidden"
      animate="show"
      variants={{
        show: { transition: { staggerChildren: 0.08 } },
      }}
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="market-panel relative overflow-hidden p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {card.label}
            </p>
            <span className="rounded-lg bg-muted p-2 text-muted-foreground">
              <card.icon className="h-4 w-4" />
            </span>
          </div>
          <p className={`mt-3 font-display text-3xl font-bold tracking-tight ${card.tone}`}>
            {card.kind === 'pct' && card.value != null ? (
              <span className="tabular-price">{formatPct(card.value)}</span>
            ) : (
              <AnimatedNumber value={card.value} kind={card.kind} />
            )}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
