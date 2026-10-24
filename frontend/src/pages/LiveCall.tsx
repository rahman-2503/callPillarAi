import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleStop,
  Clock3,
  Loader2,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CopilotPanel } from '@/components/CopilotPanel';
import { StageRail } from '@/components/StageRail';
import { OutcomeBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { OUTCOME_LABELS, STAGE_MAP, STAGES } from '@/data/stages';
import { api, ApiError } from '@/lib/api';
import { callDisplayTitle, formatDay } from '@/lib/format';
import { FINAL_OUTCOMES, type CallWithStages, type FinalOutcome, type StageId } from '@/lib/types';

interface Draft {
  prospectStatement: string;
  whatHappened: string;
  stageOutcome: string;
}

const emptyDraft: Draft = { prospectStatement: '', whatHappened: '', stageOutcome: '' };

function draftFromCall(call: CallWithStages, stageId: StageId): Draft {
  const existing = call.stageResults.find((stage) => stage.stageId === stageId);
  return {
    prospectStatement: existing?.prospectStatement ?? '',
    whatHappened: existing?.whatHappened ?? '',
    stageOutcome: existing?.stageOutcome ?? '',
  };
}

export function LiveCallPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<CallWithStages | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stageId, setStageId] = useState<StageId>('opening');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [savedDraft, setSavedDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<StageId | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeOutcome, setCloseOutcome] = useState<FinalOutcome>('next_step_agreed');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const currentStageRef = useRef<HTMLDivElement>(null);

  const stage = STAGE_MAP[stageId];
  const dirty =
    draft.prospectStatement !== savedDraft.prospectStatement ||
    draft.whatHappened !== savedDraft.whatHappened ||
    draft.stageOutcome !== savedDraft.stageOutcome;

  const completedStages = useMemo(() => {
    const set = new Set<StageId>();
    call?.stageResults.forEach((result) => {
      if (result.prospectStatement || result.whatHappened || result.stageOutcome) set.add(result.stageId);
    });
    return set;
  }, [call]);

  useEffect(() => {
    let active = true;
    if (!id) return;
    api
      .getCall(id)
      .then((response) => {
        if (!active) return;
        setCall(response.data);
        const resumeStage = response.data.status === 'completed' ? 'close' : response.data.currentStage;
        setStageId(resumeStage);
        const nextDraft = draftFromCall(response.data, resumeStage);
        setDraft(nextDraft);
        setSavedDraft(nextDraft);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Could not load this call.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    currentStageRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [stageId]);

  function updateDraft(key: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function requestStage(next: StageId) {
    if (next === stageId) return;
    if (dirty) {
      setPendingStage(next);
      return;
    }
    switchStage(next);
  }

  function switchStage(next: StageId) {
    if (!call) return;
    setStageId(next);
    const nextDraft = draftFromCall(call, next);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
    setSaveError(null);
    setPendingStage(null);
  }

  async function saveStage(options: { advance: boolean; silent?: boolean }) {
    if (!id || !call) return false;
    if (!draft.prospectStatement.trim() && !draft.whatHappened.trim() && !draft.stageOutcome.trim()) {
      setSaveError('Record at least one thing before saving this stage.');
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const response = await api.saveStage(id, {
        stageId,
        prospectStatement: draft.prospectStatement.trim() || undefined,
        whatHappened: draft.whatHappened.trim() || undefined,
        stageOutcome: draft.stageOutcome.trim() || undefined,
        advance: options.advance,
      });
      const updatedCall: CallWithStages = {
        ...response.data.call,
        stageResults: [
          ...call.stageResults.filter((result) => result.stageId !== response.data.stageResult.stageId),
          response.data.stageResult,
        ].sort((a, b) => a.stageOrder - b.stageOrder),
      };
      setCall(updatedCall);
      setSavedDraft(draft);
      if (!options.silent) toast.success(`${stage.title} saved`, { description: 'The record is up to date.' });
      if (options.advance) {
        const nextIndex = Math.min(stage.number, STAGES.length - 1);
        const nextStage = STAGES[nextIndex].id;
        setStageId(nextStage);
        const nextDraft = draftFromCall(updatedCall, nextStage);
        setDraft(nextDraft);
        setSavedDraft(nextDraft);
      }
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'The stage could not be saved. Please retry.';
      setSaveError(message);
      toast.error('Stage not saved', { description: message });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function closeCall() {
    if (!id) return;
    setClosing(true);
    setCloseError(null);
    try {
      await api.closeCall(id, closeOutcome);
      toast.success('Call closed', { description: `Outcome: ${OUTCOME_LABELS[closeOutcome]}` });
      navigate(`/calls/${id}`);
    } catch (err) {
      setCloseError(err instanceof ApiError ? err.message : 'The call could not be closed. Please retry.');
    } finally {
      setClosing(false);
    }
  }

  function attemptLeave(event: React.MouseEvent) {
    if (!dirty) return;
    event.preventDefault();
    setGuardOpen(true);
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <p className="font-display text-xl font-semibold">This call could not be opened.</p>
        <p className="mt-2 text-sm text-muted">{loadError}</p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/calls">Back to call history</Link>
        </Button>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_320px]">
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[320px]" />
        </div>
      </div>
    );
  }

  const isCompleted = call.status === 'completed';
  const elapsedMinutes = Math.max(0, Math.round((now - new Date(call.createdAt).getTime()) / 60000));
  const prevStage = stage.number > 1 ? STAGES[stage.number - 2] : null;
  const nextStage = stage.number < STAGES.length ? STAGES[stage.number] : null;

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/calls"
              onClick={attemptLeave}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              Call history
            </Link>
            <span className="text-line">/</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Live call</span>
            {isCompleted ? <OutcomeBadge outcome={call.finalOutcome} /> : null}
          </div>
          <h1 className="mt-2 truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {callDisplayTitle(call)}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {call.prospectRole ? <span>{call.prospectRole}</span> : null}
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" />
              Started {formatDay(call.createdAt)}
            </span>
            {!isCompleted ? <span>{elapsedMinutes} min elapsed</span> : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isCompleted ? (
            <Button asChild variant="outline">
              <Link to={`/calls/${call.id}`}>View saved record</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => saveStage({ advance: false })}
                disabled={saving || dirty === false}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save stage
              </Button>
              <Button variant="signal" onClick={() => setCloseOpen(true)}>
                <CircleStop className="size-4" />
                End call
              </Button>
            </>
          )}
        </div>
      </header>

      {isCompleted ? (
        <div className="mt-4 rounded-lg border border-teal/25 bg-teal/5 px-4 py-3 text-sm text-teal">
          This call is closed. Its stage notes are read-only. <Link to={`/calls/${call.id}`} className="underline">Open the saved record</Link>.
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[236px_minmax(0,1fr)] xl:grid-cols-[236px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <StageRail
            activeStage={stageId}
            completedStages={completedStages}
            onSelect={requestStage}
            disabled={isCompleted}
          />
          <div className="panel p-4">
            <p className="rule-label">Next step</p>
            {nextStage ? (
              <button
                type="button"
                onClick={() => requestStage(nextStage.id)}
                disabled={isCompleted}
                className="mt-2 flex w-full items-center justify-between gap-2 rounded-md border border-line bg-paper px-3 py-2 text-left text-sm hover:border-ink/20 disabled:opacity-60"
              >
                <span>
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-muted">
                    Next: {nextStage.number} of 8
                  </span>
                  <span className="mt-0.5 block font-medium">{nextStage.title}</span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </button>
            ) : (
              <p className="mt-2 text-xs text-muted">This is the last stage. Close the call and record the outcome.</p>
            )}
          </div>
        </div>

        <div ref={currentStageRef} className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.section
              key={stageId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="panel overflow-hidden"
              aria-labelledby="stage-title"
            >
              <div className="border-b border-line bg-ink px-5 py-4 text-paper">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
                    Stage {stage.number} of 8
                  </p>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-paper/55">
                    <span className="size-1.5 rounded-full bg-signal" />
                    Current
                  </span>
                </div>
                <h2 id="stage-title" className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
                  {stage.title}
                </h2>
                <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-paper/70">{stage.purpose}</p>
              </div>

              <div className="grid gap-0 md:grid-cols-2">
                <div className="border-b border-line p-5 md:border-b-0 md:border-r">
                  <p className="rule-label">What tends to happen</p>
                  <ul className="mt-2 space-y-1.5">
                    {stage.listenFor.map((item) => (
                      <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-muted">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted/60" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="rule-label mt-5">She may say</p>
                  <ul className="mt-2 space-y-1.5">
                    {stage.maySay.map((line) => (
                      <li
                        key={line}
                        className="rounded-md border border-line/80 bg-paper/60 px-3 py-2 text-[13px] leading-relaxed"
                      >
                        “{line}”
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5">
                  <p className="rule-label">What to do</p>
                  <ol className="mt-2 space-y-2">
                    {stage.guides.map((guide, index) => (
                      <li key={guide} className="flex gap-2 text-[13px] leading-relaxed">
                        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[9px] text-muted">
                          {index + 1}
                        </span>
                        <span>{guide}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="border-t border-line p-5">
                <div className="mb-4">
                  <Label htmlFor="stageOutcome">{stage.outcomeLabel}</Label>
                  <Select
                    value={draft.stageOutcome || 'unset'}
                    onValueChange={(value) => updateDraft('stageOutcome', value === 'unset' ? '' : value)}
                    disabled={isCompleted}
                  >
                    <SelectTrigger id="stageOutcome" className="mt-1.5">
                      <SelectValue placeholder="Choose an outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not chosen</SelectItem>
                      {stage.outcomeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.replaceAll('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="prospectStatement">Their words</Label>
                    <p className="mt-0.5 text-[11px] text-muted">Type exactly what the prospect said. Do not summarise.</p>
                    <Textarea
                      id="prospectStatement"
                      aria-label="Prospect words"
                      value={draft.prospectStatement}
                      onChange={(event) => updateDraft('prospectStatement', event.target.value)}
                      placeholder="e.g. We want to push the new product line into two more states this year."
                      maxLength={4000}
                      disabled={isCompleted}
                      className="mt-1.5 min-h-[112px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatHappened">What happened</Label>
                    <p className="mt-0.5 text-[11px] text-muted">A short note about the exchange, not a script.</p>
                    <Textarea
                      id="whatHappened"
                      value={draft.whatHappened}
                      onChange={(event) => updateDraft('whatHappened', event.target.value)}
                      placeholder="e.g. Asked what we do, then asked where we got the number."
                      maxLength={2000}
                      disabled={isCompleted}
                      className="mt-1.5 min-h-[112px]"
                    />
                  </div>
                </div>

                {saveError ? (
                  <p role="alert" className="mt-3 rounded-lg border border-signal/20 bg-signal/5 px-3 py-2 text-xs text-signal">
                    {saveError}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    {prevStage ? (
                      <Button variant="ghost" size="sm" onClick={() => requestStage(prevStage.id)} disabled={isCompleted}>
                        <ArrowLeft className="size-3.5" />
                        {prevStage.shortTitle}
                      </Button>
                    ) : null}
                    {dirty && !isCompleted ? (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-signal">Unsaved</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => saveStage({ advance: false })}
                      disabled={saving || isCompleted || !dirty}
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save
                    </Button>
                    <Button
                      onClick={() => saveStage({ advance: true })}
                      disabled={saving || isCompleted}
                    >
                      {nextStage ? `Save and continue` : 'Save stage'}
                      {nextStage ? <ArrowRight className="size-4" /> : <Check className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.section>
          </AnimatePresence>

          {stage.id === 'close' && !isCompleted ? (
            <div className="mt-4 rounded-xl border border-signal/25 bg-signal/5 p-4">
              <p className="font-display text-sm font-semibold">Ready to end the call?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Closing records the final outcome and makes this record read-only. Save the stage first if you
                have notes to keep.
              </p>
              <Button variant="signal" size="sm" className="mt-3" onClick={() => setCloseOpen(true)}>
                <CircleStop className="size-3.5" />
                End call and record outcome
              </Button>
            </div>
          ) : null}
        </div>

        <div className="hidden xl:block">
          <CopilotPanel
            stageId={stageId}
            stagePurpose={stage.purpose}
            prospectStatement={draft.prospectStatement}
            callNotes={draft.whatHappened}
            callTitle={call.title}
            company={call.company}
            onUseResponse={(text) =>
              updateDraft('whatHappened', draft.whatHappened ? `${draft.whatHappened}\n${text}` : text)
            }
          />
        </div>
      </div>

      <div className="mt-4 xl:hidden">
        <CopilotPanel
          stageId={stageId}
          stagePurpose={stage.purpose}
          prospectStatement={draft.prospectStatement}
          callNotes={draft.whatHappened}
          callTitle={call.title}
          company={call.company}
        />
      </div>

      <Dialog open={Boolean(pendingStage)} onOpenChange={(open) => !open && setPendingStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard your unsaved changes?</DialogTitle>
            <DialogDescription>
              This stage has notes that have not been saved. Moving to another stage will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStage(null)}>
              Stay here
            </Button>
            <Button
              variant="signal"
              onClick={() => {
                if (pendingStage) switchStage(pendingStage);
              }}
            >
              Discard and move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={guardOpen} onOpenChange={setGuardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave this call?</DialogTitle>
            <DialogDescription>
              You have unsaved notes. Leave only if you do not need them; the saved record will keep the
              previous version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardOpen(false)}>
              Stay on the call
            </Button>
            <Button variant="signal" onClick={() => navigate('/calls')}>
              Leave without saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End the call</DialogTitle>
            <DialogDescription>
              Record what actually happened. This closes the call and makes the note read-only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="finalOutcome">Final outcome</Label>
            <Select value={closeOutcome} onValueChange={(value) => setCloseOutcome(value as FinalOutcome)}>
              <SelectTrigger id="finalOutcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINAL_OUTCOMES.map((outcome) => (
                  <SelectItem key={outcome} value={outcome}>
                    {OUTCOME_LABELS[outcome]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dirty ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-signal" />
              You have unsaved stage notes. Close the dialog and save first if you want to keep them.
            </p>
          ) : null}
          {closeError ? (
            <p role="alert" className="mt-3 rounded-lg border border-signal/20 bg-signal/5 px-3 py-2 text-xs text-signal">
              {closeError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={closing}>
              Keep call open
            </Button>
            <Button variant="signal" onClick={closeCall} disabled={closing}>
              {closing ? <Loader2 className="size-4 animate-spin" /> : null}
              {closing ? 'Closing…' : 'Close call'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
