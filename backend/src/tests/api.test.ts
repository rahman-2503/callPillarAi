import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let app: import('express').Express;
let dataDir: string;

beforeAll(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'callpilot-'));
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_DRIVER = 'file';
  process.env.DATA_DIR = dataDir;
  process.env.LLM_PROVIDER = 'demo';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  const { createApp } = await import('../app.js');
  app = createApp();
});

afterAll(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

async function createCall() {
  const response = await request(app)
    .post('/api/calls')
    .send({ title: 'Test call', company: 'Kalyx Enterprises', prospectName: 'Senthil', prospectRole: 'Director' });
  return response.body.data as { id: string; currentStage: string };
}

describe('health', () => {
  it('reports database and LLM status without secrets', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database.driver).toBe('file');
    expect(JSON.stringify(response.body)).not.toMatch(/key|secret|password/i);
  });
});

describe('calls', () => {
  it('creates a call at the opening stage', async () => {
    const response = await request(app).post('/api/calls').send({ title: 'First call' });
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('in_progress');
    expect(response.body.data.currentStage).toBe('opening');
  });

  it('rejects an empty title', async () => {
    const response = await request(app).post('/api/calls').send({ title: '   ' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('saves a stage and advances the call', async () => {
    const call = await createCall();
    const response = await request(app)
      .post(`/api/calls/${call.id}/stages`)
      .send({
        stageId: 'opening',
        whatHappened: 'Reached the director directly',
        prospectStatement: 'Speaking, tell me',
        stageOutcome: 'reached_right_person',
        advance: true,
      });
    expect(response.status).toBe(200);
    expect(response.body.data.call.currentStage).toBe('purpose');
    expect(response.body.data.stageResult.stageOrder).toBe(1);
  });

  it('updates an existing stage instead of duplicating it', async () => {
    const call = await createCall();
    await request(app).post(`/api/calls/${call.id}/stages`).send({ stageId: 'purpose', whatHappened: 'first' });
    await request(app).post(`/api/calls/${call.id}/stages`).send({ stageId: 'purpose', whatHappened: 'second' });
    const response = await request(app).get(`/api/calls/${call.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.stageResults).toHaveLength(1);
    expect(response.body.data.stageResults[0].whatHappened).toBe('second');
  });

  it('rejects a stage with no content', async () => {
    const call = await createCall();
    const response = await request(app).post(`/api/calls/${call.id}/stages`).send({ stageId: 'opening' });
    expect(response.status).toBe(400);
  });

  it('closes a call and blocks further stage edits', async () => {
    const call = await createCall();
    const close = await request(app).post(`/api/calls/${call.id}/close`).send({ finalOutcome: 'not_interested' });
    expect(close.status).toBe(200);
    expect(close.body.data.status).toBe('completed');
    expect(close.body.data.finalOutcome).toBe('not_interested');

    const edit = await request(app).post(`/api/calls/${call.id}/stages`).send({ stageId: 'opening', whatHappened: 'late' });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('CALL_CLOSED');
  });

  it('lists calls with search, filter, sorting and pagination', async () => {
    const call = await createCall();
    await request(app).post(`/api/calls/${call.id}/close`).send({ finalOutcome: 'follow_up' });
    const response = await request(app).get('/api/calls').query({ search: 'Kalyx', outcome: 'follow_up', limit: 5 });
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.pagination.limit).toBe(5);
  });

  it('returns 404 for an unknown call', async () => {
    const response = await request(app).get('/api/calls/00000000-0000-4000-8000-000000000000');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CALL_NOT_FOUND');
  });

  it('rejects a malformed id', async () => {
    const response = await request(app).get('/api/calls/not-a-uuid');
    expect(response.status).toBe(400);
  });
});

describe('ai', () => {
  it('returns a labelled demo suggestion when no real provider is configured', async () => {
    const response = await request(app)
      .post('/api/ai/suggest')
      .send({ stageId: 'purpose', prospectStatement: 'Accounting for what? We have a CA.' });
    expect(response.status).toBe(200);
    expect(response.body.data.demo).toBe(true);
    expect(response.body.data.suggestedResponse).toBeTruthy();
    expect(response.body.data.caution).toMatch(/demo/i);
  });

  it('refuses to invent a suggestion without context', async () => {
    const response = await request(app).post('/api/ai/suggest').send({ stageId: 'purpose' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INSUFFICIENT_CONTEXT');
  });
});
