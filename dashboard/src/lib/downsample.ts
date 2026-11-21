/** Reduz pontos de série para o Recharts não explodir o SVG no scroll. */
export function downsample<T>(data: T[], maxPoints: number): T[] {
  if (maxPoints < 2 || data.length <= maxPoints) return data;
  const out: T[] = [];
  const last = data.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i / (maxPoints - 1)) * last);
    out.push(data[idx]!);
  }
  return out;
}
