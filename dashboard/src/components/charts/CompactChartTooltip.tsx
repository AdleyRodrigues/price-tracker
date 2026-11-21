type PayloadItem = {
  value?: number | string | null;
  name?: string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

type Props = {
  active?: boolean;
  label?: string | number;
  payload?: PayloadItem[];
  /** Formata o valor numérico (ex.: % ou inteiro). */
  formatValue?: (value: number, item: PayloadItem) => string;
  /** Nome curto da métrica (ex.: "Snapshots", "Δ 7d"). */
  metricLabel?: string | ((item: PayloadItem) => string);
};

function tituloCurto(label: string | number | undefined, itens: PayloadItem[]): string {
  const row = itens[0]?.payload;
  const short = typeof row?.short === 'string' ? row.short : null;
  if (short?.trim()) return short;

  const full = typeof row?.label === 'string' ? row.label : label != null ? String(label) : '';
  if (!full) return '';
  if (full.includes(' · ')) return full.split(' · ')[0]!;
  return full;
}

/**
 * Tooltip opaco e estreito para Recharts.
 * Evita o default que cola o label longo como "name" e estoura nos cards vizinhos.
 */
export function CompactChartTooltip({
  active,
  label,
  payload,
  formatValue,
  metricLabel = 'Valor',
}: Props) {
  if (!active || !payload?.length) return null;

  const itens = payload.filter((p) => p.value != null && Number.isFinite(Number(p.value)));
  if (!itens.length) return null;

  const titulo = tituloCurto(label, itens);

  return (
    <div
      className="pointer-events-none max-w-[12.5rem] rounded-lg border border-border px-2.5 py-1.5 text-xs shadow-md"
      style={{ backgroundColor: '#ffffff' }}
    >
      {titulo ? (
        <p className="mb-1 truncate font-semibold text-foreground" title={titulo}>
          {titulo}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {itens.map((item) => {
          const metric =
            typeof metricLabel === 'function' ? metricLabel(item) : metricLabel;
          const raw = Number(item.value);
          const texto = formatValue ? formatValue(raw, item) : String(item.value);
          return (
            <li
              key={String(item.dataKey ?? item.name)}
              className="flex items-baseline justify-between gap-3 tabular-nums"
            >
              <span className="shrink-0 text-muted-foreground">{metric}</span>
              <span className="font-semibold" style={{ color: item.color || undefined }}>
                {texto}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
