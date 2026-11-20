import { Link, Outlet, useSearchParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { labelModulo, parseModulo, subtituloModulo, type ModuloDash } from '@/lib/modulo';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [params, setParams] = useSearchParams();
  const modulo = parseModulo(params.get('modulo'));

  useDocumentTitle(modulo === 'notebooks' ? 'Notebooks ASUS TUF' : 'Smartphones Xiaomi');

  function setModulo(next: ModuloDash) {
    const nextParams = new URLSearchParams(params);
    if (next === 'celular') nextParams.delete('modulo');
    else nextParams.set('modulo', next);
    setParams(nextParams, { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <Link to={modulo === 'celular' ? '/' : `/?modulo=${modulo}`} className="group flex items-start gap-3">
          <span className="mt-1 flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-[1.04]">
            <Activity className="h-5 w-5 text-accent" />
          </span>
          <div>
            <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Price History
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {labelModulo(modulo)}
            </h1>
            <p className="mt-0.5 max-w-md text-sm text-muted-foreground">
              Market pulse · histórico por produto, loja e data
            </p>
          </div>
        </Link>

        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Módulo
          </p>
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
            {(['celular', 'notebooks'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModulo(m)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  modulo === m
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {labelModulo(m)}
              </button>
            ))}
          </div>
          <p className="font-display text-xs font-semibold text-primary">{subtituloModulo(modulo)}</p>
        </div>
      </header>
      <main className="flex-1">
        <Outlet context={{ modulo }} />
      </main>
    </div>
  );
}
