import { Badge } from '@/components/ui/badge';
import { OUTCOME_LABELS } from '@/data/stages';
import type { FinalOutcome } from '@/lib/types';
import { cn } from '@/lib/utils';

const outcomeVariant: Record<FinalOutcome, 'default' | 'outline' | 'signal' | 'teal' | 'ink'> = {
  next_step_agreed: 'teal',
  agreed_to_receive_report: 'teal',
  interested: 'default',
  follow_up: 'outline',
  call_again: 'outline',
  not_interested: 'signal',
  do_not_call: 'signal',
  wrong_person: 'ink',
  moved_company: 'ink',
  not_logged: 'outline',
};

export function OutcomeBadge({ outcome, className }: { outcome: FinalOutcome | null; className?: string }) {
  if (!outcome) return <Badge variant="outline" className={className}>In progress</Badge>;
  return (
    <Badge variant={outcomeVariant[outcome]} className={className}>
      {OUTCOME_LABELS[outcome] ?? outcome}
    </Badge>
  );
}

export function StatusDot({ status, className }: { status: 'in_progress' | 'completed'; className?: string }) {
  return (
    <span
      className={cn(
        'size-1.5 rounded-full',
        status === 'in_progress' ? 'bg-signal' : 'bg-teal',
        status === 'in_progress' && 'animate-pulse-dot',
        className,
      )}
      aria-hidden="true"
    />
  );
}
