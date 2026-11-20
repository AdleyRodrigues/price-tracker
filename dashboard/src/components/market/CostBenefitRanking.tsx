import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Gauge, Wallet } from 'lucide-react';
import { formatBRL } from '@/lib/format';
import { DESCRICAO_4K, custoBeneficio4k, specsFromLabel, type Nivel4k } from '@/lib/custo-beneficio';

type Produto = {
  produtoChave: string;
  label: string;
  menorPreco: number | null;
  lojaMenorPreco: string | null;
  urlMenorPreco?: string | null;
};

type Props = {
  produtos: Produto[];
};

type Modo = 'potencia-por-preco' | 'preco-por-potencia';

const TOM_4K: Record<Nivel4k, string> = {
  nativo: 'bg-success/15 text-success',
  dlss: 'bg-success/10 text-success',
  'dlss-agressivo': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  limitado: 'bg-destructive/10 text-destructive',
};

function linkValido(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url) && !/example\.com/i.test(url);
}

export function CostBenefitRanking({ produtos }: Props) {
  const [modo, setModo] = useState<Modo>('potencia-por-preco');

  const rows = produtos
    .map((p) => {
      if (p.menorPreco == null) return null;
      const specs = specsFromLabel(p.label);
      const cb = custoBeneficio4k({ ...specs, preco: p.menorPreco });
      if (!cb) return null;
      return { ...p, specs, cb };
    })
    .filter((r): r is NonNullable<typeof r> => r != null)
    .sort((a, b) =>
      modo === 'potencia-por-preco'
        ? b.cb.potenciaPorMil - a.cb.potenciaPorMil
        : a.cb.precoPorPonto - b.cb.precoPorPonto
    );

  const melhor = rows[0];
  const barra = (r: (typeof rows)[number]) =>
    modo === 'potencia-por-preco'
      ? r.cb.potenciaPorMil / (melhor?.cb.potenciaPorMil || 1)
      : (melhor?.cb.precoPorPonto || 1) / r.cb.precoPorPonto;

  return (
    <motion.section
      className="market-panel p-5 sm:p-6"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Custo-benefício · foco em jogos 4K
          </p>
          <h3 className="font-display text-xl font-bold tracking-tight">
            {modo === 'potencia-por-preco' ? 'Potência 4K por preço' : 'Preço por potência 4K'}
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Em 4K a GPU decide o FPS: o índice pesa GPU (+ bônus DLSS 4 Frame Gen na série 50),
            penaliza 8 GB de RAM e dá pouco peso à CPU. RTX 4060 + 16 GB = 100 pts. Clique para abrir a oferta.
          </p>
        </div>

        <div className="inline-flex rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModo('potencia-por-preco')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              modo === 'potencia-por-preco' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Gauge className="h-3.5 w-3.5" /> Potência / R$
          </button>
          <button
            type="button"
            onClick={() => setModo('preco-por-potencia')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
              modo === 'preco-por-potencia' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <Wallet className="h-3.5 w-3.5" /> R$ / potência
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Sem preços para ranquear.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((r, i) => {
            const pct = Math.max(4, Math.round(barra(r) * 100));
            const clicavel = linkValido(r.urlMenorPreco);
            const conteudo = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      <span className={clicavel ? 'group-hover:text-primary group-hover:underline' : ''}>
                        {r.label}
                      </span>
                      {clicavel ? (
                        <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{formatBRL(r.menorPreco)}</span>
                      {r.lojaMenorPreco ? ` · ${r.lojaMenorPreco}` : ''}
                      {!clicavel ? ' · sem link válido (dado de teste?)' : ''}
                    </p>
                    <span
                      className={`mt-1.5 inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-semibold ${TOM_4K[r.cb.nivel4k]}`}
                    >
                      {DESCRICAO_4K[r.cb.nivel4k]}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-sm font-bold tabular-nums text-primary">
                      {modo === 'potencia-por-preco'
                        ? `${r.cb.potenciaPorMil.toFixed(2)} pts/R$ mil`
                        : `${formatBRL(r.cb.precoPorPonto)}/pt`}
                    </p>
                    <p className="text-[0.7rem] tabular-nums text-muted-foreground">
                      {r.cb.potencia.toFixed(0)} pts ·{' '}
                      {modo === 'potencia-por-preco'
                        ? `${formatBRL(r.cb.precoPorPonto)}/pt`
                        : `${r.cb.potenciaPorMil.toFixed(2)} pts/R$ mil`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            );

            return (
              <li key={r.produtoChave}>
                {clicavel ? (
                  <a
                    href={r.urlMenorPreco!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-muted/40"
                    title={`Abrir oferta na ${r.lojaMenorPreco ?? 'loja'}`}
                  >
                    {conteudo}
                  </a>
                ) : (
                  <div className="rounded-xl p-3 opacity-70">{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </motion.section>
  );
}
