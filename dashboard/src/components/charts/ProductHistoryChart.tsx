import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL, formatDateShort } from '@/lib/format';
import { CompactChartTooltip } from '@/components/charts/CompactChartTooltip';

type Ponto = { coletadoEm: string; preco: number; loja?: string };

type Props = {
  serie: Ponto[];
  precoAtual: number | null;
  minimoHistorico: number | null;
  stroke?: string;
};

/** Gráfico de linha completo — montar só dentro do modal (lazy). */
export function ProductHistoryChart({
  serie,
  precoAtual,
  minimoHistorico,
  stroke = '#0f6b4c',
}: Props) {
  if (serie.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Sem pontos de preço neste intervalo.
      </p>
    );
  }

  const data = serie.map((p) => ({
    ...p,
    label: formatDateShort(p.coletadoEm),
    short: p.loja
      ? `${formatDateShort(p.coletadoEm)} · ${p.loja}`
      : formatDateShort(p.coletadoEm),
  }));

  const minPonto =
    minimoHistorico != null
      ? data.reduce((best, p) => (p.preco <= best.preco ? p : best), data[0]!)
      : null;

  const ultimo = data[data.length - 1]!;

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            width={52}
            tickFormatter={(v) =>
              Number(v).toLocaleString('pt-BR', {
                notation: 'compact',
                maximumFractionDigits: 1,
              })
            }
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={
              <CompactChartTooltip
                metricLabel="Preço"
                formatValue={(v) => formatBRL(v)}
              />
            }
          />
          {precoAtual != null ? (
            <ReferenceLine
              y={precoAtual}
              stroke="#0369a1"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Atual ${formatBRL(precoAtual)}`,
                position: 'insideTopRight',
                fill: '#0369a1',
                fontSize: 11,
              }}
            />
          ) : null}
          {minimoHistorico != null ? (
            <ReferenceLine
              y={minimoHistorico}
              stroke="#0f6b4c"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Mín ${formatBRL(minimoHistorico)}`,
                position: 'insideBottomRight',
                fill: '#0f6b4c',
                fontSize: 11,
              }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="preco"
            name="Preço"
            stroke={stroke}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          {minPonto ? (
            <ReferenceDot
              x={minPonto.label}
              y={minPonto.preco}
              r={5}
              fill="#0f6b4c"
              stroke="#fff"
              strokeWidth={2}
            />
          ) : null}
          {ultimo ? (
            <ReferenceDot
              x={ultimo.label}
              y={ultimo.preco}
              r={5}
              fill="#0369a1"
              stroke="#fff"
              strokeWidth={2}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
