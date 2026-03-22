# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CBC Hackathon 26' — **PipelineForger**, a visual AI pipeline builder. Users describe a workflow in plain English → get a drag-and-drop node/edge graph → run it step-by-step with real-time logs → export as a runnable Python project. Intelligence is powered by the Anthropic Claude API (`claude-sonnet-4-20250514`).

## Commands

From the repo root:

```bash
npm run install:all      # Install all dependencies (root + frontend + backend)
npm run dev              # Run both frontend and backend concurrently
npm run dev:frontend     # Frontend only (http://localhost:5173)
npm run dev:backend      # Backend only (http://localhost:3001)
```

**Frontend** (`cd frontend`):
```bash
npm run dev        # Vite dev server
npm run build      # tsc + vite build
npm run lint       # ESLint
npm run test       # Vitest (single run)
npm run test:watch # Vitest watch mode
```

**Backend** (`cd backend`):
```bash
npm run dev      # Nodemon + ts-node hot-reload
npm run lint     # tsc --noEmit (type-check only)
npm run test     # Jest (mocks Claude — no API key needed)
npm run build && npm start   # Production
```

Copy `backend/.env.example` → `backend/.env` and set `ANTHROPIC_API_KEY` before running the backend. The root `.env` also holds this key for convenience.

## Architecture

The project is a monorepo with two workspaces that communicate over HTTP.

```
frontend/                   React + TypeScript visual editor
  src/
    App.tsx                 Root layout (Topbar / Sidebar / Canvas / right panel)
    components/
      Canvas.tsx            React Flow canvas (nodes + edges)
      Sidebar.tsx           Node palette (drag to add)
      Topbar.tsx            Intent input, Generate, Test Run, Ship It buttons
      ConfigPanel.tsx       Right panel when a node is selected
      CopilotPanel.tsx      AI assistant right panel (default)
      ShipItModal.tsx       Code export dialog + JSZip download
      TestRunOverlay.tsx    SSE-based test execution UI
      DrawingCanvasModal.tsx  Sketch-to-pipeline: draw on canvas → Claude interprets → confirm/refine
      nodes/                Custom React Flow node renderers (one per node type)
    store/pipelineStore.ts  Zustand store — nodes, edges, copilot messages, selection
    lib/apiClient.ts        HTTP abstraction; respects VITE_USE_MOCK env flag
    mocks/api.ts            Mock implementations (VITE_USE_MOCK=true for frontend-only dev)

backend/
  src/
    index.ts                Express setup, route mounting, CORS, port 3001
    lib/
      claude.ts             askClaude(system, user) + askClaudeWithImage() wrappers (change model here)
      compatibility.ts      Static node-type input/output compatibility check
      executor.ts           Kahn's topological sort + per-node executeNode() dispatcher
      pipelineSanitizer.ts  Cleans/validates Claude's pipeline JSON before returning to frontend
    routes/
      intent.ts             POST /api/generate-pipeline  → nodes[] + edges[] JSON
      copilot.ts            POST /api/copilot/{node-drop,edge-draw,scan}
      run.ts                POST /api/test-run           → SSE stream
      ship.ts               POST /api/generate-code      → Python code string
      validate.ts           POST /api/validate-connection
      sketch.ts             POST /api/interpret-sketch   → nodes[] + edges[] + interpretation
```

### Frontend ↔ Backend

`apiClient.ts` is the single communication layer. Set `VITE_USE_MOCK=false` (and `VITE_API_URL=http://localhost:3001`) to switch from mocks to the real backend.

| Frontend action | Backend endpoint | Notes |
|---|---|---|
| Generate pipeline from intent | POST `/api/generate-pipeline` | Claude returns `{ nodes[], edges[] }` |
| Sketch to pipeline | POST `/api/interpret-sketch` | `{ imageBase64, feedback? }` → `{ interpretation, nodes[], edges[] }`; uses `askClaudeWithImage` |
| Copilot suggestions | POST `/api/copilot/*` | node-drop, edge-draw, scan |
| Test run | POST `/api/test-run` | SSE stream; use `fetch` + `ReadableStream` (not `EventSource`) since it's a POST |
| Export code | POST `/api/generate-code` | Claude returns Python; JSZip bundles it client-side |
| Validate edge | POST `/api/validate-connection` | Static check first, Claude explains invalid ones |

### Node schema (shared contract)

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

### Key design decisions

- **All Claude calls** go through `backend/src/lib/claude.ts` — `askClaude(system, user)` for text, `askClaudeWithImage(system, user, imageBase64)` for vision. Update the model or add retries in one place.
- **Pipeline sanitizer** (`pipelineSanitizer.ts`) runs on every pipeline Claude response: strips prompt-injection patterns, validates model/toolType against an allowlist, fills defaults, and drops edges referencing unknown node IDs.
- **Topological sort** in `executor.ts` ensures dependency order; throws on cycles (run route emits `{ status: 'fatal' }` SSE event).
- **Static compatibility check** in `compatibility.ts` runs before calling Claude on invalid edge connections — keeps latency low.
- **Tool nodes** (`web_search`, `code_executor`, `file_reader`, `api_caller`) are stubs in `executor.ts`; wire up real APIs there.
- **Co-pilot scan** (`/api/copilot/scan`) is heavier than the other copilot routes — the frontend debounces it (~30 s).
- **Sketch flow** (`DrawingCanvasModal`) has four phases: `drawing → interpreting → feedback → refining`. The user can loop through feedback/refining before accepting the generated pipeline.
- All `JSON.parse` calls on Claude responses are wrapped in try/catch (Claude can return malformed JSON).
