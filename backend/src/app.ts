import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimit } from './middleware/rateLimit.js';
import { aiRouter } from './routes/ai.js';
import { callsRouter } from './routes/calls.js';
import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const origins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(rateLimit);

  app.use('/', healthRouter);
  app.use('/api/calls', callsRouter);
  app.use('/api/ai', aiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
