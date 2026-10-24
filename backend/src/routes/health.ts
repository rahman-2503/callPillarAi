import { Router } from 'express';
import { callsService } from '../services/callsService.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res, next) => {
  const meta = callsService.meta();
  try {
    await callsService.counts();
    res.status(200).json({
      status: 'ok',
      service: 'callpilot-api',
      uptimeSeconds: Math.round(process.uptime()),
      database: { driver: meta.database, reachable: true },
      llm: { provider: meta.llmProvider, configured: meta.llmConfigured },
      time: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      service: 'callpilot-api',
      database: { driver: meta.database, reachable: false },
      llm: { provider: meta.llmProvider, configured: meta.llmConfigured },
      time: new Date().toISOString(),
    });
  }
});
