import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchInsights, type OverviewInsightsResponse } from '@/lib/api';
import { MarketPulseChart } from '@/components/charts/MarketPulseChart';
import { InsightRail } from '@/components/insights/InsightRail';
import { CostBenefitRanking } from '@/components/market/CostBenefitRanking';
import { KpiTheater } from '@/components/market/KpiTheater';
import { ProductMarketCard } from '@/components/market/ProductMarketCard';
import { ScraperStatusBadge } from '@/components/market/ScraperStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  classificarNotebook,
  ehMarcaPremium,
  ehNotebookPermitido,
  foraDoOrcamento,
} from '@/lib/serie-notebook';
import { labelModulo, parseModulo } from '@/lib/modulo';
import { calcularDestaques4k } from '@/lib/custo-beneficio';
import { cn } from '@/lib/utils';

type SegmentoGrafico = 'todos' | '5060-full' | '5060-slim' | '5050' | '4060';
type MarcaFiltro =
  | 'todas'
  | 'ASUS'
  | 'Avell'
  | 'Acer'
  | 'Dell'
  | 'Alienware'
  | 'Gigabyte';

const MARCAS_COMUNS = ['todas', 'ASUS', 'Avell', 'Acer'] as const;
const MARCAS_PREMIUM = ['Dell', 'Alienware', 'Gigabyte'] as const;

const GPU_TABS = [
  { id: 'todos' as const, label: 'Todas' },
  { id: '5060-full' as const, label: 'RTX 5060 Full' },
  { id: '5060-slim' as const, label: '5060 <110W' },
  { id: '5050' as const, label: 'RTX 5050' },
  { id: '4060' as const, label: 'RTX 4060' },
];

function toggleClass(active: boolean) {
  return cn(
    'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150',
    active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
  );
}

export function OverviewPage() {
  const [params] = useSearchParams();
  const modulo = parseModulo(params.get('modulo'));
  const [dias, setDias] = useState('90');
  const [data, setData] = useState<OverviewInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [segmentoFiltro, setSegmentoFiltro] = useState<SegmentoGrafico>('todos');
  const [marcaFiltro, setMarcaFiltro] = useState<MarcaFiltro>('todas');
  const [apenasTgpAlto, setApenasTgpAlto] = useState(false);
  const [apenasOrcamento, setApenasOrcamento] = useState(true);
  const [mostrarPremium, setMostrarPremium] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInsights(modulo, Number(dias))
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar overview');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dias, modulo]);

  const labelsByChave = useMemo(
    () => Object.fromEntries((data?.produtos ?? []).map((p) => [p.produtoChave, p.label])),
    [data]
  );

  const produtosFiltrados = useMemo(() => {
    if (!data) return [];
    if (modulo !== 'notebooks') return data.produtos;
    return data.produtos.filter((p) => ehNotebookPermitido(p.produtoChave, p.label));
  }, [data, modulo]);

  const seriesKeys = useMemo(() => {
    if (!data) return [];
    const raw = data.seriesKeys?.length
      ? data.seriesKeys
      : data.produtos.map((p) => p.produtoChave);
    if (modulo !== 'notebooks') return raw;
    return raw.filter((k) => ehNotebookPermitido(k, labelsByChave[k]));
  }, [data, modulo, labelsByChave]);

  const produtosGridExibidos = useMemo(() => {
    if (modulo !== 'notebooks') return produtosFiltrados;
    return produtosFiltrados.filter((p) => {
      const cls = classificarNotebook(p.produtoChave, p.label);
      const premiumMarca = ehMarcaPremium(cls.marca);
      const acimaTeto = foraDoOrcamento(p.menorPreco);

      if (mostrarPremium) {
        if (!premiumMarca && !acimaTeto) return false;
      } else {
        if (premiumMarca) return false;
        if (acimaTeto || (apenasOrcamento && p.menorPreco != null && p.menorPreco > 9000))
          return false;
      }

      if (marcaFiltro !== 'todas' && cls.marca !== marcaFiltro) return false;
      if (apenasTgpAlto && cls.tgpWatts < 110) return false;
      if (segmentoFiltro === '5060-full' && (cls.gpu !== '5060' || cls.categoriaTgp !== 'full_power'))
        return false;
      if (segmentoFiltro === '5060-slim' && (cls.gpu !== '5060' || cls.categoriaTgp === 'full_power'))
        return false;
      if (segmentoFiltro === '5050' && cls.gpu !== '5050') return false;
      if (segmentoFiltro === '4060' && cls.gpu !== '4060') return false;
      return true;
    });
  }, [
    produtosFiltrados,
    modulo,
    marcaFiltro,
    apenasTgpAlto,
    apenasOrcamento,
    mostrarPremium,
    segmentoFiltro,
  ]);

  const destaques4k = useMemo(() => {
    if (modulo !== 'notebooks') return null;
    return calcularDestaques4k(produtosGridExibidos);
  }, [modulo, produtosGridExibidos]);

  const notebookCharts = useMemo(() => {
    if (modulo !== 'notebooks') return [];
    const buckets: Array<{
      id: string;
      eyebrow: string;
      titulo: string;
      keys: string[];
    }> = [
        {
          id: '5060',
          eyebrow: 'Market pulse · RTX 5060',
          titulo: 'Menor preço — RTX 5060',
          keys: [],
        },
        {
          id: '5050',
          eyebrow: 'Market pulse · RTX 5050',
          titulo: 'Menor preço — RTX 5050',
          keys: [],
        },
        {
          id: '4060',
          eyebrow: 'Market pulse · RTX 4060',
          titulo: 'Menor preço — RTX 4060',
          keys: [],
        },
      ];
    for (const p of produtosGridExibidos) {
      const gpu = classificarNotebook(p.produtoChave, p.label).gpu;
      const bucket = buckets.find((b) => b.id === gpu);
      if (bucket) bucket.keys.push(p.produtoChave);
    }
    return buckets.filter((b) => b.keys.length > 0);
  }, [modulo, produtosGridExibidos]);

  const alerta8gb = destaques4k?.alerta8gb;

  function limparFiltros() {
    setSegmentoFiltro('todos');
    setMarcaFiltro('todas');
    setApenasTgpAlto(false);
    setApenasOrcamento(true);
    setMostrarPremium(false);
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div key={modulo} className="max-w-2xl space-y-3">
          <p className="text-eyebrow">Decisão de compra</p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {modulo === 'notebooks' ? 'Qual notebook comprar?' : 'Market Pulse'}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
            {modulo === 'notebooks'
              ? 'Custo-benefício para 4K na TV via HDMI — compare preço atual com o mínimo da janela.'
              : `Tendências e insights de ${labelModulo(modulo).toLowerCase()} monitorados.`}
          </p>
          <ScraperStatusBadge atualizadoEm={data?.kpis.ultimaColeta} />
        </div>

        <label className="grid w-full gap-1.5 text-sm sm:w-44">
          <span className="text-eyebrow">Janela de preço</span>
          <Select value={dias} onValueChange={setDias}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>

      {error ? (
        <div className="market-panel border-destructive/40 p-4 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {data?.warning ? <div className="panel-warn">{data.warning}</div> : null}

      {loading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-52 rounded-lg" />
            <Skeleton className="h-52 rounded-lg" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <>
          <KpiTheater kpis={data.kpis} modulo={modulo} destaques4k={destaques4k} />

          {modulo === 'notebooks' && alerta8gb ? (
            <div className="panel-warn">
              <span className="font-bold">Atenção:</span> {alerta8gb.modelo} com 8 GB de RAM — em
              4K o upgrade de memória (~R$ 200) é praticamente obrigatório.
            </div>
          ) : null}

          {modulo === 'notebooks' ? (
            <div className="space-y-5">
              <div className="market-panel space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-eyebrow">Filtros</p>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {produtosGridExibidos.length} de {produtosFiltrados.length} modelos
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    GPU
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {GPU_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSegmentoFiltro(tab.id)}
                        className={toggleClass(segmentoFiltro === tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Marca e restrições
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {MARCAS_COMUNS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMarcaFiltro(m)}
                        className={toggleClass(marcaFiltro === m)}
                      >
                        {m === 'todas' ? 'Todas' : m}
                      </button>
                    ))}

                    {mostrarPremium
                      ? MARCAS_PREMIUM.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMarcaFiltro(m)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                            marcaFiltro === m
                              ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                              : 'border-border bg-card text-foreground hover:border-accent/50'
                          )}
                        >
                          {m}
                        </button>
                      ))
                      : null}

                    <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" aria-hidden />

                    <button
                      type="button"
                      onClick={() => {
                        setMostrarPremium((v) => {
                          const next = !v;
                          if (next) {
                            setApenasOrcamento(false);
                            setMarcaFiltro('todas');
                          } else if (
                            marcaFiltro === 'Dell' ||
                            marcaFiltro === 'Alienware' ||
                            marcaFiltro === 'Gigabyte'
                          ) {
                            setMarcaFiltro('todas');
                            setApenasOrcamento(true);
                          }
                          return next;
                        });
                      }}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150',
                        mostrarPremium
                          ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground'
                      )}
                    >
                      {mostrarPremium ? 'Premium ativo' : 'Premium / Fora do orçamento'}
                    </button>

                    {!mostrarPremium ? (
                      <button
                        type="button"
                        onClick={() => setApenasOrcamento(!apenasOrcamento)}
                        className={toggleClass(apenasOrcamento)}
                      >
                        Até R$ 9.000
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setApenasTgpAlto(!apenasTgpAlto)}
                      className={toggleClass(apenasTgpAlto)}
                    >
                      TGP ≥ 110W
                    </button>
                  </div>
                </div>
              </div>

              <CostBenefitRanking
                produtos={produtosGridExibidos}
                marcaAtiva={marcaFiltro === 'todas' ? null : marcaFiltro}
              />

              {notebookCharts.map((chart) => (
                <MarketPulseChart
                  key={chart.id}
                  data={data.seriesComparativo}
                  produtos={chart.keys}
                  labels={labelsByChave}
                  eyebrow={chart.eyebrow}
                  titulo={chart.titulo}
                  subtitulo={`${chart.keys.length} modelo(s) · janela de ${dias} dias`}
                  ocultarGpu
                  atualizadoEm={data.kpis.ultimaColeta}
                />
              ))}
            </div>
          ) : (
            <MarketPulseChart
              data={data.seriesComparativo}
              produtos={seriesKeys}
              labels={labelsByChave}
              subtitulo={`${seriesKeys.length} celulares · uma linha por modelo · ${dias} dias`}
              atualizadoEm={data.kpis.ultimaColeta}
            />
          )}

          <InsightRail insights={data.insights} />

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight text-ink">
                  {modulo === 'notebooks' ? 'Comparar ofertas' : 'Produtos'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Preço atual vs mínimo da janela — a diferença é o sinal de compra.
                </p>
              </div>
              {modulo === 'notebooks' ? (
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                  {produtosGridExibidos.length} de {produtosFiltrados.length}
                </span>
              ) : null}
            </div>
            {produtosGridExibidos.length === 0 ? (
              <div className="market-panel p-8 text-sm text-muted-foreground">
                {marcaFiltro !== 'todas'
                  ? `Nenhum ${marcaFiltro} com os filtros atuais.`
                  : 'Nenhum modelo corresponde aos filtros.'}{' '}
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {produtosGridExibidos.map((p, i) => (
                  <ProductMarketCard key={p.produtoChave} {...p} index={i} modulo={modulo} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
