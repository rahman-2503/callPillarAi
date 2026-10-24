import { z } from 'zod';
import type { StageId } from '../db/types.js';

export const suggestionSchema = z.object({
  suggestedResponse: z.string().trim().min(1).max(1200),
  reason: z.string().trim().min(1).max(800),
  followUpQuestion: z.string().trim().min(1).max(400),
  caution: z.string().trim().max(400).nullable().optional(),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

export interface SuggestInput {
  stageId: StageId;
  stagePurpose?: string;
  prospectStatement?: string;
  callNotes?: string;
  callTitle?: string;
  company?: string;
}

export interface SuggestionResult extends Suggestion {
  provider: string;
  model: string;
  demo: boolean;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generate(input: SuggestInput): Promise<Suggestion>;
}
