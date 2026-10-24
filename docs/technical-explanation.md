# Technical Explanation

## Problem
Cold calls to Indian businesses often lose structure. Without a record, the next call starts from memory. The assessment asks for a tool that enforces the official eight-stage flow, captures the prospect's exact words, and produces a reviewable record.

## Architecture
- **Frontend (React + TypeScript + Vite)**: Premium SaaS UI with the eight stages, copilot panel, history, and details. Uses Motion for subtle transitions and respects `prefers-reduced-motion`.
- **Backend (Express + TypeScript)**: REST API with validation (Zod), CORS, rate limiting, and structured errors. Routes delegate to services; services use a repository interface.
- **Database (Supabase PostgreSQL)**: `calls` and `call_stage_results` with enums, constraints, triggers, indexes. RLS enabled; the backend uses the service-role key (never exposed to the browser).
- **LLM**: Provider abstraction supports Gemini, Mistral, Cerebras, OpenAI. Prompts are stage-aware and grounded in transcript patterns. A demo provider returns clearly labelled sample text only when no real key is configured.

## Frontend design
- Information hierarchy optimized for mid-call use
- Stage rail, purpose, listen-for, guidance, and record fields
- Unsaved-change guards (beforeunload + in-app dialog)
- Copilot panel shows context, suggestion, reason, follow-up, caution, and provider label
- History with search/filter/sort/pagination; details page shows stage-by-stage notes

## Backend API
Implements `GET /health`, `POST /api/calls`, `GET /api/calls`, `GET /api/calls/:id`, `POST /api/calls/:id/stages`, `POST /api/calls/:id/close`, `POST /api/ai/suggest` as specified. Validation prevents empty stages and closing already-closed calls.

## Database schema
- `calls`: title, prospect/company/role, status, current_stage, final_outcome, timestamps
- `call_stage_results`: one per (call, stage), stage_order, prospect_statement, what_happened, stage_outcome
- Constraints prevent invalid states; triggers keep `updated_at` current

## LLM integration
Backend constructs system/user prompts with stage, purpose, prospect words, and notes. Responses are validated against a Zod schema. Failures return honest errors (timeout/unavailable/insufficient context). Keys stay in backend env.

## Security
- Secrets server-side only
- No `VITE_` secrets
- CORS restricted to frontend origin
- Input validation and rate limiting
- Production guards against file DB and demo LLM

## Testing
- Vitest + Supertest: health, CRUD, stage upsert/advance, close with guard, list filters/pagination, AI success and insufficient-context cases
- Playwright: full eight-stage flow, copilot, persistence across reload, history search, details, responsive/mobile

## Deployment
Vercel (frontend), Render (backend), Supabase (database). Environment variables documented; no secrets committed.

## Trade-offs
- File store allows local dev without Supabase, but production requires Supabase
- Demo fallback makes the UI testable without keys, but is clearly labelled and blocked in production
- One record per stage (upsert) prevents duplication and matches the "record" model
- Stage order is fixed to match the official structure rather than being customizable
