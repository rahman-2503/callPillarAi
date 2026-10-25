import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent-soft text-accent',
        outline: 'border-line bg-surface text-muted',
        signal: 'border-signal/20 bg-signal/10 text-signal',
        teal: 'border-teal/20 bg-teal/10 text-teal',
        ink: 'border-ink/15 bg-ink/5 text-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
