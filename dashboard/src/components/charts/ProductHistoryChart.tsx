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

  const precos = data.map((p) => p.preco);
  if (precoAtual != null) precos.push(precoAtual);
  if (minimoHistorico != null) precos.push(minimoHistorico);
  const yMin = Math.min(...precos);
  const yMax = Math.max(...precos);
  const pad = Math.max((yMax - yMin) * 0.12, yMin * 0.02, 50);
  const domain: [number, number] = [Math.max(0, yMin - pad), yMax + pad];

  const atualEqMinimo =
    precoAtual != null &&
    minimoHistorico != null &&
    Math.abs(precoAtual - minimoHistorico) < 1;

  return (
    <div className="h-72 w-full min-w-0 sm:h-80">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 28, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            interval="preserveStartEnd"
            minTickGap={28}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            width={56}
            domain={domain}
            tickFormatter={(v) =>
              Number(v).toLocaleString('pt-BR', {
                notation: 'compact',
                maximumFractionDigits: 1,
              })
            }
          />
          <Tooltip
            content={
              <CompactChartTooltip
                metricLabel="Preço"
                formatValue={(v) => formatBRL(v)}
              />
            }
          />
          {atualEqMinimo && precoAtual != null ? (
            <ReferenceLine
              y={precoAtual}
              stroke="#0f6b4c"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Atual = mín ${formatBRL(precoAtual)}`,
                position: 'insideTopRight',
                fill: '#0f6b4c',
                fontSize: 11,
              }}
            />
          ) : (
            <>
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
            </>
          )}
          <Line
            type="monotone"
            dataKey="preco"
            name="Preço"
            stroke={stroke}
            strokeWidth={2.5}
            dot={data.length < 4 ? { r: 4, strokeWidth: 0, fill: stroke } : false}
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
          {ultimo && (!minPonto || ultimo.coletadoEm !== minPonto.coletadoEm) ? (
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
