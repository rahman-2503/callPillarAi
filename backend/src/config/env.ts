import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_DRIVER: z.enum(['supabase', 'file']).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  LLM_PROVIDER: z.enum(['gemini', 'mistral', 'cerebras', 'openai', 'demo']).default('demo'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  DATA_DIR: z.string().default('./data'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

const raw = parsed.data;

const hasSupabase = Boolean(raw.SUPABASE_URL && raw.SUPABASE_SERVICE_ROLE_KEY);
const driver = raw.DATABASE_DRIVER ?? (hasSupabase ? 'supabase' : 'file');

if (driver === 'supabase' && !hasSupabase) {
  throw new Error('DATABASE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

if (raw.NODE_ENV === 'production' && driver === 'file') {
  throw new Error('Refusing to start in production with the file database driver. Configure Supabase.');
}

if (raw.NODE_ENV === 'production' && raw.LLM_PROVIDER === 'demo') {
  throw new Error('Refusing to start in production with the demo LLM provider. Configure a real provider.');
}

export const env = {
  ...raw,
  DATABASE_DRIVER: driver,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  hasSupabase,
  hasLlmKey: Boolean(raw.LLM_API_KEY),
};

export type Env = typeof env;
