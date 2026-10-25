# Architecture

## Flow
1. The React frontend uses a central API client (`src/lib/api.ts`) that calls the Express backend via `VITE_API_BASE_URL`.
2. The backend validates requests with Zod, applies CORS and rate limiting, and routes to services.
3. Services read/write calls and stage results through a repository interface (`backend/src/db/types.ts`).
   - In development: `FileCallRepository` persists to `data/callpilot.json`
   - In production: `SupabaseCallRepository` uses the service-role key against PostgreSQL
4. The AI copilot calls `POST /api/ai/suggest`. The backend builds a stage-aware prompt (informed by the transcript patterns) and calls the configured LLM provider (Gemini by default) through a provider abstraction. If no key is present, it returns a clearly labelled demo response.
5. Stage navigation prevents accidental loss of unsaved notes; closing a call marks it read-only and records the final outcome.

## Backend structure
- `src/config/env.ts` – validated environment
- `src/db/` – types, repositories, wiring
- `src/llm/` – prompts, providers, errors
- `src/middleware/` – error handling, rate limiting
- `src/routes/` – health, calls, ai
- `src/schemas/` – Zod schemas
- `src/services/` – calls and AI services
- `src/tests/` – API tests

## Frontend structure
- `src/components/` – shell, stage rail, copilot, dialogs, UI primitives
- `src/data/stages.ts` – the eight official stages with listen-for, prompts, guidance
- `src/lib/` – API client, types, formatting
- `src/pages/` – Dashboard, LiveCall, History, CallDetails

## Database
See `database/schema.sql` for tables `calls` and `call_stage_results`, enums, constraints, triggers, indexes, and RLS guidance.

## Security
- Browser never has database or LLM secrets
- Backend-only service credentials
- Production refuses `file` driver and `demo` LLM
- No sensitive data logged
