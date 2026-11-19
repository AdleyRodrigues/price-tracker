import { motion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  Legend,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL, formatDateTime, formatRelativeTime } from '@/lib/format';

const PALETTE = ['#0f6b4c', '#e8913a', '#0369a1', '#be123c', '#0f766e', '#a16207', '#4f46e5', '#db2777'];

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
  /** Labels ricos (SKU · CPU · RAM · GPU) por produto_chave. */
  labels?: Record<string, string>;
  titulo?: string;
  subtitulo?: string;
  eyebrow?: string;
  /** Último snapshot real usado no gráfico. */
  atualizadoEm?: string | null;
};

export function MarketPulseChart({
  data,
  produtos,
  labels = {},
  titulo = 'Menor preço por coleta',
  subtitulo = 'Uma linha por modelo',
  eyebrow = 'Market pulse',
  atualizadoEm = null,
}: Props) {
  const series = produtos.map((chave, i) => ({
    chave,
    label: labels[chave] ?? chave,
    color: colorFor(chave, i),
  }));

  const ultimoPonto =
    atualizadoEm ??
    (data.length ? String(data[data.length - 1]?.coletadoEm ?? '') || null : null);

  return (
    <motion.section
      className="market-panel p-5 sm:p-6"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="h-80 w-full sm:h-[28rem]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.chave} id={`fill-${s.chave}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#5b6472' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: '#5b6472' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  Number(v).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #d9dee7',
                  boxShadow: '0 12px 30px -18px rgba(11,18,32,0.4)',
                  maxWidth: 420,
                }}
                formatter={(value: number, name: string) => [formatBRL(value), name]}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11, paddingTop: 12, lineHeight: '1.35' }}
              />
              {series.map((s, i) => (
                <Area
                  key={s.chave}
                  type="monotone"
                  dataKey={s.chave}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fill={`url(#fill-${s.chave})`}
                  connectNulls
                  isAnimationActive={i === 0}
                  activeDot={{ r: 5 }}
                  dot={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.section>
  );
}
