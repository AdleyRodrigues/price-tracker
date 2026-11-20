import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ExternalLink,
  Gauge,
  Layers3,
  LineChart,
  Store,
  Trophy,
  Tv,
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

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
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
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
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
            'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/25',
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
            'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25',
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
        {
          label: 'Saída TV 4K · Cabo HDMI',
          badgeTop: '4K @ 120Hz',
          badgeTone:
            'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25',
          value: destaques4k.hdmiInfo.versao,
          kind: 'raw',
          hint: `${destaques4k.hdmiInfo.suporte} · ${destaques4k.hdmiInfo.dica}`,
          sub: destaques4k.alerta8gb
            ? `⚠️ Alerta: Evite 8 GB RAM (${destaques4k.alerta8gb.modelo}) para TV 4K`
            : 'Todos os modelos com 16 GB+ recomendados.',
          subTone: destaques4k.alerta8gb
            ? 'text-amber-600 dark:text-amber-400 font-semibold'
            : null,
          url: null,
          icon: Tv,
          tone: 'text-sky-600 dark:text-sky-400',
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
    <motion.div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      initial="hidden"
      animate="show"
      variants={{
        show: { transition: { staggerChildren: 0.08 } },
      }}
    >
      {cards.map((card) => {
        const hasUrl = 'url' in card && isRealUrl(card.url);
        const cardContent = (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {card.label}
              </p>
              <div className="flex items-center gap-1.5">
                {card.badgeTop ? (
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold ${card.badgeTone ?? 'bg-muted text-foreground'}`}
                  >
                    {card.badgeTop}
                  </span>
                ) : null}
                {hasUrl ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[0.68rem] font-semibold text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    Ver oferta <ExternalLink className="h-3 w-3" />
                  </span>
                ) : null}
                <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <card.icon className="h-4 w-4" />
                </span>
              </div>
            </div>
            <p className={`mt-3 font-display text-3xl font-bold tracking-tight ${card.tone}`}>
              {card.kind === 'raw' ? (
                <span className="tabular-price">{card.value}</span>
              ) : card.kind === 'pct' && card.value != null ? (
                <span className="tabular-price">{formatPct(card.value as number)}</span>
              ) : (
                <AnimatedNumber value={card.value as number | null} kind={card.kind} />
              )}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
            {'sub' in card && card.sub ? (
              <p
                className={`mt-1 text-xs font-medium ${card.subTone ?? 'text-foreground/70'}`}
              >
                {card.sub}
              </p>
            ) : null}
            {hasUrl ? (
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                <span>Ir para a loja</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            ) : null}
          </>
        );

        if (hasUrl) {
          return (
            <motion.a
              key={card.label}
              href={card.url!}
              target="_blank"
              rel="noopener noreferrer"
              variants={item}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="market-panel group relative block overflow-hidden p-5 transition-all hover:border-primary/60 hover:shadow-md cursor-pointer"
              title={`Abrir oferta da ${card.label}`}
            >
              {cardContent}
            </motion.a>
          );
        }

        return (
          <motion.div
            key={card.label}
            variants={item}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="market-panel relative overflow-hidden p-5"
          >
            {cardContent}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
