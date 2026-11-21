import { Lightbulb } from 'lucide-react';
import type { OverviewInsight } from '@/lib/api';
import { toneClass } from '@/lib/insights';
import { cn } from '@/lib/utils';

type Props = {
  insights: OverviewInsight[];
};

export function InsightRail({ insights }: Props) {
  if (!insights.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm font-semibold tracking-tight">Insights</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((ins) => (
          <article key={ins.id} className={cn('rounded-xl border p-4', toneClass(ins.tone))}>
            <p className="font-display text-sm font-semibold">{ins.title}</p>
            <p className="mt-1 text-sm opacity-80">{ins.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
