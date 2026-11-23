import { memo, useMemo } from 'react';
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
import { LazyChartMount } from '@/components/charts/LazyChartMount';
import { downsample } from '@/lib/downsample';
import { formatBRL, formatDateTime, formatRelativeTime } from '@/lib/format';

const PALETTE = ['#0f6b4c', '#e8913a', '#0369a1', '#be123c', '#0f766e', '#a16207', '#155e75', '#9a3412'];
const MAX_PONTOS_CHART = 48;

function colorFor(chave: string, index: number): string {
  const known: Record<string, string> = {
    poco_x8_pro_max: PALETTE[0]!,
    xiaomi_15t_pro: PALETTE[1]!,
    xiaomi_17t_pro: PALETTE[2]!,
  };
  return known[chave] ?? PALETTE[index % PALETTE.length]!;
}

type Row = { coletadoEm: string; label: string;[key: string]: string | number | null };

type Props = {
  data: Row[];
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

type SerieInfo = { chave: string; label: string; color: string; pontosReais: number };

/**
 * Propaga o último preço conhecido de cada série (após a 1ª observação).
 * Sem isso, marcas novas (1–2 snapshots) somem no downsample de 90 dias.
 */
function forwardFill(data: Row[], chaves: string[]): Row[] {
  const last = new Map<string, number>();
  return data.map((row) => {
    const next: Row = { ...row };
    for (const chave of chaves) {
      const raw = row[chave];
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (raw != null && Number.isFinite(n) && n > 0) {
        last.set(chave, n);
        next[chave] = n;
      } else if (last.has(chave)) {
        next[chave] = last.get(chave)!;
      } else {
        next[chave] = null;
      }
    }
    return next;
  });
}

type PayloadItem = {
  value?: number | string | null;
  name?: string;
  color?: string;
  dataKey?: string | number;
};

/** Tooltip compartilhado: todos os modelos na data sob o cursor. */
function MarketPulseTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: PayloadItem[];
}) {
  if (!active || !payload?.length) return null;

  const itens = payload
    .filter((p) => p.value != null && Number.isFinite(Number(p.value)) && Number(p.value) > 0)
    .map((p) => ({
      nome: String(p.name ?? p.dataKey ?? ''),
      valor: Number(p.value),
      color: String(p.color ?? '#0f6b4c'),
      key: String(p.dataKey ?? p.name ?? ''),
    }))
    .sort((a, b) => a.valor - b.valor);

  if (!itens.length) return null;

  return (
    <div
      className="pointer-events-none z-[60] max-w-[16rem] rounded-lg border border-border px-2.5 py-1.5 text-xs shadow-md"
      style={{ backgroundColor: '#ffffff' }}
    >
      {label != null ? (
        <p className="mb-1.5 truncate font-semibold text-foreground">{String(label)}</p>
      ) : null}
      <ul className="space-y-1">
        {itens.map((item) => (
          <li key={item.key} className="flex items-baseline justify-between gap-3">
            <span
              className="min-w-0 truncate font-medium leading-snug"
              style={{ color: item.color }}
              title={item.nome}
            >
              {item.nome}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-foreground">
              {formatBRL(item.valor)}
            </span>
          </li>
        ))}
      </ul>
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

  const series = useMemo<SerieInfo[]>(
    () =>
      produtos.map((chave, i) => {
        const rawLabel = labels[chave] ?? chave;
        let pontosReais = 0;
        for (const row of data) {
          const v = row[chave];
          if (v != null && Number.isFinite(Number(v)) && Number(v) > 0) pontosReais += 1;
        }
        return {
          chave,
          label: formatarLabelSeries(rawLabel, deveOcultarGpu),
          color: colorFor(chave, i),
          pontosReais,
        };
      }),
    [produtos, labels, deveOcultarGpu, data]
  );

  const chartData = useMemo(() => {
    const filled = forwardFill(data, produtos);
    return downsample(filled, MAX_PONTOS_CHART);
  }, [data, produtos]);

  const ultimoPonto =
    atualizadoEm ??
    (data.length ? String(data[data.length - 1]?.coletadoEm ?? '') || null : null);

  return (
    <section className="market-panel relative overflow-visible p-5 sm:p-6 hover:z-30">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-eyebrow">{eyebrow}</p>
          <h3 className="mt-1 font-display text-xl font-bold tracking-tight text-ink">{titulo}</h3>
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
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
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
                shared
                content={<MarketPulseTooltip />}
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
                const esparsa = s.pontosReais < 4;
                return (
                  <Line
                    key={s.chave}
                    type="monotone"
                    dataKey={s.chave}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    connectNulls
                    isAnimationActive={false}
                    dot={esparsa ? { r: 3, strokeWidth: 0, fill: s.color } : false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
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
