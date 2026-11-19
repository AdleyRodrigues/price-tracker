const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateShort = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

export function formatBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return currency.format(value);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return dateTime.format(d);
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateShort.format(d);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** Ex.: "há 2 horas", "há 1 dia". */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return formatDateTime(iso);

  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;

  const days = Math.floor(h / 24);
  if (days === 1) return 'há 1 dia';
  if (days < 30) return `há ${days} dias`;

  return formatDateTime(iso);
}
