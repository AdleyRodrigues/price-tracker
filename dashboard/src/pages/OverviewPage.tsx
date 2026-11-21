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

type SegmentoGrafico = 'todos' | '5060-full' | '5060-slim' | '5050' | '4060';
type MarcaFiltro =
  | 'todas'
  | 'ASUS'
  | 'Avell'
  | 'Lenovo'
  | 'Acer'
  | 'Dell'
  | 'Alienware'
  | 'Gigabyte';

const MARCAS_PADRAO = ['todas', 'ASUS', 'Avell', 'Lenovo', 'Acer'] as const;
const MARCAS_COM_PREMIUM = [
  'todas',
  'ASUS',
  'Avell',
  'Lenovo',
  'Acer',
  'Dell',
  'Alienware',
  'Gigabyte',
] as const;

export function OverviewPage() {
  const [params] = useSearchParams();
  const modulo = parseModulo(params.get('modulo'));
  const [dias, setDias] = useState('30');
  const [data, setData] = useState<OverviewInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [segmentoFiltro, setSegmentoFiltro] = useState<SegmentoGrafico>('todos');
  const [marcaFiltro, setMarcaFiltro] = useState<MarcaFiltro>('todas');
  const [apenasTgpAlto, setApenasTgpAlto] = useState(false);
  const [apenasOrcamento, setApenasOrcamento] = useState(true);
  /** Off = só até R$ 9k e sem Dell/Alienware/Gigabyte. On = só premium / > R$ 9k. */
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

  /** Filtros da barra (GPU / marca / orçamento / premium / TGP) — ranking, KPIs e cards. */
  const produtosGridExibidos = useMemo(() => {
    if (modulo !== 'notebooks') return produtosFiltrados;
    return produtosFiltrados.filter((p) => {
      const cls = classificarNotebook(p.produtoChave, p.label);
      const premiumMarca = ehMarcaPremium(cls.marca);
      const acimaTeto = foraDoOrcamento(p.menorPreco);

      if (mostrarPremium) {
        // Só Dell/Alienware/Gigabyte e/ou acima de R$ 9.000
        if (!premiumMarca && !acimaTeto) return false;
      } else {
        // Pódio padrão: sem marcas premium e até R$ 9k
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

  const alerta8gb = destaques4k?.alerta8gb;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div key={modulo} className="space-y-3">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Decisão de compra
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {modulo === 'notebooks' ? 'Qual notebook comprar?' : 'Market Pulse'}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {modulo === 'notebooks'
              ? 'Ranking de custo-benefício para jogar em TV 4K via HDMI — foque no preço atual vs o mínimo da janela.'
              : `Tendências e insights de ${labelModulo(modulo).toLowerCase()} monitorados.`}
          </p>
          <ScraperStatusBadge atualizadoEm={data?.kpis.ultimaColeta} />
        </div>

        <label className="grid w-full gap-1.5 text-sm sm:w-40">
          <span className="text-muted-foreground">Janela de preço</span>
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
        <div className="market-panel border-destructive/30 p-4 text-sm text-destructive">{error}</div>
      ) : null}

      {data?.warning ? (
        <div className="market-panel border-warning/30 bg-warning/5 p-4 text-sm text-warning">
          {data.warning}
        </div>
      ) : null}

      {loading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <>
          <KpiTheater kpis={data.kpis} modulo={modulo} destaques4k={destaques4k} />

          {modulo === 'notebooks' && alerta8gb ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900">
              <span className="font-semibold">Atenção:</span> {alerta8gb.modelo} com 8 GB de RAM —
              em 4K o upgrade de memória (~R$ 200) é praticamente obrigatório.
            </div>
          ) : null}

          {modulo === 'notebooks' ? (
            <div className="space-y-4">
              <div className="market-panel flex flex-col gap-3.5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    GPU:
                  </span>
                  {(
                    [
                      { id: 'todos', label: 'Todas' },
                      { id: '5060-full', label: 'RTX 5060 Full' },
                      { id: '5060-slim', label: '5060 <110W' },
                      { id: '5050', label: 'RTX 5050' },
                      { id: '4060', label: 'RTX 4060' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSegmentoFiltro(tab.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${segmentoFiltro === tab.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="inline-flex max-w-full flex-wrap rounded-lg border bg-muted/20 p-0.5 text-xs">
                    {(mostrarPremium ? MARCAS_COM_PREMIUM : MARCAS_PADRAO).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMarcaFiltro(m)}
                        className={`rounded px-2.5 py-1 font-medium transition ${marcaFiltro === m
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        {m === 'todas' ? 'Todas' : m}
                      </button>
                    ))}
                  </div>

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
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${mostrarPremium
                      ? 'border-amber-600/50 bg-amber-500/15 text-amber-900 shadow-sm dark:text-amber-200'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Premium / Fora do Orçamento
                  </button>
                  {!mostrarPremium ? (
                    <button
                      type="button"
                      onClick={() => setApenasOrcamento(!apenasOrcamento)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${apenasOrcamento
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Até R$ 9.000
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setApenasTgpAlto(!apenasTgpAlto)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${apenasTgpAlto
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    TGP ≥ 110W
                  </button>
                </div>
              </div>

              <CostBenefitRanking
                produtos={produtosGridExibidos}
                marcaAtiva={marcaFiltro === 'todas' ? null : marcaFiltro}
              />
            </div>
          ) : (
            <MarketPulseChart
              data={data.seriesComparativo}
              produtos={seriesKeys}
              labels={labelsByChave}
              subtitulo={`${seriesKeys.length} celulares · uma linha por modelo`}
              atualizadoEm={data.kpis.ultimaColeta}
            />
          )}

          <InsightRail insights={data.insights} />

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {modulo === 'notebooks' ? 'Comparar ofertas' : 'Produtos'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Preço atual vs mínimo da janela — a diferença é o sinal de compra.
                </p>
              </div>
              {modulo === 'notebooks' ? (
                <span className="shrink-0 text-xs text-muted-foreground">
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
                  onClick={() => {
                    setSegmentoFiltro('todos');
                    setMarcaFiltro('todas');
                    setApenasTgpAlto(false);
                    setApenasOrcamento(true);
                    setMostrarPremium(false);
                  }}
                  className="font-semibold text-primary underline"
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
