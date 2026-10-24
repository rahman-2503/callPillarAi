const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorPayload {
  error?: { code?: string; message?: string; details?: unknown };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
    if (!response.ok) {
      let payload: ErrorPayload = {};
      try {
        payload = (await response.json()) as ErrorPayload;
      } catch {
        // Non-JSON error bodies fall through to the generic message.
      }
      throw new ApiError(
        response.status,
        payload.error?.code ?? 'REQUEST_FAILED',
        payload.error?.message ?? `Request failed with status ${response.status}`,
        payload.error?.details,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please retry.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check that the backend is running.');
  } finally {
    clearTimeout(timeout);
  }
}

import type {
  Call,
  CallCounts,
  CallWithStages,
  FinalOutcome,
  HealthStatus,
  ListCallsResponse,
  Suggestion,
  StageId,
  StageResult,
} from './types';

export interface ListCallsParams {
  search?: string;
  status?: 'in_progress' | 'completed';
  outcome?: FinalOutcome;
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}

export const api = {
  health: () => request<HealthStatus>('/health'),

  listCalls: (params: ListCallsParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) query.set(key, String(value));
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request<ListCallsResponse>(`/api/calls${suffix}`);
  },

  counts: async (): Promise<CallCounts> => {
    const [all, inProgress, completed] = await Promise.all([
      request<ListCallsResponse>('/api/calls?limit=1'),
      request<ListCallsResponse>('/api/calls?limit=1&status=in_progress'),
      request<ListCallsResponse>('/api/calls?limit=1&status=completed'),
    ]);
    return { total: all.pagination.total, inProgress: inProgress.pagination.total, completed: completed.pagination.total };
  },

  getCall: (id: string) => request<{ data: CallWithStages }>(`/api/calls/${id}`),

  createCall: (input: {
    title: string;
    prospectName?: string;
    company?: string;
    prospectRole?: string;
  }) => request<{ data: Call }>('/api/calls', { method: 'POST', body: JSON.stringify(input) }),

  saveStage: (
    callId: string,
    input: {
      stageId: StageId;
      prospectStatement?: string;
      whatHappened?: string;
      stageOutcome?: string;
      advance?: boolean;
    },
  ) =>
    request<{ data: { call: Call; stageResult: StageResult } }>(`/api/calls/${callId}/stages`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  closeCall: (callId: string, finalOutcome: FinalOutcome) =>
    request<{ data: Call }>(`/api/calls/${callId}/close`, {
      method: 'POST',
      body: JSON.stringify({ finalOutcome }),
    }),

  suggest: (input: {
    stageId: StageId;
    stagePurpose?: string;
    prospectStatement?: string;
    callNotes?: string;
    callTitle?: string;
    company?: string;
  }) =>
    request<{ data: Suggestion }>('/api/ai/suggest', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
