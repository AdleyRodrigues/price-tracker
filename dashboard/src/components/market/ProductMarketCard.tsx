import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { ProductSparkline } from '@/components/charts/ProductSparkline';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDateTime, formatPct } from '@/lib/format';
import { variacaoLabel } from '@/lib/insights';
import type { ModuloDash } from '@/lib/modulo';

const STROKES = ['#0f6b4c', '#e8913a', '#0369a1', '#be123c', '#0f766e', '#a16207'];

type Props = {
  produtoChave: string;
  label: string;
  menorPreco: number | null;
  lojaMenorPreco: string | null;
  coletadoEm: string | null;
  variacao7d: number | null;
  totalSnapshots: number;
  sparkline: Array<{ coletadoEm: string; preco: number }>;
  index: number;
  modulo?: ModuloDash;
};

export function ProductMarketCard({
  produtoChave,
  label,
  menorPreco,
  lojaMenorPreco,
  coletadoEm,
  variacao7d,
  totalSnapshots,
  sparkline,
  index,
  modulo = 'celular',
}: Props) {
  const stroke = STROKES[index % STROKES.length]!;
  const badgeVariant =
    variacao7d == null ? 'secondary' : variacao7d <= 0 ? 'success' : 'warning';
  const detailTo =
    modulo === 'notebooks'
      ? `/produto/${produtoChave}?modulo=notebooks`
      : `/produto/${produtoChave}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 + index * 0.07, duration: 0.45 }}
      whileHover={{ y: -3 }}
      className="market-panel group overflow-hidden"
    >
      <Link to={detailTo} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold leading-snug tracking-tight sm:text-lg">
              {label}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {lojaMenorPreco ?? '—'} · {formatDateTime(coletadoEm)}
            </p>
          </div>
          <Badge variant={badgeVariant}>
            {variacao7d == null ? 'sem série' : formatPct(variacao7d)}
          </Badge>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Melhor agora
            </p>
            <p className="mt-1 font-display text-3xl font-bold tabular-price text-primary">
              {formatBRL(menorPreco)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {variacaoLabel(variacao7d)} · {totalSnapshots} registros
            </p>
          </div>
          <div className="w-28 shrink-0 sm:w-36">
            <ProductSparkline data={sparkline} stroke={stroke} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-sm text-muted-foreground transition-colors group-hover:text-primary">
          <span className="inline-flex items-center gap-1 font-medium">
            Abrir price theater
            <ChevronRight className="h-4 w-4" />
          </span>
          <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </Link>
    </motion.div>
  );
}
