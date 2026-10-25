import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Call,
  CallRepository,
  CallWithStages,
  CreateCallInput,
  FinalOutcome,
  ListCallsQuery,
  ListCallsResult,
  StageResult,
  UpsertStageInput,
} from './types.js';

type CallRow = {
  id: string;
  title: string;
  prospect_name: string | null;
  company: string | null;
  prospect_role: string | null;
  status: Call['status'];
  current_stage: Call['currentStage'];
  final_outcome: Call['finalOutcome'];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type StageRow = {
  id: string;
  call_id: string;
  stage_id: StageResult['stageId'];
  stage_order: number;
  prospect_statement: string | null;
  what_happened: string | null;
  stage_outcome: string | null;
  created_at: string;
  updated_at: string;
};

const STAGE_ORDER: Record<StageResult['stageId'], number> = {
  opening: 1,
  purpose: 2,
  permission: 3,
  their_business: 4,
  their_need: 5,
  objection: 6,
  next_step: 7,
  close: 8,
};

const toCall = (row: CallRow): Call => ({
  id: row.id,
  title: row.title,
  prospectName: row.prospect_name,
  company: row.company,
  prospectRole: row.prospect_role,
  status: row.status,
  currentStage: row.current_stage,
  finalOutcome: row.final_outcome,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
});

const toStage = (row: StageRow): StageResult => ({
  id: row.id,
  callId: row.call_id,
  stageId: row.stage_id,
  stageOrder: row.stage_order,
  prospectStatement: row.prospect_statement,
  whatHappened: row.what_happened,
  stageOutcome: row.stage_outcome,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SupabaseCallRepository implements CallRepository {
  readonly kind = 'supabase' as const;
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private fail(context: string, error: { message: string } | null): never {
    throw new Error(`Database error (${context}): ${error?.message ?? 'unknown error'}`);
  }

  async createCall(input: CreateCallInput): Promise<Call> {
    const { data, error } = await this.client
      .from('calls')
      .insert({
        title: input.title.trim(),
        prospect_name: input.prospectName?.trim() || null,
        company: input.company?.trim() || null,
        prospect_role: input.prospectRole?.trim() || null,
        status: 'in_progress',
        current_stage: 'opening',
      })
      .select('*')
      .single();
    if (error || !data) this.fail('createCall', error);
    return toCall(data as CallRow);
  }

  async listCalls(query: ListCallsQuery): Promise<ListCallsResult> {
    let request = this.client.from('calls').select('*', { count: 'exact' });
    if (query.status) request = request.eq('status', query.status);
    if (query.outcome) request = request.eq('final_outcome', query.outcome);
    if (query.search) {
      const escaped = query.search.replace(/[%_,]/g, ' ');
      request = request.or(
        `title.ilike.%${escaped}%,prospect_name.ilike.%${escaped}%,company.ilike.%${escaped}%`,
      );
    }
    request = request
      .order('created_at', { ascending: query.sort === 'oldest' })
      .range(query.offset, query.offset + query.limit - 1);
    const { data, error, count } = await request;
    if (error) this.fail('listCalls', error);
    return {
      calls: (data ?? []).map((row) => toCall(row as CallRow)),
      total: count ?? 0,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getCall(id: string): Promise<CallWithStages | null> {
    const { data: callRow, error: callError } = await this.client.from('calls').select('*').eq('id', id).maybeSingle();
    if (callError) this.fail('getCall', callError);
    if (!callRow) return null;
    const { data: stageRows, error: stageError } = await this.client
      .from('call_stage_results')
      .select('*')
      .eq('call_id', id)
      .order('stage_order', { ascending: true });
    if (stageError) this.fail('getCall.stages', stageError);
    return {
      ...toCall(callRow as CallRow),
      stageResults: (stageRows ?? []).map((row) => toStage(row as StageRow)),
    };
  }

  async upsertStage(callId: string, input: UpsertStageInput) {
    const { data: callRow, error: callError } = await this.client.from('calls').select('*').eq('id', callId).maybeSingle();
    if (callError) this.fail('upsertStage.call', callError);
    if (!callRow) return null;
    const call = callRow as CallRow;
    if (call.status === 'completed') throw new Error('CALL_CLOSED');

    const now = new Date().toISOString();
    const { data: stageRow, error: stageError } = await this.client
      .from('call_stage_results')
      .upsert(
        {
          call_id: callId,
          stage_id: input.stageId,
          stage_order: STAGE_ORDER[input.stageId],
          prospect_statement: input.prospectStatement ?? null,
          what_happened: input.whatHappened ?? null,
          stage_outcome: input.stageOutcome ?? null,
          updated_at: now,
        },
        { onConflict: 'call_id,stage_id' },
      )
      .select('*')
      .single();
    if (stageError || !stageRow) this.fail('upsertStage.stage', stageError);

    const patch: Record<string, unknown> = { updated_at: now };
    if (input.advance) {
      const nextOrder = Math.min(STAGE_ORDER[input.stageId] + 1, 8);
      patch.current_stage = Object.keys(STAGE_ORDER).find(
        (key) => STAGE_ORDER[key as StageResult['stageId']] === nextOrder,
      );
    }
    const { data: updatedRow, error: updateError } = await this.client
      .from('calls')
      .update(patch)
      .eq('id', callId)
      .select('*')
      .single();
    if (updateError || !updatedRow) this.fail('upsertStage.callUpdate', updateError);

    return { call: toCall(updatedRow as CallRow), stageResult: toStage(stageRow as StageRow) };
  }

  async closeCall(callId: string, outcome: FinalOutcome): Promise<Call | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('calls')
      .update({
        status: 'completed',
        final_outcome: outcome,
        current_stage: 'close',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', callId)
      .select('*')
      .maybeSingle();
    if (error) this.fail('closeCall', error);
    return data ? toCall(data as CallRow) : null;
  }

  async counts() {
    const [total, completed] = await Promise.all([
      this.client.from('calls').select('*', { count: 'exact', head: true }),
      this.client.from('calls').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);
    if (total.error) this.fail('counts.total', total.error);
    if (completed.error) this.fail('counts.completed', completed.error);
    const totalCount = total.count ?? 0;
    const completedCount = completed.count ?? 0;
    return { total: totalCount, completed: completedCount, inProgress: totalCount - completedCount };
  }
}
