import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
    <motion.section
      className="market-panel p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.45 }}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Cobertura
      </p>
      <h3 className="font-display text-lg font-bold tracking-tight">Volume de snapshots</h3>
      <p className="mt-1 text-sm text-muted-foreground">Quantidade de registros por produto</p>

      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" vertical={false} />
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
              contentStyle={{ borderRadius: 12, border: '1px solid #d9dee7', maxWidth: 360 }}
              formatter={(value: number, _name, item) => {
                const full = (item?.payload as { label?: string } | undefined)?.label;
                return [value, full ?? 'Snapshots'];
              }}
            />
            <Bar dataKey="totalSnapshots" fill="#0f6b4c" radius={[8, 8, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
