# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CBC Hackathon 26' — AI Pipeline Builder backend. An Express + TypeScript API that lets users describe a workflow in plain English, get back a node/edge graph, run it step-by-step, and export it as Python code. All intelligence is powered by the Anthropic Claude API (`claude-sonnet-4-20250514`).

## Commands

```bash
# Install dependencies
npm install

# Development (hot-reload via nodemon + ts-node)
npm run dev

# Type-check without emitting
npm run lint

# Production build then start
npm run build && npm start
```

Copy `.env.example` → `.env` and set `ANTHROPIC_API_KEY` before running.

## Architecture

```
src/
  index.ts          — Express app setup, route mounting, CORS, port
  lib/
    claude.ts       — Single askClaude() wrapper around Anthropic SDK
    compatibility.ts — Static type-checker for node-to-node edge validity
    executor.ts     — Topological sort (Kahn's) + per-node executeNode() dispatcher
  routes/
    intent.ts       — POST /api/intent   → Claude generates nodes[] + edges[] JSON from description
    copilot.ts      — POST /api/copilot/node-drop, /edge-draw, /scan
    run.ts          — POST /api/run      → SSE stream of per-node execution results
    ship.ts         — POST /api/ship     → Claude generates runnable Python from the pipeline
```

### Key design decisions

**Single Claude wrapper (`src/lib/claude.ts`)** — all routes call `askClaude(system, user)` rather than constructing Anthropic client calls inline. Change the model or add retries in one place.

**SSE streaming in `/api/run`** — the run endpoint responds with `Content-Type: text/event-stream` and emits one JSON event per node (`{ nodeId, status: 'running'|'success'|'error', output? }`), then a final `{ status: 'complete', finalOutput }`. The frontend reads this with `fetch` + `ReadableStream`, not `EventSource` (since it's a POST).

**Topological sort before execution** — `executor.ts` sorts nodes via in-degree before running them so dependencies always execute first. It throws on cycles; the run route catches this and sends a `fatal` SSE event.

**Static compatibility check** — `compatibility.ts` holds hard-coded input/output type maps per node type. The `/api/copilot/edge-draw` route checks these first (fast, free) and only calls Claude when the connection is invalid (to generate a human-friendly explanation).

### Node schema (agreed with frontend)

```json
{
  "id": "node_1",
  "type": "input|llm|tool|agent|router|output",
  "position": { "x": 100, "y": 300 },
  "config": {
    "model": "claude-sonnet-4-20250514",
    "systemPrompt": "You are a helpful assistant",
    "temperature": 0.7,
    "toolType": "web_search|code_executor|file_reader|api_caller"
  },
  "inputs": ["text"],
  "outputs": ["text"]
}
```

### API contract

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/intent` | POST | `{ description: string }` | `{ nodes[], edges[] }` |
| `/api/copilot/node-drop` | POST | `{ nodeType: string }` | `{ suggestion: string }` |
| `/api/copilot/edge-draw` | POST | `{ sourceType, targetType }` | `{ compatible: bool, explanation: string }` |
| `/api/copilot/scan` | POST | `{ nodes[], edges[] }` | `{ warnings: [{ nodeId, message, severity }] }` |
| `/api/run` | POST | `{ nodes[], edges[], input: string }` | SSE stream |
| `/api/ship` | POST | `{ nodes[], edges[] }` | `{ code: string, requiredKeys: string[] }` |

## Risk watch

- **Claude returns invalid JSON** (`/api/intent`, `/api/copilot/scan`, `/api/ship`) — always wrap `JSON.parse` in try/catch; routes already do this.
- **Cycles in graph** — `topologicalSort` throws `'Cycle detected in pipeline graph'`; run route sends `{ status: 'fatal', error }` SSE event.
- **SSE + CORS** — `Access-Control-Allow-Origin: *` is set explicitly on the run route headers in addition to the global `cors()` middleware.
- **Co-pilot latency** — `/node-drop` and `/edge-draw` use short prompts and should be fast. `/scan` is heavier; debounce it on the frontend (every 30 s is enough).
- **Tool stubs** — `web_search`, `code_executor`, `file_reader`, `api_caller` in `executor.ts` return stub strings. Wire up real APIs (SerpAPI, etc.) there.
