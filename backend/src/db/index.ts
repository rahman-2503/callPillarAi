import { env } from '../config/env.js';
import { FileCallRepository } from './fileRepository.js';
import { SupabaseCallRepository } from './supabaseRepository.js';
import type { CallRepository } from './types.js';

export const repository: CallRepository =
  env.DATABASE_DRIVER === 'supabase'
    ? new SupabaseCallRepository(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string)
    : new FileCallRepository(env.DATA_DIR);

export type { CallRepository };
