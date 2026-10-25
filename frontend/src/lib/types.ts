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
export type CallStatus = 'in_progress' | 'completed';

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

export interface ListCallsResponse {
  data: Call[];
  pagination: { total: number; limit: number; offset: number };
}

export interface Suggestion {
  suggestedResponse: string;
  reason: string;
  followUpQuestion: string;
  caution?: string | null;
  provider: string;
  model: string;
  demo: boolean;
}

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  uptimeSeconds?: number;
  database: { driver: 'file' | 'supabase'; reachable: boolean };
  llm: { provider: string; configured: boolean };
}

export interface CallCounts {
  total: number;
  completed: number;
  inProgress: number;
}
