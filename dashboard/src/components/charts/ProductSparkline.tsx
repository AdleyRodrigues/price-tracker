type Props = {
  data: Array<{ coletadoEm: string; preco: number }>;
  stroke?: string;
};

/**
 * Sparkline SVG puro — sem ResponsiveContainer/Recharts.
 * Cada card deixava um ResizeObserver ativo; N cards = jank no scroll.
 */
export function ProductSparkline({ data, stroke = '#0f6b4c' }: Props) {
  if (data.length < 2) {
    return <div className="h-12 w-full rounded-md bg-muted/50" />;
  }

  const w = 144;
  const h = 48;
  const pad = 2;
  const prices = data.map((d) => d.preco);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const coords = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((d.preco - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gradId = `spark-${stroke.replace('#', '')}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-12 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
