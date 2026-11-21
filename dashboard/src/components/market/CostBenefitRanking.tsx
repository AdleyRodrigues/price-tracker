import { useMemo, useState } from 'react';
import { ExternalLink, Gauge, Wallet } from 'lucide-react';
import { formatBRL } from '@/lib/format';
import {
  CUSTO_UPGRADE_RAM_BRL,
  DESCRICAO_4K,
  TGP_MIN_APROVADO_4K,
  custoBeneficio4k,
  specsFromLabel,
  type Nivel4k,
} from '@/lib/custo-beneficio';
import {
  classificarNotebook,
  ehMarcaPremium,
  foraDoOrcamento,
} from '@/lib/serie-notebook';

type Produto = {
  produtoChave: string;
  label: string;
  menorPreco: number | null;
  lojaMenorPreco: string | null;
  urlMenorPreco?: string | null;
};

type Props = {
  produtos: Produto[];
  /** Marca selecionada na barra da Overview (só para mensagem de vazio). */
  marcaAtiva?: string | null;
};

type Modo = 'potencia-por-preco' | 'preco-por-potencia';
type AbaLista = 'aprovados' | 'oportunidades';

const TOM_4K: Record<Nivel4k, string> = {
  nativo: 'bg-success/15 text-success',
  dlss: 'bg-success/10 text-success',
  'dlss-agressivo': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  limitado: 'bg-destructive/10 text-destructive',
};

function linkValido(url?: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url) && !/example\.com/i.test(url);
}

export function CostBenefitRanking({ produtos, marcaAtiva = null }: Props) {
  const [modo, setModo] = useState<Modo>('potencia-por-preco');
  const [aba, setAba] = useState<AbaLista>('aprovados');
  const [apenasFullPower, setApenasFullPower] = useState(false);

  const allRows = useMemo(() => {
    const rows: Array<
      Produto & {
        menorPreco: number;
        specs: ReturnType<typeof specsFromLabel>;
        cb: NonNullable<ReturnType<typeof custoBeneficio4k>>;
        cls: ReturnType<typeof classificarNotebook>;
      }
    > = [];
    for (const p of produtos) {
      if (p.menorPreco == null) continue;
      const specs = specsFromLabel(p.label, p.produtoChave);
      const cb = custoBeneficio4k({ ...specs, preco: p.menorPreco });
      if (!cb) continue;
      rows.push({
        ...p,
        menorPreco: p.menorPreco,
        specs,
        cb,
        cls: classificarNotebook(p.produtoChave, p.label),
      });
    }
    return rows;
  }, [produtos]);

  const qtdAprovados = useMemo(
    () => allRows.filter((r) => r.cb.aprovado4kTgp).length,
    [allRows]
  );
  const qtdOportunidades = allRows.length - qtdAprovados;

  const rows = useMemo(
    () =>
      allRows
        .filter((r) => {
          if (aba === 'aprovados' && !r.cb.aprovado4kTgp) return false;
          if (aba === 'oportunidades' && r.cb.aprovado4kTgp) return false;
          if (apenasFullPower && r.cls.categoriaTgp !== 'full_power') return false;
          return true;
        })
        .sort((a, b) =>
          modo === 'potencia-por-preco'
            ? b.cb.potenciaPorMil - a.cb.potenciaPorMil
            : a.cb.precoPorPonto - b.cb.precoPorPonto
        ),
    [allRows, aba, apenasFullPower, modo]
  );

  const melhor = rows[0];
  const barra = (r: (typeof rows)[number]) =>
    modo === 'potencia-por-preco'
      ? r.cb.potenciaPorMil / (melhor?.cb.potenciaPorMil || 1)
      : (melhor?.cb.precoPorPonto || 1) / r.cb.precoPorPonto;

  return (
    <section className="market-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Custo-benefício · foco em jogos 4K
          </p>
          <h3 className="font-display text-xl font-bold tracking-tight">
            {modo === 'potencia-por-preco' ? 'Potência 4K por preço' : 'Preço por potência 4K'}
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Em 4K a GPU e o TGP decidem o FPS estável (+ DLSS 4 na série 50). Modelos com 8 GB RAM
            continuam na lista com penalidade e selo de upgrade (~{formatBRL(CUSTO_UPGRADE_RAM_BRL)}).
            Baseline: RTX 4060 115W + 16 GB ≈ 100 pts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border bg-muted/30 p-1 text-xs">
            <button
              type="button"
              onClick={() => setAba('aprovados')}
              className={`rounded-lg px-2.5 py-1 transition font-medium ${aba === 'aprovados'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Aprovados 4K (≥{TGP_MIN_APROVADO_4K}W) · {qtdAprovados}
            </button>
            <button
              type="button"
              onClick={() => setAba('oportunidades')}
              className={`rounded-lg px-2.5 py-1 transition font-medium ${aba === 'oportunidades'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {`Oportunidades (<${TGP_MIN_APROVADO_4K}W) · ${qtdOportunidades}`}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setApenasFullPower(!apenasFullPower)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${apenasFullPower
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
          >
            Full Power (≥115W)
          </button>

          {/* Mode Switch */}
          <div className="inline-flex rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setModo('potencia-por-preco')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${modo === 'potencia-por-preco' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
            >
              <Gauge className="h-3.5 w-3.5" /> Potência / R$
            </button>
            <button
              type="button"
              onClick={() => setModo('preco-por-potencia')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${modo === 'preco-por-potencia' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
            >
              <Wallet className="h-3.5 w-3.5" /> R$ / potência
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {produtos.length === 0 && marcaAtiva
            ? `Nenhum ${marcaAtiva} nos filtros atuais (orçamento / GPU / TGP). Sem ofertas no banco ainda, rode o scraper ou limpe os filtros.`
            : aba === 'oportunidades'
              ? 'Nenhuma oportunidade com TGP capado nos filtros atuais.'
              : 'Nenhum notebook corresponde aos filtros selecionados.'}
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((r, i) => {
            const pct = Math.max(4, Math.round(barra(r) * 100));
            const clicavel = linkValido(r.urlMenorPreco);
            // Sempre nome comercial (TUF F16…); ignora part number no início do label.
            const partesLabel = r.label.split('·').map((s) => s.trim()).filter(Boolean);
            const restoSpecs = partesLabel.slice(1).join(' · ');
            const tituloExibicao = restoSpecs
              ? `${r.cls.linhaLabel} · ${restoSpecs}`
              : r.cls.linhaLabel || r.label;
            const conteudo = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">
                      <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                      <span className={clicavel ? 'group-hover:text-primary group-hover:underline' : ''}>
                        {tituloExibicao}
                      </span>
                      {clicavel ? (
                        <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{formatBRL(r.menorPreco)}</span>
                      {r.lojaMenorPreco ? ` · ${r.lojaMenorPreco}` : ''}
                      {!clicavel ? ' · sem link válido' : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-semibold ${TOM_4K[r.cb.nivel4k]}`}
                      >
                        {DESCRICAO_4K[r.cb.nivel4k]}
                      </span>
                      {r.cls.categoriaTgp === 'full_power' ? (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[0.68rem] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          ⚡ TGP {r.cls.tgpWatts}W Full Power
                        </span>
                      ) : r.cls.categoriaTgp === 'balanceado' ? (
                        <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[0.68rem] font-semibold text-sky-700 dark:text-sky-400 border border-sky-500/20">
                          ⚡ TGP {r.cls.tgpWatts}W Balanceado
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[0.68rem] font-semibold text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          ⚠️ TGP {r.cls.tgpWatts}W Slim (Reduzido)
                        </span>
                      )}
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                        {r.cls.suporta4k120Hz ? '📺 HDMI 2.1 FRL (4K 120Hz)' : '📺 HDMI TMDS (4K 60Hz)'}
                      </span>
                      {r.cb.upgradeRamObrigatorio ? (
                        <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-[0.68rem] font-bold text-destructive border border-destructive/30">
                          UPGRADE OBRIGATÓRIO · +{formatBRL(CUSTO_UPGRADE_RAM_BRL)} RAM
                        </span>
                      ) : null}
                      {r.menorPreco <= 9000 ? (
                        <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-700 dark:text-emerald-400">
                          ✓ No Orçamento
                        </span>
                      ) : (
                        <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-destructive">
                          Acima de R$ 9.000
                        </span>
                      )}
                      {ehMarcaPremium(r.cls.marca) || foraDoOrcamento(r.menorPreco) ? (
                        <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                          Premium
                        </span>
                      ) : null}
                    </div>
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
                    className="h-full rounded-full bg-primary/80 transition-[width] duration-300 motion-reduce:transition-none"
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
    </section>
  );
}
