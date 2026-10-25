# CallPilot AI
Intelligent Cold-Call Assistant built for the DeepThought Forward Deployed Engineer assessment.

## Overview
CallPilot AI guides a caller through the official eight-stage cold-call structure (Opening, Purpose, Permission, Their business, Their need, in their words, Objection, Next step, Close). Every stage shows the purpose, what to listen for, example prospect statements, guidance, and a place to record the prospect's exact words and what happened. The app keeps a durable record in Supabase (or a local file store for development), shows call history, and includes a contextual AI copilot backed by a real LLM provider.

## Key features
- **Dashboard** with call counts and recent history (no fabricated metrics)
- **Live call assistant** for all eight official stages with unsaved-change guards and stage navigation
- **AI call copilot** that reads stage context and the prospect's words; clearly labels demo vs real output
- **Call history** with search, filtering, sorting, pagination
- **Call details** with stage-by-stage notes and the prospect's words preserved
- **Persistent storage** via Supabase PostgreSQL with validation and RLS guidance
- **Real LLM integration** through the backend (Gemini default with a provider abstraction and a clearly-labelled demo fallback only when no key is present)
- **Testing**: Vitest + Supertest for the API, Playwright for end-to-end flows across desktop and mobile
- **Responsive, accessible UI** with reduced-motion support

## Technology stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide React, Motion for React
- **Backend**: Node.js, Express, TypeScript, Zod
- **Database**: Supabase PostgreSQL
- **LLM**: Google Gemini (configurable to Mistral, Cerebras, OpenAI)
- **Testing**: Vitest, Supertest, Playwright
- **Deployment**: Vercel (frontend), Render (backend), Supabase (database)

## Project structure
```
callpilot-ai/
  backend/        # Express API, services, DB, LLM integration
  database/       # schema.sql, seed.sql
  docs/           # architecture, API, demo guide, technical explanation, interview questions, checklist
  e2e/            # (copied to frontend/e2e during setup)
  frontend/       # React + Vite app
```

## Local development
### Backend
```bash
cd callpilot-ai/backend
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd callpilot-ai/frontend
cp .env.example .env
npm install
npm run dev
```
Open http://localhost:5173. With `VITE_API_BASE_URL` unset the dev server proxies to `http://localhost:4000`.

## Environment variables
See `backend/.env.example` and `frontend/.env.example`. Never commit real secrets.

## Testing
```bash
# Backend unit/integration
cd callpilot-ai/backend && npm test

# Frontend build
cd callpilot-ai/frontend && npm run build

# E2E (starts backend/frontend via Playwright webServer)
cd callpilot-ai/frontend && npx playwright test
```

## Database setup (Supabase)
1. Create a Supabase project
2. Run `database/schema.sql` in the SQL editor
3. Set `DATABASE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in the backend env
4. Keep the service role key server-side only; RLS is enabled with no permissive public policy

## Deployment
- **Backend (Render)**: set build command `npm install && npm run build`, start `npm start`, add production env vars
- **Frontend (Vercel)**: build `npm run build`, output `dist`, set `VITE_API_BASE_URL` to the Render URL

## Security
- API keys live in backend env only (never prefixed `VITE_` or sent to the browser)
- CORS is configured to the frontend origin
- Request validation with Zod, rate limiting, consistent error handling
- No secrets in logs or source files
- `.env.example` contains placeholders only

## Notes
- The 100 cold-call transcripts are in `cold-call-transcripts-100/` for reference only; no raw transcripts are published in the app.
- Stage structure and wording follow the official DeepThought assessment.
- A real Gemini API key is configured for testing; do not share it outside this environment.
