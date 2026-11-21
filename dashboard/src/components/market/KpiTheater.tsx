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

type Props = {
  kpis: OverviewInsightsResponse['kpis'];
  modulo?: ModuloDash;
  destaques4k?: Destaques4k | null;
};

type CardItem = {
  label: string;
  badgeTop?: string | null;
  badgeTone?: string;
  value: number | string | null;
  kind: 'brl' | 'pct' | 'int' | 'raw';
  hint: string;
  sub?: string | null;
  subTone?: string | null;
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
        badgeTone:
          'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
        value: destaques4k.campeao ? formatBRL(destaques4k.campeao.preco) : '—',
        kind: 'raw',
        hint: destaques4k.campeao
          ? `${destaques4k.campeao.modelo} · ${destaques4k.campeao.specsCurta}`
          : 'Aguardando coletas',
        sub: destaques4k.campeao
          ? `${destaques4k.campeao.loja ? 'Loja: ' + destaques4k.campeao.loja + ' · ' : ''}Potência 4K: ${Math.round(destaques4k.campeao.potencia)} pts`
          : null,
        url: destaques4k.campeao?.url,
        icon: Trophy,
        tone: 'text-primary',
      },
      {
        label: 'Entrada 4K Mais Barata',
        badgeTop: destaques4k.menorEntrada
          ? `${Math.round(destaques4k.menorEntrada.potencia)} pts (DLSS)`
          : null,
        badgeTone:
          'bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30',
        value: destaques4k.menorEntrada ? formatBRL(destaques4k.menorEntrada.preco) : '—',
        kind: 'raw',
        hint: destaques4k.menorEntrada
          ? `${destaques4k.menorEntrada.modelo} · ${destaques4k.menorEntrada.specsCurta}`
          : 'Aguardando coletas',
        sub: destaques4k.menorEntrada
          ? `${destaques4k.menorEntrada.loja ? 'Loja: ' + destaques4k.menorEntrada.loja + ' · ' : ''}${destaques4k.menorEntrada.potenciaPorMil.toFixed(1)} pts / R$ mil`
          : null,
        url: destaques4k.menorEntrada?.url,
        icon: Zap,
        tone: 'text-foreground',
      },
      {
        label: 'Máxima Potência 4K',
        badgeTop: 'Teto Gráfico',
        badgeTone:
          'bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30',
        value: destaques4k.maxPotencia
          ? `${Math.round(destaques4k.maxPotencia.potencia)} pts`
          : '—',
        kind: 'raw',
        hint: destaques4k.maxPotencia
          ? `${destaques4k.maxPotencia.modelo} · ${destaques4k.maxPotencia.specsCurta}`
          : 'Aguardando coletas',
        sub: destaques4k.maxPotencia
          ? `${formatBRL(destaques4k.maxPotencia.preco)}${destaques4k.maxPotencia.loja ? ' · Loja: ' + destaques4k.maxPotencia.loja : ''}`
          : null,
        url: destaques4k.maxPotencia?.url,
        icon: Gauge,
        tone: 'text-purple-600 dark:text-purple-400',
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
      className={`grid gap-4 ${isNotebook4k ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-4'}`}
    >
      {cards.map((card) => {
        const hasUrl = 'url' in card && isRealUrl(card.url);
        const cardContent = (
          <div
            className={`flex h-full flex-col justify-between ${isNotebook4k ? 'min-h-[200px]' : 'min-h-[175px]'}`}
          >
            <div>
              {/* Header: Label limpo à esquerda + Ícone compacto à direita */}
              <div className="flex items-center justify-between gap-2">
                <p
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground truncate"
                  title={card.label}
                >
                  {card.label}
                </p>
                <span className="rounded-lg bg-muted p-1.5 text-muted-foreground shrink-0">
                  <card.icon className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Destaque Principal + Badge de Performance lado a lado */}
              <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
                <p className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${card.tone}`}>
                  {card.kind === 'raw' ? (
                    <span className="tabular-price">{card.value}</span>
                  ) : card.kind === 'pct' && card.value != null ? (
                    <span className="tabular-price">{formatPct(card.value as number)}</span>
                  ) : (
                    <AnimatedNumber value={card.value as number | null} kind={card.kind} />
                  )}
                </p>
                {card.badgeTop ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold whitespace-nowrap shrink-0 ${card.badgeTone ?? 'bg-muted text-foreground'}`}
                  >
                    {card.badgeTop}
                  </span>
                ) : null}
              </div>

              {/* Nome do modelo / hardware */}
              <p className="mt-1.5 text-sm font-medium text-foreground line-clamp-1" title={card.hint}>
                {card.hint}
              </p>

              {/* Specs adicionais ou Alerta visual estilizado */}
              {'sub' in card && card.sub ? (
                card.subTone ? (
                  <div
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.72rem] font-medium leading-tight ${card.subTone}`}
                  >
                    <span>{card.sub}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1" title={card.sub}>
                    {card.sub}
                  </p>
                )
              ) : null}
            </div>

            {/* Rodapé: Ação única clara e alinhada */}
            {hasUrl ? (
              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
                <span className="text-[0.7rem] text-muted-foreground font-normal">Oferta verificada</span>
                <span className="inline-flex items-center gap-1 group-hover:underline">
                  Ir para a loja <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            ) : null}
          </div>
        );

        if (hasUrl) {
          return (
            <a
              key={card.label}
              href={card.url!}
              target="_blank"
              rel="noopener noreferrer"
              className={`market-panel group relative block cursor-pointer overflow-hidden hover:border-primary/60 ${isNotebook4k ? 'p-6 sm:p-7' : 'p-5'}`}
              title={`Abrir oferta da ${card.label}`}
            >
              {cardContent}
            </a>
          );
        }

        return (
          <div
            key={card.label}
            className={`market-panel relative overflow-hidden ${isNotebook4k ? 'p-6 sm:p-7' : 'p-5'}`}
          >
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}
