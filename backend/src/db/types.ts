export const STAGE_IDS = [
  'opening',
  'purpose',
  'permission',
  'their_business',
  'their_need',
  'objection',
  'next_step',
  'close',
] as const;

export type StageId = (typeof STAGE_IDS)[number];

export const CALL_STATUSES = ['in_progress', 'completed'] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const FINAL_OUTCOMES = [
  'next_step_agreed',
  'agreed_to_receive_report',
  'interested',
  'follow_up',
  'call_again',
  'not_interested',
  'do_not_call',
  'wrong_person',
  'moved_company',
  'not_logged',
] as const;
export type FinalOutcome = (typeof FINAL_OUTCOMES)[number];

export interface Call {
  id: string;
  title: string;
  prospectName: string | null;
  company: string | null;
  prospectRole: string | null;
  status: CallStatus;
  currentStage: StageId;
  finalOutcome: FinalOutcome | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StageResult {
  id: string;
  callId: string;
  stageId: StageId;
  stageOrder: number;
  prospectStatement: string | null;
  whatHappened: string | null;
  stageOutcome: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallWithStages extends Call {
  stageResults: StageResult[];
}

export interface CreateCallInput {
  title: string;
  prospectName?: string | null;
  company?: string | null;
  prospectRole?: string | null;
}

export interface UpsertStageInput {
  stageId: StageId;
  prospectStatement?: string | null;
  whatHappened?: string | null;
  stageOutcome?: string | null;
  advance?: boolean;
}

export interface ListCallsQuery {
  search?: string;
  status?: CallStatus;
  outcome?: FinalOutcome;
  sort?: 'newest' | 'oldest';
  limit: number;
  offset: number;
}

export interface ListCallsResult {
  calls: Call[];
  total: number;
  limit: number;
  offset: number;
}

export interface CallRepository {
  readonly kind: 'supabase' | 'file';
  createCall(input: CreateCallInput): Promise<Call>;
  listCalls(query: ListCallsQuery): Promise<ListCallsResult>;
  getCall(id: string): Promise<CallWithStages | null>;
  upsertStage(callId: string, input: UpsertStageInput): Promise<{ call: Call; stageResult: StageResult } | null>;
  closeCall(callId: string, outcome: FinalOutcome): Promise<Call | null>;
  counts(): Promise<{ total: number; completed: number; inProgress: number }>;
}
