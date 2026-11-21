import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL, formatDateShort } from '@/lib/format';

const COLORS = ['#0f6b4c', '#e8913a', '#0369a1', '#be123c', '#0f766e', '#7c3aed'];

type Props = {
  modo: 'minimo' | 'por-loja' | 'candles';
  serie: Array<{ coletadoEm: string; preco: number; loja: string }>;
  seriePorLoja: Array<{ loja: string; pontos: Array<{ coletadoEm: string; preco: number }> }>;
  candles: Array<{ dia: string; min: number; max: number }>;
};

export function PriceTheaterChart({ modo, serie, seriePorLoja, candles }: Props) {
  return (
    <section className="market-panel overflow-hidden p-4 sm:p-6">
      <div className="mb-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Price theater
        </p>
        <h3 className="font-display text-xl font-bold tracking-tight">
          {modo === 'minimo' && 'Menor preço por coleta'}
          {modo === 'por-loja' && 'Comparativo por loja'}
          {modo === 'candles' && 'Faixa diária (mín–máx)'}
        </h3>
      </div>

      <div className="-mx-1 h-72 sm:mx-0 sm:h-[22rem]">
        {modo === 'minimo' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={serie.map((p) => ({ ...p, label: formatDateShort(p.coletadoEm) }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="theaterFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f6b4c" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0f6b4c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5b6472' }} axisLine={false} tickLine={false} />
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
                contentStyle={{ borderRadius: 12, border: '1px solid #d9dee7' }}
                formatter={(value: number) => [formatBRL(value), 'Preço']}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { coletadoEm?: string; loja?: string } | undefined;
                  return row?.coletadoEm
                    ? `${formatDateShort(row.coletadoEm)} · ${row.loja ?? ''}`
                    : '';
                }}
              />
              <Area type="monotone" dataKey="preco" stroke="none" fill="url(#theaterFill)" />
              <Line
                type="monotone"
                dataKey="preco"
                stroke="#0f6b4c"
                strokeWidth={2.75}
                dot={{ r: 2.5, fill: '#0f6b4c' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {modo === 'por-loja' && (() => {
          const timestamps = [
            ...new Set(seriePorLoja.flatMap((s) => s.pontos.map((p) => p.coletadoEm))),
          ].sort();
          const data = timestamps.map((ts) => {
            const row: Record<string, string | number> = {
              coletadoEm: ts,
              label: formatDateShort(ts),
            };
            for (const s of seriePorLoja) {
              const ponto = s.pontos.find((p) => p.coletadoEm === ts);
              if (ponto) row[s.loja] = ponto.preco;
            }
            return row;
          });

          return (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5b6472' }} axisLine={false} tickLine={false} />
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
                  contentStyle={{ borderRadius: 12, border: '1px solid #d9dee7' }}
                  formatter={(value: number) => formatBRL(value)}
                />
                <Legend />
                {seriePorLoja.map((s, i) => (
                  <Line
                    key={s.loja}
                    type="monotone"
                    dataKey={s.loja}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          );
        })()}

        {modo === 'candles' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={candles.map((c) => ({
                ...c,
                label: formatDateShort(`${c.dia}T12:00:00.000Z`),
                range: [c.min, c.max],
              }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d9dee7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5b6472' }} axisLine={false} tickLine={false} />
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
                contentStyle={{ borderRadius: 12, border: '1px solid #d9dee7' }}
                formatter={(value: number | number[], name: string) => {
                  if (Array.isArray(value)) {
                    return [`${formatBRL(value[0])} → ${formatBRL(value[1])}`, 'Faixa'];
                  }
                  return [formatBRL(value), name];
                }}
              />
              <Bar dataKey="range" fill="#0f6b4c" fillOpacity={0.35} radius={[4, 4, 4, 4]} />
              <Line type="monotone" dataKey="min" stroke="#0f6b4c" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="max" stroke="#e8913a" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
