# API Documentation

Base URL: backend origin (e.g. `http://localhost:4000` in dev). The frontend calls `/health`, `/api/calls`, `/api/ai` through a configurable base URL.

## Health
### GET /health
Returns service status, database reachability, and LLM configuration. Does not expose secrets.

**Response 200 (ok):**
```json
{
  "status": "ok",
  "service": "callpilot-api",
  "uptimeSeconds": 123,
  "database": { "driver": "file", "reachable": true },
  "llm": { "provider": "gemini", "configured": true },
  "time": "2026-10-24T00:00:00.000Z"
}
```

## Calls
### POST /api/calls
Create a new call at the opening stage.

**Body:**
```json
{ "title": "Kalyx Enterprises - follow-up", "prospectName": "Senthil", "company": "Kalyx Enterprises", "prospectRole": "Director" }
```
`title` required (1-120). Others optional.

**Response 201:**
```json
{ "data": { "id": "...", "title": "...", "status": "in_progress", "currentStage": "opening", "...": "..." } }
```

### GET /api/calls
List calls with pagination, search, filtering, sorting.

**Query:** `search`, `status` (in_progress|completed), `outcome` (see outcomes), `sort` (newest|oldest, default newest), `limit` (1-50, default 20), `offset` (default 0)

**Response 200:**
```json
{ "data": [ { "id": "...", "title": "...", "status": "in_progress", "currentStage": "purpose", "finalOutcome": null, "createdAt": "...", "updatedAt": "..." } ], "pagination": { "total": 10, "limit": 20, "offset": 0 } }
```

### GET /api/calls/:id
Get a call with all stage results.

**Response 200:** `{ "data": { "...call...": "...", "stageResults": [ { "id": "...", "stageId": "opening", "stageOrder": 1, "prospectStatement": "...", "whatHappened": "...", "stageOutcome": "...", "createdAt": "...", "updatedAt": "..." } ] } }`
**Response 404:** `{ "error": { "code": "CALL_NOT_FOUND", "message": "..." } }`

### POST /api/calls/:id/stages
Create or update a stage result. One record per (call, stage). If `advance: true`, moves `currentStage` to the next stage.

**Body:**
```json
{ "stageId": "opening", "prospectStatement": "...", "whatHappened": "...", "stageOutcome": "right_person", "advance": true }
```
At least one of `prospectStatement`, `whatHappened`, `stageOutcome` required. Closed calls return 409 `CALL_CLOSED`.

**Response 200:** `{ "data": { "call": { "...": "..." }, "stageResult": { "...": "..." } } }`

### POST /api/calls/:id/close
Close the call with a final outcome.

**Body:** `{ "finalOutcome": "next_step_agreed" }`  
Valid outcomes: `next_step_agreed`, `agreed_to_receive_report`, `interested`, `follow_up`, `call_again`, `not_interested`, `do_not_call`, `wrong_person`, `moved_company`, `not_logged`

**Response 200:** `{ "data": { "...", "status": "completed", "finalOutcome": "...", "completedAt": "...", "currentStage": "close" } }`

## AI Copilot
### POST /api/ai/suggest
Generate a contextual suggestion.

**Body:**
```json
{ "stageId": "objection", "stagePurpose": "...", "prospectStatement": "We already have an agency doing this for us.", "callNotes": "...", "callTitle": "...", "company": "..." }
```
Requires at least `prospectStatement` or `callNotes`. Returns 422 `INSUFFICIENT_CONTEXT` otherwise.

**Response 200:**
```json
{ "data": { "suggestedResponse": "...", "reason": "...", "followUpQuestion": "...", "caution": "...", "provider": "gemini", "model": "gemini-3.5-flash", "demo": false } }
```
**Response 503:** `LLM_UNAVAILABLE` if not configured (non-demo, no key). **Response 504:** `LLM_TIMEOUT`. **Response 422:** `INSUFFICIENT_CONTEXT`.

## Errors
All errors follow `{ "error": { "code": "...", "message": "...", "details": [...] } }` where appropriate.
