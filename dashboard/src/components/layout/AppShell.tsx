import { Link, Outlet } from 'react-router-dom';
import { Smartphone } from 'lucide-react';

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-[1.03]">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Price History
            </p>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Celulares</h1>
          </div>
        </Link>
        <p className="hidden text-sm text-muted-foreground sm:block">
          Histórico por produto, loja e data
        </p>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
