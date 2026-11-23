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
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <Link
          to={modulo === 'celular' ? '/' : `/?modulo=${modulo}`}
          className="group flex items-start gap-3.5"
        >
          <span className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-[1.03]">
            <Activity className="h-5 w-5 text-accent" aria-hidden />
          </span>
          <div>
            <p className="font-display text-eyebrow">Price History</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {labelModulo(modulo)}
            </h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {subtituloModulo(modulo)}
            </p>
          </div>
        </Link>

        <div className="flex flex-col gap-2 sm:items-end">
          <p className="text-eyebrow">Módulo</p>
          <div
            className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm"
            role="tablist"
            aria-label="Alternar módulo"
          >
            {(['celular', 'notebooks'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={modulo === m}
                onClick={() => setModulo(m)}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150',
                  modulo === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {labelModulo(m)}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet context={{ modulo }} />
      </main>
    </div>
  );
}
