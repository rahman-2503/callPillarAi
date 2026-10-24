import { env } from '../config/env.js';
import { repository } from '../db/index.js';
import type {
  Call,
  CallWithStages,
  CreateCallInput,
  FinalOutcome,
  ListCallsQuery,
  ListCallsResult,
  StageResult,
  UpsertStageInput,
} from '../db/types.js';

export const callsService = {
  create(input: CreateCallInput): Promise<Call> {
    return repository.createCall(input);
  },

  list(query: ListCallsQuery): Promise<ListCallsResult> {
    return repository.listCalls(query);
  },

  get(id: string): Promise<CallWithStages | null> {
    return repository.getCall(id);
  },

  upsertStage(callId: string, input: UpsertStageInput): Promise<{ call: Call; stageResult: StageResult } | null> {
    return repository.upsertStage(callId, input);
  },

  close(callId: string, outcome: FinalOutcome): Promise<Call | null> {
    return repository.closeCall(callId, outcome);
  },

  counts() {
    return repository.counts();
  },

  meta() {
    return {
      database: repository.kind,
      llmProvider: env.LLM_PROVIDER,
      llmConfigured: env.hasLlmKey,
    };
  },
};
