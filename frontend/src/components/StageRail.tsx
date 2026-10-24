import { Check } from 'lucide-react';
import { STAGES } from '@/data/stages';
import type { StageId } from '@/lib/types';
import { cn } from '@/lib/utils';

export function StageRail({
  activeStage,
  completedStages,
  onSelect,
  disabled,
}: {
  activeStage: StageId;
  completedStages: Set<StageId>;
  onSelect: (stage: StageId) => void;
  disabled?: boolean;
}) {
  return (
    <nav aria-label="Call stages" className="panel overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <p className="rule-label">Eight stages</p>
        <p className="font-mono text-[10px] text-muted">{completedStages.size}/8 recorded</p>
      </div>
      <ol className="p-2">
        {STAGES.map((stage) => {
          const isActive = stage.id === activeStage;
          const isDone = completedStages.has(stage.id);
          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => onSelect(stage.id)}
                disabled={disabled}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
                  isActive ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/5 hover:text-ink',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]',
                    isActive
                      ? 'border-paper/30 bg-paper/10 text-paper'
                      : isDone
                        ? 'border-teal/30 bg-teal/10 text-teal'
                        : 'border-line text-muted',
                  )}
                >
                  {isDone && !isActive ? <Check className="size-3" /> : stage.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13px] font-medium', isActive && 'text-paper')}>
                    {stage.title}
                  </span>
                </span>
                {isActive ? <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
