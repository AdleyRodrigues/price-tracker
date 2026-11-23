import { useState, type MouseEvent } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  cupomTag: string;
  className?: string;
  /** Impede que o clique propague para o card/link pai. */
  stopPropagation?: boolean;
};

/** Código digitável (ex.: 170OFF), não rótulo genérico tipo "25% OFF". */
export function ehCodigoCupomCopiavel(tag: string): boolean {
  const t = tag.trim();
  if (!t || /^CUPOM$/i.test(t) || /%/.test(t) || /\s/.test(t)) return false;
  return /^[A-Z0-9][A-Z0-9_-]{2,}$/i.test(t);
}

export function rotuloCupom(tag: string): string {
  const t = tag.trim();
  if (!t) return '';
  if (/^CUPOM$/i.test(t)) return 'Preço com cupom da loja';
  if (ehCodigoCupomCopiavel(t)) return `Cupom ${t}`;
  return `Preço com cupom ${t}`;
}

export function CupomBadge({ cupomTag, className, stopPropagation = true }: Props) {
  const [copiado, setCopiado] = useState(false);
  const tag = cupomTag.trim();
  const copiavel = ehCodigoCupomCopiavel(tag);

  async function copiar(e: MouseEvent) {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!copiavel) return;
    try {
      await navigator.clipboard.writeText(tag);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      // fallback silencioso — alguns browsers bloqueiam sem gesto HTTPS
    }
  }

  return (
    <span
      className={cn('chip-coupon inline-flex items-center gap-1.5', className)}
      title={
        copiavel
          ? 'Este valor já inclui o desconto do cupom. Clique para copiar o código.'
          : 'Este valor já inclui o desconto do cupom. Na vitrine da loja o preço pode aparecer maior.'
      }
    >
      <span>{rotuloCupom(tag)}</span>
      {copiavel ? (
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1 rounded border border-white/25 bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-chip-coupon-fg)] transition-colors hover:bg-white/20"
          aria-label={copiado ? `Cupom ${tag} copiado` : `Copiar cupom ${tag}`}
        >
          {copiado ? (
            <>
              <Check className="h-3 w-3" aria-hidden />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden />
              Copiar
            </>
          )}
        </button>
      ) : null}
    </span>
  );
}
