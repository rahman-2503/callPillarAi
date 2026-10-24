import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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

interface FileState {
  calls: Call[];
  stageResults: StageResult[];
}

const now = () => new Date().toISOString();

export class FileCallRepository implements CallRepository {
  readonly kind = 'file' as const;
  private readonly filePath: string;
  private state: FileState | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = join(dataDir, 'callpilot.json');
  }

  private async load(): Promise<FileState> {
    if (this.state) return this.state;
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as FileState;
      this.state = { calls: parsed.calls ?? [], stageResults: parsed.stageResults ?? [] };
    } catch {
      this.state = { calls: [], stageResults: [] };
    }
    return this.state;
  }

  private async persist(): Promise<void> {
    const state = await this.load();
    const snapshot = JSON.stringify(state, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const temp = `${this.filePath}.tmp`;
      await writeFile(temp, snapshot, 'utf8');
      await rename(temp, this.filePath);
    });
    await this.writeQueue;
  }

  async createCall(input: CreateCallInput): Promise<Call> {
    const state = await this.load();
    const timestamp = now();
    const call: Call = {
      id: randomUUID(),
      title: input.title.trim(),
      prospectName: input.prospectName?.trim() || null,
      company: input.company?.trim() || null,
      prospectRole: input.prospectRole?.trim() || null,
      status: 'in_progress',
      currentStage: 'opening',
      finalOutcome: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };
    state.calls.unshift(call);
    await this.persist();
    return call;
  }

  async listCalls(query: ListCallsQuery): Promise<ListCallsResult> {
    const state = await this.load();
    let calls = [...state.calls];
    if (query.status) calls = calls.filter((call) => call.status === query.status);
    if (query.outcome) calls = calls.filter((call) => call.finalOutcome === query.outcome);
    if (query.search) {
      const needle = query.search.trim().toLowerCase();
      calls = calls.filter((call) =>
        [call.title, call.prospectName, call.company].some((value) => value?.toLowerCase().includes(needle)),
      );
    }
    calls.sort((a, b) => {
      const delta = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return query.sort === 'oldest' ? -delta : delta;
    });
    const total = calls.length;
    return { calls: calls.slice(query.offset, query.offset + query.limit), total, limit: query.limit, offset: query.offset };
  }

  async getCall(id: string): Promise<CallWithStages | null> {
    const state = await this.load();
    const call = state.calls.find((item) => item.id === id);
    if (!call) return null;
    const stageResults = state.stageResults
      .filter((item) => item.callId === id)
      .sort((a, b) => a.stageOrder - b.stageOrder);
    return { ...call, stageResults };
  }

  async upsertStage(callId: string, input: UpsertStageInput) {
    const state = await this.load();
    const call = state.calls.find((item) => item.id === callId);
    if (!call) return null;
    if (call.status === 'completed') throw new Error('CALL_CLOSED');

    const stageOrder = STAGE_ORDER[input.stageId];
    const timestamp = now();
    let stageResult = state.stageResults.find((item) => item.callId === callId && item.stageId === input.stageId);

    if (stageResult) {
      stageResult.prospectStatement = input.prospectStatement ?? stageResult.prospectStatement;
      stageResult.whatHappened = input.whatHappened ?? stageResult.whatHappened;
      stageResult.stageOutcome = input.stageOutcome ?? stageResult.stageOutcome;
      stageResult.updatedAt = timestamp;
    } else {
      stageResult = {
        id: randomUUID(),
        callId,
        stageId: input.stageId,
        stageOrder,
        prospectStatement: input.prospectStatement ?? null,
        whatHappened: input.whatHappened ?? null,
        stageOutcome: input.stageOutcome ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.stageResults.push(stageResult);
    }

    if (input.advance) {
      const nextOrder = Math.min(stageOrder + 1, STAGE_IDS.length);
      call.currentStage = STAGE_IDS[nextOrder - 1];
    }
    call.updatedAt = timestamp;
    await this.persist();
    return { call, stageResult };
  }

  async closeCall(callId: string, outcome: FinalOutcome): Promise<Call | null> {
    const state = await this.load();
    const call = state.calls.find((item) => item.id === callId);
    if (!call) return null;
    const timestamp = now();
    call.status = 'completed';
    call.finalOutcome = outcome;
    call.currentStage = 'close';
    call.updatedAt = timestamp;
    call.completedAt = timestamp;
    await this.persist();
    return call;
  }

  async counts() {
    const state = await this.load();
    const completed = state.calls.filter((call) => call.status === 'completed').length;
    return { total: state.calls.length, completed, inProgress: state.calls.length - completed };
  }
}

import { STAGE_IDS } from './types.js';

const STAGE_ORDER: Record<(typeof STAGE_IDS)[number], number> = {
  opening: 1,
  purpose: 2,
  permission: 3,
  their_business: 4,
  their_need: 5,
  objection: 6,
  next_step: 7,
  close: 8,
};
