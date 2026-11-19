import { motion } from 'framer-motion';
import { formatBRL } from '@/lib/format';

type Props = {
  stores: Array<{
    loja: string;
    precoMedio: number;
    menorPreco: number;
    vezesMinimo: number;
    shareMinimos: number;
  }>;
};

export function StoreBattleChart({ stores }: Props) {
  const top = stores.slice(0, 8);
  const maxShare = Math.max(...top.map((s) => s.shareMinimos), 1);

  return (
    <motion.section
      className="market-panel p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.45 }}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Store battle
      </p>
      <h3 className="font-display text-lg font-bold tracking-tight">Quem mais entrega o mínimo</h3>

      {top.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sem lojas no filtro.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {top.map((s, i) => (
            <li key={s.loja}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">
                  <span className="mr-2 font-display text-muted-foreground">{i + 1}.</span>
                  {s.loja}
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.vezesMinimo}× mínimo · avg {formatBRL(s.precoMedio)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.shareMinimos / maxShare) * 100}%` }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.shareMinimos.toFixed(0)}% dos mínimos · melhor {formatBRL(s.menorPreco)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}
