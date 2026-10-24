import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

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

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request did not pass validation',
        details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';

  if (message === 'CALL_CLOSED') {
    res.status(409).json({ error: { code: 'CALL_CLOSED', message: 'This call is already closed' } });
    return;
  }

  if (message.startsWith('Database error')) {
    if (!env.isProduction) console.error('[database]', message);
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The call record could not be read or written. Please retry.',
      },
    });
    return;
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ error: { code: 'MALFORMED_JSON', message: 'The request body is not valid JSON' } });
    return;
  }

  if (!env.isProduction) console.error('[api]', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server' } });
}
