import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  entry.count += 1;
  if (entry.count > env.RATE_LIMIT_PER_MINUTE) {
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a minute.' } });
    return;
  }
  next();
}
