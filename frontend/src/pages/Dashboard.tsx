import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Clock3, PhoneCall, Plus, Rows3, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NewCallDialog } from '@/components/NewCallDialog';
import { EmptyState } from '@/components/EmptyState';
import { OutcomeBadge, StatusDot } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { STAGE_MAP } from '@/data/stages';
import { api, ApiError } from '@/lib/api';
import { callDisplayTitle, formatDay, initials } from '@/lib/format';
import type { Call, CallCounts } from '@/lib/types';
import { cn } from '@/lib/utils';

function Metric({
  label,
  value,
  icon,
  hint,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={cn('panel flex flex-col justify-between p-5', accent && 'border-ink/15 bg-ink text-paper')}>
      <div className="flex items-start justify-between">
        <p className={cn('rule-label', accent && 'text-paper/55')}>{label}</p>
        <span className={cn('text-muted', accent && 'text-paper/50')}>{icon}</span>
      </div>
      <p className="mt-6 font-display text-4xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className={cn('mt-1 text-xs text-muted', accent && 'text-paper/55')}>{hint}</p>
    </div>
  );
}

function RecentRow({ call }: { call: Call }) {
  const stage = STAGE_MAP[call.currentStage];
  return (
    <li>
      <Link
        to={call.status === 'completed' ? `/calls/${call.id}` : `/calls/${call.id}/live`}
        className="group flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0 hover:bg-paper/70"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-paper font-mono text-[11px] text-muted">
          {initials(callDisplayTitle(call))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{callDisplayTitle(call)}</span>
            <StatusDot status={call.status} />
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {call.status === 'completed'
              ? `Reached ${stage.shortTitle} · ${formatDay(call.createdAt)}`
              : `In progress at ${stage.shortTitle} · ${formatDay(call.updatedAt)}`}
          </span>
        </span>
        <span className="hidden shrink-0 sm:block">
          <OutcomeBadge outcome={call.finalOutcome} />
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

export function DashboardPage() {
  const [counts, setCounts] = useState<CallCounts | null>(null);
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.counts(), api.listCalls({ limit: 6 })])
      .then(([countsValue, callsValue]) => {
        if (!active) return;
        setCounts(countsValue);
        setCalls(callsValue.data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Could not load the dashboard.');
      });
    return () => {
      active = false;
    };
  }, []);

  const loading = !counts || !calls;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="rule-label">Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Every call is a record of eight stages. Start one, record what the prospect actually said, and
            the next call starts from there.
          </p>
        </div>
        <NewCallDialog
          trigger={
            <Button size="lg" className="shrink-0">
              <Plus className="size-4" />
              Start a new call
            </Button>
          }
        />
      </motion.header>

      {error ? (
        <div role="alert" className="mt-8 rounded-xl border border-signal/25 bg-signal/5 p-4 text-sm text-signal">
          <p className="font-medium">The dashboard could not load.</p>
          <p className="mt-1 text-signal/80">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : null}

      <section aria-label="Call metrics" className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? [0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-[168px]" />)
          : [
              {
                label: 'Total calls',
                value: counts.total,
                icon: <Rows3 className="size-4" />,
                hint: 'All persisted call records',
                accent: true,
              },
              {
                label: 'Completed',
                value: counts.completed,
                icon: <CheckCircle2 className="size-4" />,
                hint: 'Closed with an outcome',
              },
              {
                label: 'In progress',
                value: counts.inProgress,
                icon: <Clock3 className="size-4" />,
                hint: 'Waiting for the next stage',
              },
              {
                label: 'Stages per call',
                value: 8,
                icon: <PhoneCall className="size-4" />,
                hint: 'From Opening to Close',
              },
            ].map((metric) => <Metric key={metric.label} {...metric} />)}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Recent calls</h2>
              <p className="mt-0.5 text-xs text-muted">Saved records, newest first</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/calls">
                View history
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-14" />
              ))}
            </div>
          ) : calls && calls.length > 0 ? (
            <ul>
              {calls.map((call) => (
                <RecentRow key={call.id} call={call} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<PhoneCall className="size-5" />}
              title="No calls yet"
              description="Start your first call. The eight stages will be ready, and the record will appear here when you save it."
              action={
                <NewCallDialog
                  trigger={
                    <Button>
                      <Plus className="size-4" />
                      Start the first call
                    </Button>
                  }
                />
              }
            />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="panel p-5">
            <p className="rule-label">Today&apos;s discipline</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">Record the prospect&apos;s words.</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Stage 5 is the only stage where exact words matter. A summary you wrote from memory is not a
              record; it is an interpretation.
            </p>
            <div className="mt-4 rounded-lg border border-line bg-paper p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Example from the set</p>
              <p className="mt-1.5 text-sm leading-relaxed">
                “We want to push the new product line into two more states this year.”
              </p>
            </div>
          </div>

          <div className="panel p-5">
            <p className="rule-label">Where calls end</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Most of the hundred calls never reach stage 8. A record that stops at Objection is still useful:
              it tells the next caller where the conversation actually stopped.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <SearchX className="size-4 text-accent" />
              Calls that end early are shown with the stage they reached.
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
