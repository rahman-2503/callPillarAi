import { z } from 'zod';
import { CALL_STATUSES, FINAL_OUTCOMES, STAGE_IDS } from '../db/types.js';

const trimmed = (max: number) => z.string().trim().max(max);

export const idParamSchema = z.object({
  id: z.string().uuid('A valid call id is required'),
});

export const createCallSchema = z.object({
  title: trimmed(120).min(1, 'Call title is required'),
  prospectName: trimmed(120).optional().nullable(),
  company: trimmed(160).optional().nullable(),
  prospectRole: trimmed(120).optional().nullable(),
});

export const stageIdSchema = z.enum(STAGE_IDS);

export const upsertStageSchema = z
  .object({
    stageId: stageIdSchema,
    prospectStatement: trimmed(4000).optional().nullable(),
    whatHappened: trimmed(2000).optional().nullable(),
    stageOutcome: trimmed(120).optional().nullable(),
    advance: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    const hasContent = Boolean(value.prospectStatement || value.whatHappened || value.stageOutcome);
    if (!hasContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Record the prospect statement, what happened, or a stage outcome before saving',
        path: ['whatHappened'],
      });
    }
  });

export const closeCallSchema = z.object({
  finalOutcome: z.enum(FINAL_OUTCOMES),
});

export const listCallsSchema = z.object({
  search: trimmed(120).optional(),
  status: z.enum(CALL_STATUSES).optional(),
  outcome: z.enum(FINAL_OUTCOMES).optional(),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const suggestSchema = z.object({
  stageId: stageIdSchema,
  stagePurpose: trimmed(400).optional(),
  prospectStatement: trimmed(2000).optional(),
  callNotes: trimmed(2000).optional(),
  callTitle: trimmed(120).optional(),
  company: trimmed(160).optional(),
});

export type CreateCallBody = z.infer<typeof createCallSchema>;
export type UpsertStageBody = z.infer<typeof upsertStageSchema>;
export type CloseCallBody = z.infer<typeof closeCallSchema>;
export type ListCallsInput = z.infer<typeof listCallsSchema>;
export type SuggestBody = z.infer<typeof suggestSchema>;
