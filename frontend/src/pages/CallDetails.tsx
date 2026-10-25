import { motion } from 'motion/react';
import { ArrowLeft, CalendarClock, Clock3, MessageSquareQuote, StickyNote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { OutcomeBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OUTCOME_LABELS, STAGE_MAP, STAGES } from '@/data/stages';
import { api, ApiError } from '@/lib/api';
import { callDisplayTitle, formatDate, formatDateTime, initials } from '@/lib/format';
import type { CallWithStages } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CallDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [call, setCall] = useState<CallWithStages | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .getCall(id)
      .then((response) => {
        if (active) setCall(response.data);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Could not load this call.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <p className="font-display text-xl font-semibold">This record could not be opened.</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/calls">Back to call history</Link>
        </Button>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const recorded = call.stageResults;
  const byStage = new Map(recorded.map((result) => [result.stageId, result]));
  const lastRecorded = recorded.length > 0 ? recorded[recorded.length - 1] : null;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link to="/calls" className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" />
          Call history
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface font-mono text-xs text-muted">
              {initials(callDisplayTitle(call))}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {callDisplayTitle(call)}
                </h1>
                <OutcomeBadge outcome={call.finalOutcome} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {call.prospectRole ?? 'Role not recorded'}
                {call.company ? ` · ${call.company}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  Started {formatDateTime(call.createdAt)}
                </span>
                {call.completedAt ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" />
                    Closed {formatDateTime(call.completedAt)}
                  </span>
                ) : (
                  <span className="text-signal">Still in progress</span>
                )}
              </div>
            </div>
          </div>
          {call.status === 'in_progress' ? (
            <Button asChild className="shrink-0">
              <Link to={`/calls/${call.id}/live`}>Resume call</Link>
            </Button>
          ) : (
            <span className="shrink-0 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
              Read-only record
            </span>
          )}
        </div>
      </motion.header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="rule-label">Final outcome</p>
          <p className="mt-2 font-display text-lg font-semibold">
            {call.finalOutcome ? OUTCOME_LABELS[call.finalOutcome] : 'Not closed'}
          </p>
        </div>
        <div className="panel p-4">
          <p className="rule-label">Stage reached</p>
          <p className="mt-2 font-display text-lg font-semibold">
            {lastRecorded ? `${STAGE_MAP[lastRecorded.stageId].number}. ${STAGE_MAP[lastRecorded.stageId].title}` : 'None recorded'}
          </p>
        </div>
        <div className="panel p-4">
          <p className="rule-label">Stages recorded</p>
          <p className="mt-2 font-display text-lg font-semibold">{recorded.length} of 8</p>
        </div>
      </section>

      <section className="mt-6 panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight">Call summary</h2>
          <p className="mt-0.5 text-xs text-muted">
            Composed from the recorded stage notes on this page. No text is generated by a model.
          </p>
        </div>
        <div className="p-5">
          {recorded.length === 0 ? (
            <p className="text-sm text-muted">No stage notes were recorded for this call.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">
                The caller reached <strong>{STAGE_MAP[lastRecorded!.stageId].title}</strong> and
                {call.status === 'completed' && call.finalOutcome
                  ? ` logged the outcome “${OUTCOME_LABELS[call.finalOutcome]}”.`
                  : ' the call is still open.'}
              </p>
              {byStage.get('their_need')?.prospectStatement ? (
                <div className="rounded-lg border border-line bg-paper p-3">
                  <p className="rule-label">The prospect&apos;s own words at stage 5</p>
                  <p className="mt-1.5 text-sm leading-relaxed">
                    “{byStage.get('their_need')?.prospectStatement}”
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
                  No stage 5 words were recorded. The next caller has no direct quote to work from.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight">Stage by stage</h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Eight stages, fixed order</p>
        </div>
        <ol className="space-y-3">
          {STAGES.map((stage) => {
            const result = byStage.get(stage.id);
            const hasContent = Boolean(result?.prospectStatement || result?.whatHappened || result?.stageOutcome);
            return (
              <li key={stage.id}>
                <article
                  className={cn(
                    'panel overflow-hidden',
                    hasContent ? 'border-line' : 'border-dashed bg-paper/40',
                  )}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full border font-mono text-[10px]',
                          hasContent ? 'border-teal/30 bg-teal/10 text-teal' : 'border-line text-muted',
                        )}
                      >
                        {stage.number}
                      </span>
                      <h3 className="font-display text-sm font-semibold">{stage.title}</h3>
                    </div>
                    {result ? (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                        {formatDate(result.updatedAt)}
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">Not reached</span>
                    )}
                  </div>
                  {hasContent ? (
                    <div className="grid gap-4 p-5 md:grid-cols-2">
                      <div>
                        <p className="rule-label flex items-center gap-1.5">
                          <MessageSquareQuote className="size-3" />
                          Their words
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed">
                          {result?.prospectStatement ? `“${result.prospectStatement}”` : <span className="text-muted">Not recorded.</span>}
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="rule-label flex items-center gap-1.5">
                            <StickyNote className="size-3" />
                            What happened
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed">
                            {result?.whatHappened || <span className="text-muted">Not recorded.</span>}
                          </p>
                        </div>
                        {result?.stageOutcome ? (
                          <p className="inline-flex rounded-full border border-line bg-paper px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                            {result.stageOutcome.replaceAll('_', ' ')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="px-5 py-4 text-sm text-muted">
                      No notes were recorded at this stage. {stage.purpose}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
