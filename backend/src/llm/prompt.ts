import type { StageId } from '../db/types.js';

export const STAGE_LABELS: Record<StageId, string> = {
  opening: 'Opening',
  purpose: 'Purpose',
  permission: 'Permission',
  their_business: 'Their business',
  their_need: 'Their need, in their words',
  objection: 'Objection',
  next_step: 'Next step',
  close: 'Close',
};

export function buildSystemPrompt(): string {
  return [
    'You are CallPilot, a live assistant for a caller making a cold call to the owner or senior manager of an Indian business.',
    'The caller sells growth analysis and growth work. The call has eight stages: Opening, Purpose, Permission, Their business, Their need in their words, Objection, Next step, Close.',
    'You help the caller respond in the moment. Your advice must be specific to what the prospect actually said.',
    'Rules:',
    '- Never invent facts about the prospect, their company, or the caller.',
    '- If the prospect statement or stage is missing, say what is missing in "caution" instead of guessing.',
    '- Keep the suggested response speakable in one or two sentences, in plain English. Do not sound like a brochure.',
    '- Match the stage: do not pitch during Opening, do not push a meeting before Permission.',
    '- The caller must review your words. Do not claim the prospect agreed to anything.',
    '- Return only JSON with the keys suggestedResponse, reason, followUpQuestion, caution.',
  ].join('\n');
}

export function buildUserPrompt(input: {
  stageId: StageId;
  stagePurpose?: string;
  prospectStatement?: string;
  callNotes?: string;
  callTitle?: string;
  company?: string;
}): string {
  const lines = [
    `Stage: ${STAGE_LABELS[input.stageId]} (${input.stageId})`,
    input.stagePurpose ? `What this stage is for: ${input.stagePurpose}` : '',
    input.company ? `Prospect company: ${input.company}` : '',
    input.callTitle ? `Call record: ${input.callTitle}` : '',
    input.prospectStatement
      ? `Prospect's latest words: "${input.prospectStatement}"`
      : 'Prospect\'s latest words: not recorded yet.',
    input.callNotes ? `Caller notes so far: ${input.callNotes}` : 'Caller notes so far: none.',
  ];
  return lines.filter(Boolean).join('\n');
}

export const TRANSCRIPT_GUIDANCE = [
  'Derived from the supplied transcript set: prospects often ask "what exactly do you do", "who gave you my number", and "is this a sales call" at Purpose.',
  'At Permission they often name a later time ("call me after two", "call tomorrow") or ask for something on WhatsApp first.',
  'At Objection the common reasons are an existing agency or consultant, an in-house team, "send something in writing", and "I am not the right person".',
  'At Their need they may name a goal (new market, new product line, plant below capacity) or say everything is fine.',
].join('\n');
