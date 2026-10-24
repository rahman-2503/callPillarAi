import { motion } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, History, Search, SearchX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { NewCallDialog } from '@/components/NewCallDialog';
import { OutcomeBadge, StatusDot } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { OUTCOME_LABELS, STAGE_MAP } from '@/data/stages';
import { api, ApiError } from '@/lib/api';
import { callDisplayTitle, formatDay } from '@/lib/format';
import { FINAL_OUTCOMES, type Call, type FinalOutcome } from '@/lib/types';

const PAGE_SIZE = 12;

export function HistoryPage() {
  const [calls, setCalls] = useState<Call[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [outcome, setOutcome] = useState<'all' | FinalOutcome>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, status, outcome, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.listCalls({
        search: debouncedSearch || undefined,
        status: status === 'all' ? undefined : status,
        outcome: outcome === 'all' ? undefined : outcome,
        sort,
        limit: PAGE_SIZE,
        offset,
      });
      setCalls(response.data);
      setTotal(response.pagination.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load call history.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, outcome, sort, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = Boolean(debouncedSearch || status !== 'all' || outcome !== 'all');
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="rule-label">Records</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Call history</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Saved calls, with the stage each one reached and the outcome the caller logged. Open a record to
            read the prospect&apos;s own words.
          </p>
        </div>
        <NewCallDialog
          trigger={
            <Button size="lg" className="shrink-0">
              <History className="size-4" />
              Start a new call
            </Button>
          }
        />
      </motion.header>

      <div className="mt-6 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, company or call title"
            aria-label="Search calls"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-3">
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger aria-label="Filter by status" className="lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={outcome} onValueChange={(value) => setOutcome(value as typeof outcome)}>
            <SelectTrigger aria-label="Filter by outcome" className="lg:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              {FINAL_OUTCOMES.map((item) => (
                <SelectItem key={item} value={item}>
                  {OUTCOME_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
            <SelectTrigger aria-label="Sort calls" className="lg:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="panel mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="rule-label">
            {total} {total === 1 ? 'call' : 'calls'}
            {filtered ? ' matching' : ''}
          </p>
          {filtered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatus('all');
                setOutcome('all');
                setSort('newest');
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {error ? (
          <div role="alert" className="p-6 text-sm text-signal">
            <p className="font-medium">Call history could not load.</p>
            <p className="mt-1 text-signal/80">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : calls && calls.length > 0 ? (
          <ul>
            {calls.map((call) => {
              const stage = STAGE_MAP[call.currentStage];
              return (
                <li key={call.id}>
                  <Link
                    to={call.status === 'completed' ? `/calls/${call.id}` : `/calls/${call.id}/live`}
                    className="group grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-5 py-4 last:border-b-0 hover:bg-paper/70 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_auto_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{callDisplayTitle(call)}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {call.prospectRole ?? 'Role not recorded'} · {call.title}
                      </p>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <p className="flex items-center gap-2 text-xs text-ink">
                        <StatusDot status={call.status} />
                        Reached {stage.shortTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{formatDay(call.updatedAt)}</p>
                    </div>
                    <OutcomeBadge outcome={call.finalOutcome} />
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : filtered ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title="No calls match these filters"
            description="Try a different search word, or clear the filters to see every saved call."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatus('all');
                  setOutcome('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<History className="size-5" />}
            title="No calls saved yet"
            description="Start a call and save the first stage. It will appear here with the stage it reached."
            action={
              <NewCallDialog
                trigger={
                  <Button>
                    <History className="size-4" />
                    Start a call
                  </Button>
                }
              />
            }
          />
        )}

        {total > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
            <p className="font-mono text-[10px] text-muted">
              {pageStart}–{pageEnd} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageEnd >= total || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
