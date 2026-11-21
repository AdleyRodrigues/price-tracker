import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CompactChartTooltip } from '@/components/charts/CompactChartTooltip';
import { LazyChartMount } from '@/components/charts/LazyChartMount';
import { formatPct } from '@/lib/format';

type Props = {
  data: Array<{
    produtoChave: string;
    label: string;
    variacao7d: number | null;
  }>;
};

function eixoCurto(label: string): string {
  if (label.includes(' · ')) return label.split(' · ')[0]!;
  return label.replace('Xiaomi ', '').replace(/^Poco /, 'Poco ');
}

export function MovementChart({ data }: Props) {
  const rows = data
    .filter((d) => d.variacao7d != null)
    .map((d) => ({
      ...d,
      short: eixoCurto(d.label),
      value: d.variacao7d ?? 0,
    }));

  return (
    <section className="market-panel relative overflow-visible p-5 hover:z-30">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Movimento
      </p>
      <h3 className="font-display text-lg font-bold tracking-tight">Variação 7 dias</h3>
      <p className="mt-1 text-sm text-muted-foreground">Quem caiu ou subiu vs baseline recente</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Sem variação calculável ainda.</p>
      ) : (
        <LazyChartMount className="mt-4 h-56 overflow-visible" minHeight={224}>
          <ResponsiveContainer width="100%" height="100%" debounce={150}>
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#5b6472' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="short"
                width={110}
                tick={{ fontSize: 11, fill: '#5b6472' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CompactChartTooltip metricLabel="Δ 7d" formatValue={(v) => formatPct(v)} />}
                cursor={{ fill: 'rgba(15, 107, 76, 0.06)' }}
                wrapperStyle={{ zIndex: 50, outline: 'none' }}
                allowEscapeViewBox={{ x: true, y: true }}
                isAnimationActive={false}
              />
              <Bar dataKey="value" name="Δ 7d" radius={[0, 6, 6, 0]} maxBarSize={28} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.produtoChave} fill={r.value <= 0 ? '#047857' : '#e11d48'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </LazyChartMount>
      )}
    </section>
  );
}
