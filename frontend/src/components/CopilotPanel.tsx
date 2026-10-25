import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Bot, CornerDownRight, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import type { Suggestion } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CopilotPanel({
  stageId,
  stagePurpose,
  prospectStatement,
  callNotes,
  callTitle,
  company,
  onUseResponse,
}: {
  stageId: import('@/lib/types').StageId;
  stagePurpose: string;
  prospectStatement: string;
  callNotes: string;
  callTitle?: string;
  company?: string | null;
  onUseResponse?: (text: string) => void;
}) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasContext = prospectStatement.trim().length > 0 || callNotes.trim().length > 0;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.suggest({
        stageId,
        stagePurpose,
        prospectStatement: prospectStatement.trim() || undefined,
        callNotes: callNotes.trim() || undefined,
        callTitle,
        company: company ?? undefined,
      });
      setSuggestion(response.data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'The copilot could not be reached. Please retry.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="AI call copilot" className="panel flex min-h-[320px] flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="flex items-center gap-2 font-display text-sm font-semibold">
          <Bot className="size-4 text-accent" />
          Call copilot
        </p>
        <Badge variant="outline">AI</Badge>
      </header>

      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">
          {!suggestion && !loading && !error ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full flex-col items-start justify-between gap-4"
            >
              <p className="text-sm leading-relaxed text-muted">
                Ask for a response, the reason behind it, and one follow-up question. The copilot reads the
                stage, the prospect&apos;s latest words, and your notes.
              </p>
              {!hasContext ? (
                <p className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-signal" />
                  Record the prospect&apos;s words or a note first. The copilot will not invent them.
                </p>
              ) : null}
              <Button onClick={generate} disabled={!hasContext || loading} className="w-full">
                <Sparkles className="size-4" />
                Suggest a response
              </Button>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin" />
                Reading the stage and the prospect&apos;s words…
              </p>
              {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-1.5">
                  <div className="h-2 w-24 animate-pulse rounded bg-line" />
                  <div className="h-3 w-full animate-pulse rounded bg-line/70" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-line/70" />
                </div>
              ))}
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="flex items-start gap-2 rounded-lg border border-signal/20 bg-signal/5 px-3 py-2 text-xs leading-relaxed text-signal">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </p>
              <Button variant="outline" onClick={generate} disabled={loading} className="w-full">
                Retry
              </Button>
            </motion.div>
          ) : suggestion ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div>
                <p className="rule-label mb-1.5">Try saying</p>
                <p className="rounded-lg border border-accent/15 bg-accent-soft/60 p-3 text-sm leading-relaxed text-ink">
                  “{suggestion.suggestedResponse}”
                </p>
                {onUseResponse ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-7 px-2 text-xs"
                    onClick={() => onUseResponse(suggestion.suggestedResponse)}
                  >
                    <CornerDownRight className="size-3" />
                    Add to what happened
                  </Button>
                ) : null}
              </div>

              <div>
                <p className="rule-label mb-1">Why it fits</p>
                <p className="text-xs leading-relaxed text-muted">{suggestion.reason}</p>
              </div>

              <div>
                <p className="rule-label mb-1">Follow-up question</p>
                <p className="text-xs leading-relaxed text-ink">{suggestion.followUpQuestion}</p>
              </div>

              {suggestion.caution ? (
                <p className="flex items-start gap-2 rounded-lg bg-paper px-3 py-2 text-[11px] leading-relaxed text-muted">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0 text-signal" />
                  {suggestion.caution}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <span className={cn('font-mono text-[9px] uppercase tracking-wider', suggestion.demo ? 'text-signal' : 'text-muted')}>
                  {suggestion.demo ? 'Demo output' : `${suggestion.provider} · ${suggestion.model}`}
                </span>
                <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
                  Regenerate
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}
