import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, ExternalLink, LineChart } from 'lucide-react';
import { ProductSparkline } from '@/components/charts/ProductSparkline';
import { ProductHistoryModal } from '@/components/market/ProductHistoryModal';
import { Badge } from '@/components/ui/badge';
import { isRealUrl } from '@/lib/api';
import { formatBRL, formatDateShort, formatDateTime, formatPct } from '@/lib/format';
import type { ModuloDash } from '@/lib/modulo';
import {
  classificarNotebook,
  ehMarcaPremium,
  foraDoOrcamento,
} from '@/lib/serie-notebook';
import { custoBeneficio4k, specsFromLabel } from '@/lib/custo-beneficio';

const STROKES = ['#0f6b4c', '#e8913a', '#0369a1', '#be123c', '#0f766e', '#a16207'];

type Props = {
  produtoChave: string;
  label: string;
  menorPreco: number | null;
  lojaMenorPreco: string | null;
  urlMenorPreco?: string | null;
  coletadoEm: string | null;
  variacao7d: number | null;
  totalSnapshots: number;
  sparkline: Array<{ coletadoEm: string; preco: number }>;
  index: number;
  modulo?: ModuloDash;
};

export const ProductMarketCard = memo(function ProductMarketCard({
  produtoChave,
  label,
  menorPreco,
  lojaMenorPreco,
  urlMenorPreco,
  coletadoEm,
  variacao7d,
  sparkline,
  index,
  modulo = 'celular',
}: Props) {
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const stroke = STROKES[index % STROKES.length]!;
  const badgeVariant =
    variacao7d == null ? 'secondary' : variacao7d <= 0 ? 'success' : 'warning';
  const detailTo =
    modulo === 'notebooks'
      ? `/produto/${produtoChave}?modulo=notebooks`
      : `/produto/${produtoChave}`;

  const notebookInfo = useMemo(() => {
    if (modulo !== 'notebooks') return null;
    const cls = classificarNotebook(produtoChave, label);
    const specs = specsFromLabel(label, produtoChave);
    const cb = menorPreco ? custoBeneficio4k({ ...specs, preco: menorPreco }) : null;
    return { cls, specs, cb };
  }, [modulo, produtoChave, label, menorPreco]);

  const tituloExibicao = useMemo(() => {
    if (!notebookInfo) return label;
    const partes = label.split('·').map((s) => s.trim()).filter(Boolean);
    const resto = partes.slice(1).join(' · ');
    return resto
      ? `${notebookInfo.cls.linhaLabel} · ${resto}`
      : notebookInfo.cls.linhaLabel || label;
  }, [notebookInfo, label]);

  /** Menor preço no histórico da janela (sparkline) + data em que apareceu. */
  const minimoHistorico = useMemo(() => {
    if (!sparkline.length) return null;
    let best = sparkline[0]!;
    for (const p of sparkline) {
      if (p.preco < best.preco) best = p;
    }
    return best;
  }, [sparkline]);

  const economiaVsHistorico =
    menorPreco != null && minimoHistorico != null
      ? menorPreco - minimoHistorico.preco
      : null;
  const noMinimoHistorico =
    economiaVsHistorico != null && Math.abs(economiaVsHistorico) < 1;

  return (
    <div className="market-panel group overflow-hidden">
      <Link to={detailTo} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold leading-snug tracking-tight sm:text-lg">
              {tituloExibicao}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {lojaMenorPreco ?? '—'} · {formatDateTime(coletadoEm)}
            </p>
          </div>
          <Badge variant={badgeVariant}>
            {variacao7d == null ? 'sem série' : formatPct(variacao7d)}
          </Badge>
        </div>

        {notebookInfo ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {notebookInfo.cls.categoriaTgp === 'full_power' ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[0.68rem] font-semibold text-emerald-700 border border-emerald-500/20">
                ⚡ TGP {notebookInfo.cls.tgpWatts}W Full
              </span>
            ) : notebookInfo.cls.categoriaTgp === 'balanceado' ? (
              <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[0.68rem] font-semibold text-sky-700 border border-sky-500/20">
                ⚡ TGP {notebookInfo.cls.tgpWatts}W Bal.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.68rem] font-semibold text-amber-800 border border-amber-500/30">
                ⚠️ TGP {notebookInfo.cls.tgpWatts}W Slim
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
              {notebookInfo.cls.suporta4k120Hz ? '📺 HDMI 2.1 FRL' : '📺 HDMI TMDS'}
            </span>
            {notebookInfo.specs.ramGb ? (
              notebookInfo.specs.ramGb < 16 ? (
                <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[0.68rem] font-bold text-destructive border border-destructive/30">
                  UPGRADE OBRIGATÓRIO · {notebookInfo.specs.ramGb} GB
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                  {notebookInfo.specs.ramGb} GB RAM
                </span>
              )
            ) : null}
            {menorPreco != null ? (
              menorPreco <= 9000 ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                  ✓ Até R$ 9k
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-destructive">
                  Acima R$ 9k
                </span>
              )
            ) : null}
            {ehMarcaPremium(notebookInfo.cls.marca) || foraDoOrcamento(menorPreco) ? (
              <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Premium
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Preço atual
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-price text-primary sm:text-3xl">
                {formatBRL(menorPreco)}
              </p>
              {notebookInfo?.cb ? (
                <p className="mt-0.5 text-xs font-medium text-foreground">
                  <span className="font-bold text-primary">
                    {notebookInfo.cb.potenciaPorMil.toFixed(1)}
                  </span>{' '}
                  pts/R$ mil
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Mínimo histórico
              </p>
              <p className="mt-1 font-display text-xl font-bold tabular-price text-foreground sm:text-2xl">
                {formatBRL(minimoHistorico?.preco)}
              </p>
              {minimoHistorico ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  em {formatDateShort(minimoHistorico.coletadoEm)}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">sem série</p>
              )}
            </div>
          </div>
          <div className="w-full sm:w-28 sm:shrink-0 lg:w-36">
            <ProductSparkline data={sparkline} stroke={stroke} />
          </div>
        </div>

        {noMinimoHistorico ? (
          <p className="mt-3 inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-800">
            No mínimo histórico — boa hora de comprar
          </p>
        ) : economiaVsHistorico != null && economiaVsHistorico > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            +{formatBRL(economiaVsHistorico)} acima do mínimo da janela
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-sm text-muted-foreground transition-colors group-hover:text-primary">
          <span className="inline-flex items-center gap-1 font-medium">
            Ver detalhes
            <ChevronRight className="h-4 w-4" />
          </span>
          {isRealUrl(urlMenorPreco) ? (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(urlMenorPreco!, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              title="Abrir oferta diretamente na loja"
            >
              Ver na loja <ExternalLink className="h-3 w-3" />
            </span>
          ) : (
            <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
      </Link>

      <div className="border-t border-border/60 px-5 pb-4 pt-0">
        <button
          type="button"
          onClick={() => setHistoricoAberto(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <LineChart className="h-3.5 w-3.5" aria-hidden />
          Ver Histórico
        </button>
      </div>

      <ProductHistoryModal
        open={historicoAberto}
        onOpenChange={setHistoricoAberto}
        produtoChave={produtoChave}
        titulo={tituloExibicao}
        precoAtual={menorPreco}
        modulo={modulo}
        stroke={stroke}
      />
    </div>
  );
});
