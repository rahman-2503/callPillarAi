# Interview Questions and Answers

## Project overview
**Q: What did you build?**  
A: CallPilot AI, a live cold-call assistant that walks through the official eight-stage cold-call structure, captures the prospect's exact words, records outcomes, and provides a contextual AI copilot. All data is persisted.

**Q: Why did you build it?**  
A: To enforce structure on cold calls to Indian businesses, prevent losing the prospect's own words, and keep a reviewable record so the next call starts from facts rather than memory.

## React and TypeScript
**Q: Why React with TypeScript?**  
A: Type safety across API types and UI state, good component composition, and a mature ecosystem (React Router, Vite).

**Q: How did you keep the UI maintainable?**  
A: Small components (shell, stage rail, copilot, UI primitives), shared types, and data-driven stage definitions.

## API design
**Q: How did you design the REST API?**  
A: Resource-based routes under `/api/calls`, clear methods (`POST` to create/save/close, `GET` to read), consistent JSON responses, and proper status codes (201, 400, 404, 409, 422, 503, 504).

**Q: How do you handle validation?**  
A: Zod schemas validate body/query/params on the backend. Invalid requests return 400 with field-level details.

## Express
**Q: What middleware did you use?**  
A: CORS (restricted to frontend origin), JSON body parsing with a size limit, rate limiting, a centralized error handler, and a 404 handler.

## Database
**Q: Why Supabase/PostgreSQL?**  
A: Relational model fits calls and stage results (one-to-many), constraints and enums enforce valid states, triggers maintain timestamps, indexes help queries.

**Q: How did you model the stages?**  
A: `calls` tracks current stage and status/outcome; `call_stage_results` stores one row per (call, stage) with order, prospect statement, what happened, and stage outcome.

## Frontend/backend communication
**Q: How does the frontend talk to the backend?**  
A: A central API client with base URL from `VITE_API_BASE_URL`, request timeouts, typed responses, and consistent error handling. In dev it can use Vite proxy.

## LLM integration
**Q: How did you integrate the LLM safely?**  
A: The backend calls the provider using server-side keys. A provider abstraction allows swapping models/providers. Prompts include stage context and transcript-informed guidance. Responses are validated. No keys go to the browser.

**Q: What if the model fails or isn't configured?**  
A: The backend returns honest errors (503 unavailable, 504 timeout) and the UI shows retry options. A clearly-labelled demo provider is used only when no key is present and is refused in production.

## Security
**Q: How do you protect secrets?**  
A: Keys live in backend env, never prefixed `VITE_`, never logged, and only `.env.example` with placeholders is committed. RLS is enabled on Supabase tables.

**Q: How do you prevent bad requests?**  
A: Zod validation, stage content required before saving, closed calls cannot be edited, CORS, and rate limiting.

## Testing
**Q: What did you test?**  
A: Backend API (health, create/list/get, stage upsert/advance, close guard, filters/pagination, AI paths), frontend build, and Playwright E2E across desktop and mobile for the full flow.

## Deployment
**Q: Where would you deploy?**  
A: Vercel for the frontend, Render for the backend, Supabase for the database. The app reads `VITE_API_BASE_URL` at build/runtime for the frontend.

## Trade-offs and improvements
**Q: What trade-offs did you make?**  
A: Added a file DB for offline/local dev while requiring Supabase in production; kept a demo LLM for testability but blocked it in production; enforced fixed eight stages to match the assessment exactly.

**Q: What would you improve next?**  
A: Add authentication if multi-user, tighten RLS policies, add pagination/caching, support audio notes, and add more granular telemetry without logging PII.
