import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary text-primary-foreground',
        secondary: 'border-border bg-muted text-foreground',
        success: 'border-transparent bg-[var(--color-chip-good-bg)] text-[var(--color-chip-good-fg)]',
        warning: 'border-transparent bg-[var(--color-chip-warn-bg)] text-[var(--color-chip-warn-fg)]',
        outline: 'border-border bg-card text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
