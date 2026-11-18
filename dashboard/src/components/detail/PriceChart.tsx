import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatBRL, formatDateShort } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SeriePonto = { coletadoEm: string; preco: number; loja: string };
type SerieLoja = { loja: string; pontos: Array<{ coletadoEm: string; preco: number }> };

const COLORS = ['#0f6b4c', '#d97706', '#0369a1', '#7c3aed', '#be123c', '#0f766e'];

type Props = {
  serie: SeriePonto[];
  seriePorLoja: SerieLoja[];
  modo: 'minimo' | 'por-loja';
};

export function PriceChart({ serie, seriePorLoja, modo }: Props) {
  if (serie.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de preço</CardTitle>
          <CardDescription>Sem pontos no intervalo selecionado.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (modo === 'minimo') {
    const data = serie.map((p) => ({
      ...p,
      label: formatDateShort(p.coletadoEm),
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Menor preço por coleta</CardTitle>
          <CardDescription>Menor valor à vista encontrado em cada varredura</CardDescription>
        </CardHeader>
        <CardContent className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dfd8" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#5c6b63" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#5c6b63"
                tickFormatter={(v) =>
                  Number(v).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
                }
                width={56}
              />
              <Tooltip
                formatter={(value: number) => [formatBRL(value), 'Preço']}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as SeriePonto | undefined;
                  return row ? `${formatDateShort(row.coletadoEm)} · ${row.loja}` : '';
                }}
              />
              <Line
                type="monotone"
                dataKey="preco"
                stroke="#0f6b4c"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  const timestamps = [...new Set(seriePorLoja.flatMap((s) => s.pontos.map((p) => p.coletadoEm)))].sort();
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
    <Card>
      <CardHeader>
        <CardTitle>Preço por loja</CardTitle>
        <CardDescription>Comparativo entre lojas no intervalo</CardDescription>
      </CardHeader>
      <CardContent className="h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d5dfd8" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#5c6b63" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#5c6b63"
              tickFormatter={(v) =>
                Number(v).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
              }
              width={56}
            />
            <Tooltip formatter={(value: number) => formatBRL(value)} />
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
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
