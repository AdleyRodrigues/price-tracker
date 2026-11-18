import { ExternalLink } from 'lucide-react';
import type { SnapshotRow } from '@/lib/api';
import { formatBRL, formatDateTime } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = {
  snapshots: SnapshotRow[];
};

export function HistoryTable({ snapshots }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros</CardTitle>
        <CardDescription>
          Preço, data e loja de cada snapshot ({snapshots.length} no filtro)
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-5">
        {snapshots.length === 0 ? (
          <p className="px-5 text-sm text-muted-foreground sm:px-0">
            Nenhum snapshot neste filtro.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-right">À vista</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Total</TableHead>
                <TableHead className="hidden md:table-cell">Título</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                    {formatDateTime(s.coletadoEm)}
                  </TableCell>
                  <TableCell className="font-medium">{s.loja}</TableCell>
                  <TableCell className="text-right tabular-price">{formatBRL(s.precoAvista)}</TableCell>
                  <TableCell className="hidden text-right tabular-price sm:table-cell">
                    {formatBRL(s.precoTotal)}
                  </TableCell>
                  <TableCell className="hidden max-w-[18rem] truncate md:table-cell" title={s.titulo}>
                    {s.titulo}
                  </TableCell>
                  <TableCell className="text-right">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:text-xs">Abrir</span>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
