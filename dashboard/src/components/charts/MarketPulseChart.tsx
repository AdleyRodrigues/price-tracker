import { memo, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoricalChartState } from 'recharts/types/chart/types';
import { LazyChartMount } from '@/components/charts/LazyChartMount';
import { downsample } from '@/lib/downsample';
import { formatBRL, formatDateTime, formatRelativeTime } from '@/lib/format';

const PALETTE = ['#0f6b4c', '#e8913a', '#0369a1', '#be123c', '#0f766e', '#a16207', '#4f46e5', '#db2777'];
const MAX_PONTOS_CHART = 48;

function colorFor(chave: string, index: number): string {
  const known: Record<string, string> = {
    poco_x8_pro_max: PALETTE[0]!,
    xiaomi_15t_pro: PALETTE[1]!,
    xiaomi_17t_pro: PALETTE[2]!,
  };
  return known[chave] ?? PALETTE[index % PALETTE.length]!;
}

type Props = {
  data: Array<{ coletadoEm: string; label: string;[key: string]: string | number | null }>;
  produtos: string[];
  labels?: Record<string, string>;
  titulo?: string;
  subtitulo?: string;
  eyebrow?: string;
  ocultarGpu?: boolean;
  atualizadoEm?: string | null;
  eager?: boolean;
};

function formatarLabelSeries(rawLabel: string, ocultarGpu: boolean): string {
  if (!ocultarGpu) return rawLabel;
  return rawLabel.replace(/(?:\s*·\s*|\s+)RTX\s*\d{4}(?:\s*Ti)?/gi, '').trim();
}

type SerieInfo = { chave: string; label: string; color: string };

type HoverInfo = {
  chave: string;
  dataLabel: string;
  nome: string;
  valor: number;
  color: string;
};

/**
 * Com shared={false} o Recharts expõe yValue = yScale.invert(chartY).
 * Escolhemos a série cujo preço no X ativo está mais perto desse yValue.
 */
function resolverHover(
  state: CategoricalChartState,
  chartData: Props['data'],
  series: SerieInfo[]
): HoverInfo | null {
  const yValue = state.yValue;
  const index = state.activeTooltipIndex;
  if (yValue == null || !Number.isFinite(yValue) || index == null || index < 0) {
    return null;
  }

  const row = chartData[index];
  if (!row) return null;

  let melhor: SerieInfo | null = null;
  let melhorDist = Infinity;
  for (const s of series) {
    const v = Number(row[s.chave]);
    if (!Number.isFinite(v)) continue;
    const dist = Math.abs(v - Number(yValue));
    if (dist < melhorDist) {
      melhorDist = dist;
      melhor = s;
    }
  }
  if (!melhor) return null;

  const valor = Number(row[melhor.chave]);
  if (!Number.isFinite(valor)) return null;

  return {
    chave: melhor.chave,
    dataLabel: String(row.label ?? state.activeLabel ?? ''),
    nome: melhor.label,
    valor,
    color: melhor.color,
  };
}

function MarketPulseTooltip({ hover }: { hover: HoverInfo | null }) {
  if (!hover) return null;

  return (
    <div
      className="pointer-events-none z-[60] max-w-[14rem] rounded-lg border border-border px-2.5 py-1.5 text-xs shadow-md"
      style={{ backgroundColor: '#ffffff' }}
    >
      <p className="mb-0.5 truncate font-semibold text-foreground">{hover.dataLabel}</p>
      <p
        className="mb-1 truncate font-medium leading-snug"
        style={{ color: hover.color }}
        title={hover.nome}
      >
        {hover.nome}
      </p>
      <p className="tabular-nums font-semibold text-foreground">{formatBRL(hover.valor)}</p>
    </div>
  );
}

export const MarketPulseChart = memo(function MarketPulseChart({
  data,
  produtos,
  labels = {},
  titulo = 'Menor preço por coleta',
  subtitulo = 'Uma linha por modelo',
  eyebrow = 'Market pulse',
  ocultarGpu,
  atualizadoEm = null,
  eager = false,
}: Props) {
  const gpuNoHeader = Boolean((titulo + ' ' + (eyebrow ?? '')).match(/rtx\s*\d{4}/i));
  const deveOcultarGpu = ocultarGpu ?? gpuNoHeader;

  const series = useMemo(
    () =>
      produtos.map((chave, i) => {
        const rawLabel = labels[chave] ?? chave;
        return {
          chave,
          label: formatarLabelSeries(rawLabel, deveOcultarGpu),
          color: colorFor(chave, i),
        };
      }),
    [produtos, labels, deveOcultarGpu]
  );

  const chartData = useMemo(() => downsample(data, MAX_PONTOS_CHART), [data]);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const ultimoPonto =
    atualizadoEm ??
    (data.length ? String(data[data.length - 1]?.coletadoEm ?? '') || null : null);

  const onChartMouseMove = (state: CategoricalChartState) => {
    setHover(resolverHover(state, chartData, series));
  };

  return (
    <section className="market-panel relative overflow-visible p-5 sm:p-6 hover:z-30">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
          <h3 className="font-display text-xl font-bold tracking-tight">{titulo}</h3>
          {ultimoPonto ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Dados reais até{' '}
              <span className="font-medium text-foreground">{formatDateTime(ultimoPonto)}</span>
              <span className="text-muted-foreground"> · {formatRelativeTime(ultimoPonto)}</span>
            </p>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </div>

      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Sem série no período.</p>
      ) : (
        <LazyChartMount eager={eager} minHeight={288} className="h-72 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%" debounce={120}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              onMouseMove={onChartMouseMove}
              onMouseLeave={() => setHover(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#5b6472' }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                width={52}
                tick={{ fontSize: 11, fill: '#5b6472' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  Number(v).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
                }
              />
              <Tooltip
                shared={false}
                content={<MarketPulseTooltip hover={hover} />}
                wrapperStyle={{ outline: 'none', zIndex: 50 }}
                allowEscapeViewBox={{ x: true, y: true }}
                isAnimationActive={false}
                cursor={{ stroke: '#d9dee7', strokeWidth: 1 }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11, paddingTop: 8, lineHeight: '1.35' }}
              />
              {series.map((s) => {
                const destacada = !hover || hover.chave === s.chave;
                return (
                  <Line
                    key={s.chave}
                    type="monotone"
                    dataKey={s.chave}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={hover?.chave === s.chave ? 2.5 : 2}
                    strokeOpacity={destacada ? 1 : 0.28}
                    connectNulls
                    isAnimationActive={false}
                    dot={false}
                    activeDot={
                      hover?.chave === s.chave
                        ? { r: 5, strokeWidth: 2, stroke: '#fff' }
                        : false
                    }
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </LazyChartMount>
      )}
    </section>
  );
});
