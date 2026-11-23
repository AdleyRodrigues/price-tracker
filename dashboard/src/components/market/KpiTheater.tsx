import {
  ArrowDownRight,
  ExternalLink,
  Gauge,
  Layers3,
  LineChart,
  Store,
  Trophy,
  Zap,
} from 'lucide-react';
import type { OverviewInsightsResponse } from '@/lib/api';
import { isRealUrl } from '@/lib/api';
import { formatBRL, formatDateTime, formatPct } from '@/lib/format';
import type { ModuloDash } from '@/lib/modulo';
import type { Destaques4k } from '@/lib/custo-beneficio';
import { AnimatedNumber } from './AnimatedNumber';
import { CupomBadge } from './CupomBadge';
import { cn } from '@/lib/utils';

type Props = {
  kpis: OverviewInsightsResponse['kpis'];
  modulo?: ModuloDash;
  destaques4k?: Destaques4k | null;
};

type CardItem = {
  label: string;
  badgeTop?: string | null;
  value: number | string | null;
  kind: 'brl' | 'pct' | 'int' | 'raw';
  hint: string;
  sub?: string | null;
  priceLine?: string | null;
  cupomTag?: string | null;
  url?: string | null;
  icon: typeof Store;
  tone: string;
};

export function KpiTheater({ kpis, modulo, destaques4k }: Props) {
  const isNotebook4k = modulo === 'notebooks' && destaques4k != null;

  const cardsNotebook4k: CardItem[] = isNotebook4k
    ? [
      {
        label: 'Campeão Custo-Benefício 4K',
        badgeTop: destaques4k.campeao
          ? `${destaques4k.campeao.potenciaPorMil.toFixed(1)} pts / R$ mil`
          : null,
        value: destaques4k.campeao ? formatBRL(destaques4k.campeao.preco) : '—',
        kind: 'raw',
        hint: destaques4k.campeao
          ? `${destaques4k.campeao.modelo} · ${destaques4k.campeao.specsCurta}`
          : 'Aguardando coletas',
        sub: destaques4k.campeao
          ? `${destaques4k.campeao.loja ? 'Loja: ' + destaques4k.campeao.loja + ' · ' : ''}Potência 4K: ${Math.round(destaques4k.campeao.potencia)} pts`
          : null,
        cupomTag: destaques4k.campeao?.cupomTag,
        url: destaques4k.campeao?.url,
        icon: Trophy,
        tone: 'text-primary',
      },
      {
        label: 'Entrada 4K Mais Barata',
        badgeTop: destaques4k.menorEntrada
          ? `${Math.round(destaques4k.menorEntrada.potencia)} pts (DLSS)`
          : null,
        value: destaques4k.menorEntrada ? formatBRL(destaques4k.menorEntrada.preco) : '—',
        kind: 'raw',
        hint: destaques4k.menorEntrada
          ? `${destaques4k.menorEntrada.modelo} · ${destaques4k.menorEntrada.specsCurta}`
          : 'Aguardando coletas',
        sub: destaques4k.menorEntrada
          ? `${destaques4k.menorEntrada.loja ? 'Loja: ' + destaques4k.menorEntrada.loja + ' · ' : ''}${destaques4k.menorEntrada.potenciaPorMil.toFixed(1)} pts / R$ mil`
          : null,
        cupomTag: destaques4k.menorEntrada?.cupomTag,
        url: destaques4k.menorEntrada?.url,
        icon: Zap,
        tone: 'text-ink',
      },
      {
        label: 'Máxima Potência 4K',
        badgeTop: 'Teto gráfico',
        value: destaques4k.maxPotencia
          ? `${Math.round(destaques4k.maxPotencia.potencia)} pts`
          : '—',
        kind: 'raw',
        hint: destaques4k.maxPotencia
          ? `${destaques4k.maxPotencia.modelo} · ${destaques4k.maxPotencia.specsCurta}`
          : 'Aguardando coletas',
        priceLine: destaques4k.maxPotencia
          ? `${formatBRL(destaques4k.maxPotencia.preco)}${destaques4k.maxPotencia.loja ? ' · ' + destaques4k.maxPotencia.loja : ''}`
          : null,
        cupomTag: destaques4k.maxPotencia?.cupomTag,
        url: destaques4k.maxPotencia?.url,
        icon: Gauge,
        tone: 'text-primary',
      },
    ]
    : [];

  const cardsPadrao: CardItem[] = [
    {
      label: 'Menor preço agora',
      value: kpis.menorPrecoMercado,
      kind: 'brl',
      hint: kpis.produtoMenorPreco ?? 'Aguardando coletas',
      sub: kpis.produtoMenorPreco && kpis.lojaMenorPreco ? `Loja: ${kpis.lojaMenorPreco}` : null,
      url: kpis.urlMenorPreco,
      icon: Store,
      tone: 'text-primary',
    },
    {
      label: 'Maior movimento 7d',
      value: kpis.maiorQueda7d,
      kind: 'pct',
      hint: kpis.produtoMaiorQueda ?? 'Sem série suficiente',
      url: kpis.urlMaiorQueda,
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
      kind: 'brl',
      hint: 'Desvio dos mínimos diários',
      icon: LineChart,
      tone: 'text-accent-foreground',
    },
    {
      label: 'Snapshots',
      value: kpis.totalSnapshots,
      kind: 'int',
      hint: `Última coleta ${formatDateTime(kpis.ultimaColeta)}`,
      icon: Layers3,
      tone: 'text-ink',
    },
  ];

  const cards = isNotebook4k ? cardsNotebook4k : cardsPadrao;

  return (
    <div
      className={cn(
        'grid gap-4',
        isNotebook4k ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'
      )}
    >
      {cards.map((card, index) => {
        const hasUrl = 'url' in card && isRealUrl(card.url);
        const cupomTag = card.cupomTag?.trim() || null;
        const cardContent = (
          <div
            className={cn(
              'flex h-full flex-col justify-between',
              isNotebook4k ? 'min-h-[210px]' : 'min-h-[175px]'
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-eyebrow truncate" title={card.label}>
                  {card.label}
                </p>
                <span className="shrink-0 rounded-lg bg-muted p-1.5 text-muted-foreground">
                  <card.icon className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <p
                  className={cn(
                    'font-display text-2xl font-bold tracking-tight sm:text-3xl',
                    card.tone
                  )}
                >
                  {card.kind === 'raw' ? (
                    <span className="tabular-price">{card.value}</span>
                  ) : card.kind === 'pct' && card.value != null ? (
                    <span className="tabular-price">{formatPct(card.value as number)}</span>
                  ) : (
                    <AnimatedNumber value={card.value as number | null} kind={card.kind} />
                  )}
                </p>
                {card.badgeTop ? <span className="chip-meta">{card.badgeTop}</span> : null}
              </div>

              {cupomTag ? <CupomBadge cupomTag={cupomTag} className="mt-2" /> : null}

              <p className="mt-2 text-sm font-semibold text-foreground line-clamp-1" title={card.hint}>
                {card.hint}
              </p>

              {card.priceLine ? (
                <p className="mt-1.5 font-display text-base font-bold tabular-price text-ink">
                  {card.priceLine}
                </p>
              ) : null}

              {card.sub ? (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1" title={card.sub}>
                  {card.sub}
                </p>
              ) : null}
            </div>

            {hasUrl ? (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                <span className="font-medium text-muted-foreground">
                  {cupomTag ? 'Valor já com cupom' : 'Oferta verificada'}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary transition-colors group-hover:text-ink">
                  Ir para a loja
                  <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </div>
            ) : null}
          </div>
        );

        const panelClass = cn(
          'animate-podium relative overflow-hidden p-5 transition-[border-color,box-shadow] duration-200 sm:p-6',
          isNotebook4k ? 'market-panel-lift' : 'market-panel',
          hasUrl && 'group cursor-pointer hover:border-primary/50'
        );
        const style = { animationDelay: `${index * 60}ms` } as const;

        if (hasUrl) {
          return (
            <a
              key={card.label}
              href={card.url!}
              target="_blank"
              rel="noopener noreferrer"
              className={panelClass}
              style={style}
              title={`Abrir oferta da ${card.label}`}
            >
              {cardContent}
            </a>
          );
        }

        return (
          <div key={card.label} className={panelClass} style={style}>
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}
