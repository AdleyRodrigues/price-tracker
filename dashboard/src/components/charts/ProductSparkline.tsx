import { Area, AreaChart, ResponsiveContainer } from 'recharts';

type Props = {
  data: Array<{ coletadoEm: string; preco: number }>;
  stroke?: string;
};

export function ProductSparkline({ data, stroke = '#0f6b4c' }: Props) {
  if (data.length < 2) {
    return <div className="h-12 w-full rounded-md bg-muted/50" />;
  }

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${stroke.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="preco"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#spark-${stroke.replace('#', '')})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
