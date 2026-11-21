import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CompactChartTooltip } from '@/components/charts/CompactChartTooltip';
import { LazyChartMount } from '@/components/charts/LazyChartMount';

type Props = {
  data: Array<{
    produtoChave: string;
    label: string;
    totalSnapshots: number;
  }>;
};

function eixoCurto(label: string): string {
  if (label.includes(' · ')) return label.split(' · ')[0]!;
  return label.replace('Xiaomi ', '').replace(/^Poco /, 'Poco ');
}

export function SnapshotsVolumeChart({ data }: Props) {
  const rows = data.map((d) => ({
    ...d,
    short: eixoCurto(d.label),
  }));

  return (
    <section className="market-panel relative overflow-visible p-5 hover:z-30">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Cobertura
      </p>
      <h3 className="font-display text-lg font-bold tracking-tight">Volume de snapshots</h3>
      <p className="mt-1 text-sm text-muted-foreground">Quantidade de registros por produto</p>

      <LazyChartMount className="mt-4 h-56 overflow-visible" minHeight={224}>
        <ResponsiveContainer width="100%" height="100%" debounce={150}>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="short"
              tick={{ fontSize: 11, fill: '#5b6472' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={40}
              tick={{ fontSize: 11, fill: '#5b6472' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={
                <CompactChartTooltip
                  metricLabel="Snapshots"
                  formatValue={(v) => v.toLocaleString('pt-BR')}
                />
              }
              cursor={{ fill: 'rgba(15, 107, 76, 0.06)' }}
              wrapperStyle={{ zIndex: 50, outline: 'none' }}
              allowEscapeViewBox={{ x: true, y: true }}
              isAnimationActive={false}
            />
            <Bar
              dataKey="totalSnapshots"
              name="Snapshots"
              fill="#0f6b4c"
              radius={[8, 8, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </LazyChartMount>
    </section>
  );
}
