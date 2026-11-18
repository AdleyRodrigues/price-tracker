import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export type RangeKey = '7' | '30' | '90';

type Props = {
  lojas: string[];
  loja: string;
  onLojaChange: (value: string) => void;
  range: RangeKey;
  onRangeChange: (value: RangeKey) => void;
  chartMode: 'minimo' | 'por-loja';
  onChartModeChange: (value: 'minimo' | 'por-loja') => void;
};

function FiltersFields(props: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="grid gap-1.5 text-sm">
        <span className="text-muted-foreground">Intervalo</span>
        <Select value={props.range} onValueChange={(v) => props.onRangeChange(v as RangeKey)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-muted-foreground">Loja</span>
        <Select value={props.loja} onValueChange={props.onLojaChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {props.lojas.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-muted-foreground">Gráfico</span>
        <Select
          value={props.chartMode}
          onValueChange={(v) => props.onChartModeChange(v as 'minimo' | 'por-loja')}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minimo">Menor preço</SelectItem>
            <SelectItem value="por-loja">Por loja</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}

export function FiltersBar(props: Props) {
  return (
    <>
      <div className="hidden sm:block">
        <FiltersFields {...props} />
      </div>
      <div className="sm:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <FiltersFields {...props} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
