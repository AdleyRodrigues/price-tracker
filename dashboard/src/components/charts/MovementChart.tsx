import { motion } from 'framer-motion';
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
    <motion.section
      className="market-panel p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.45 }}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Movimento
      </p>
      <h3 className="font-display text-lg font-bold tracking-tight">Variação 7 dias</h3>
      <p className="mt-1 text-sm text-muted-foreground">Quem caiu ou subiu vs baseline recente</p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Sem variação calculável ainda.</p>
      ) : (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" horizontal={false} />
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
                contentStyle={{ borderRadius: 12, border: '1px solid #d9dee7', maxWidth: 360 }}
                formatter={(value: number, _name, item) => {
                  const full = (item?.payload as { label?: string } | undefined)?.label;
                  return [formatPct(value), full ?? 'Δ 7d'];
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {rows.map((r) => (
                  <Cell
                    key={r.produtoChave}
                    fill={r.value <= 0 ? '#047857' : '#e11d48'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.section>
  );
}
