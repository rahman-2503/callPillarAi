import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check,
  CircleStop,
  Loader2,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { OUTCOME_LABELS, STAGE_MAP, STAGES } from '@/data/stages';
import { api, ApiError } from '@/lib/api';
import { callDisplayTitle, formatDay } from '@/lib/format';
import { FINAL_OUTCOMES, type CallWithStages, type FinalOutcome, type StageId } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Draft {
  prospectStatement: string;
  whatHappened: string;
  stageOutcome: string;
}

const emptyDraft: Draft = { prospectStatement: '', whatHappened: '', stageOutcome: '' };

const WHAT_HAPPENED_OPTIONS: Record<StageId, string[]> = {
  opening: [
    'Asked what we do',
    'Asked where we got the number',
    'Said they are busy / driving',
    'Said wrong person / left company',
  ],
  purpose: [
    'Understood the purpose',
    'Asked for more clarity',
    'Asked where we got their details',
    'Assumed it was a sales call',
  ],
  permission: [
    'Said go ahead / yes now',
    'Asked to call back later',
    'Asked to send info first',
    'Declined / no permission',
  ],
  their_business: [
    'Described their business',
    'Corrected our understanding',
    'Rushed to pitch us',
    'Said not relevant / wrong division',
  ],
  their_need: [
    'Named a specific goal/need',
    'Said everything is fine',
    'Turned it around on us',
    'Unclear / vague response',
  ],
  objection: [
    'Already have a provider',
    'Not the right person',
    'Asked for written info',
    'No budget / no reason given',
  ],
  next_step: [
    'Agreed to meeting / call',
    'Agreed to receive document',
    'Referred to a colleague',
    'No next step agreed',
  ],
  close: [
    'Clear agreement reached',
    'Polite no / declined',
    'Hung up / line dropped',
    'Left voicemail',
  ],
};

function draftFromCall(call: CallWithStages, stageId: StageId): Draft {
  const existing = call.stageResults.find((stage) => stage.stageId === stageId);
  return {
    prospectStatement: existing?.prospectStatement ?? '',
    whatHappened: existing?.whatHappened ?? '',
    stageOutcome: existing?.stageOutcome ?? '',
  };
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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
  const [timerSeconds, setTimerSeconds] = useState(0);
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
    const interval = setInterval(() => setTimerSeconds((t) => t + 1), 1000);
    return () => clearInterval(interval);
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
  const prevStage = stage.number > 1 ? STAGES[stage.number - 2] : null;
  const nextStage = stage.number < STAGES.length ? STAGES[stage.number] : null;
  const whatHappenedOpts = WHAT_HAPPENED_OPTIONS[stageId] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-bold text-gray-900">CALLPILOT AI</span>
          <Separator orientation="vertical" className="h-6" />
          <span className="font-mono text-xs uppercase tracking-wider text-gray-500">CALL GUIDE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-2xl font-bold tabular-nums text-gray-900">
            {formatTimer(timerSeconds)}
          </span>
        </div>
      </header>

      <main className="px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-[1400px] grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4 min-w-0" ref={currentStageRef}>
            <div className="card bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{call.prospectName ?? 'Unknown'}</span>
                  {call.prospectRole && (
                    <>
                      <Separator orientation="vertical" className="h-4 mx-2" />
                      <span className="text-sm text-gray-500">{call.prospectRole}</span>
                    </>
                  )}
                  {call.company && (
                    <>
                      <Separator orientation="vertical" className="h-4 mx-2" />
                      <span className="text-sm text-gray-500">{call.company}</span>
                    </>
                  )}
                </div>
                <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-xs">
                  {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
                </Badge>
              </div>
            </div>

            <div className="card bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap gap-1 mb-4" role="tablist" aria-label="Call stages">
                {STAGES.map((s) => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={s.id === stageId}
                    aria-controls={`stage-panel-${s.id}`}
                    onClick={() => requestStage(s.id)}
                    disabled={isCompleted}
                    className={cn(
                      'flex-1 min-w-0 py-2 px-1 text-center text-xs font-medium rounded-lg transition-all',
                      s.id === stageId
                        ? 'bg-blue-600 text-white shadow-sm'
                        : completedStages.has(s.id)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                      isCompleted && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {s.number}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
                  STAGE {stage.number} OF 8
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-gray-900">{stage.title}</h2>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{stage.purpose}</p>
              </div>
            </div>

            <div className="card bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-3">SHE MAY SAY</h3>
              <div className="space-y-2">
                {stage.maySay.slice(0, 3).map((line, i) => (
                  <div
                    key={i}
                    className="relative rounded-lg border-l-4 border-blue-600 bg-gray-50 p-3 text-sm leading-relaxed text-gray-700"
                  >
                    <p className="italic">"{line}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-3">WHAT HAPPENED</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {whatHappenedOpts.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => updateDraft('whatHappened', opt)}
                    disabled={isCompleted}
                    className={cn(
                      'relative rounded-lg border p-3 text-sm font-medium text-center transition-all',
                      draft.whatHappened === opt
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300',
                      isCompleted && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div>
                <Label htmlFor="whatHappened" className="block text-xs font-medium text-gray-500 mb-1">
                  Other / Additional notes
                </Label>
                <Textarea
                  id="whatHappened"
                  value={draft.whatHappened}
                  onChange={(e) => updateDraft('whatHappened', e.target.value)}
                  placeholder="Add any additional context..."
                  maxLength={2000}
                  disabled={isCompleted}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <div className="card bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-3">HER WORDS</h3>
              <Textarea
                id="prospectStatement"
                value={draft.prospectStatement}
                onChange={(e) => updateDraft('prospectStatement', e.target.value)}
                placeholder="Type exactly what the prospect said. Do not summarise."
                maxLength={4000}
                disabled={isCompleted}
                className="min-h-[120px]"
              />
            </div>

            <div className="card bg-white border border-gray-200 rounded-xl p-4">
              <div className="mb-4">
                <Label htmlFor="stageOutcome" className="block text-xs font-medium text-gray-500 mb-1">
                  {stage.outcomeLabel}
                </Label>
                <Select
                  value={draft.stageOutcome || 'unset'}
                  onValueChange={(value) => updateDraft('stageOutcome', value === 'unset' ? '' : value)}
                  disabled={isCompleted}
                >
                  <SelectTrigger id="stageOutcome">
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

              {saveError && (
                <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2" role="alert">
                  {saveError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  {prevStage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestStage(prevStage.id)}
                      disabled={isCompleted}
                    >
                      <ArrowLeft className="size-3.5" />
                      {prevStage.shortTitle}
                    </Button>
                  )}
                  {dirty && !isCompleted && (
                    <span className="font-mono text-xs uppercase tracking-wider text-red-600">Unsaved</span>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => saveStage({ advance: false })}
                    disabled={saving || isCompleted || !dirty}
                    className="flex-1 sm:w-auto"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save
                  </Button>
                  <Button
                    onClick={() => saveStage({ advance: true })}
                    disabled={saving || isCompleted}
                    className="flex-1 sm:w-auto bg-gray-900 hover:bg-gray-700 text-white"
                  >
                    {nextStage ? `Next: ${nextStage.title}` : 'Save stage'}
                    {nextStage ? <ArrowRight className="size-4" /> : <Check className="size-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCloseOpen(true)}
                    className="flex-1 sm:w-auto border-gray-300 hover:bg-gray-50"
                  >
                    <CircleStop className="size-4" />
                    End Call
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <aside className="hidden lg:block space-y-4">
            <div className="card bg-white border border-gray-200 rounded-xl p-4">
              <div className="mb-4">
                <h3 className="font-display text-lg font-bold text-gray-900">THE SECOND SCREEN: PAST CALLS</h3>
                <p className="mt-1 text-sm text-gray-500">
                  After a call is saved it appears here with the stage it reached.
                </p>
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {call ? (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{callDisplayTitle(call)}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {call.prospectName ? `${call.prospectName}${call.company ? ` · ${call.company}` : ''}` : 'Unknown prospect'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {call.prospectRole ? `${call.prospectRole}` : 'No role'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono text-xs uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {call.currentStage.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDay(call.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No calls recorded yet</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

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
              variant="destructive"
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
            <Button variant="destructive" onClick={() => navigate('/calls')}>
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
          {dirty && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-600" />
              You have unsaved stage notes. Close the dialog and save first if you want to keep them.
            </p>
          )}
          {closeError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2" role="alert">
              {closeError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={closing}>
              Keep call open
            </Button>
            <Button variant="destructive" onClick={closeCall} disabled={closing}>
              {closing ? <Loader2 className="size-4 animate-spin" /> : null}
              {closing ? 'Closing…' : 'Close call'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}