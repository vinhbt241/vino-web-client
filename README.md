# vino-client

A local-first web client for the [vino-backend](https://github.com/vinhbt241/vino-backend) agent server, built on [`vino-sdk`](https://github.com/vinhbt241/vino-sdk).

Stream runs live, browse and continue conversations, and read transcripts in one browser tab.

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 (`@tailwindcss/vite`)
- [`vino-sdk`](https://www.npmjs.com/package/vino-sdk) — zero-dependency HTTP/SSE client for the backend
- `react-markdown` + `remark-gfm` + `rehype-highlight` — assistant output rendering
- Vitest — unit tests

## Prerequisites

A running `vino-backend` at `http://127.0.0.1:8080` **with CORS enabled** for the
dev-server origin. The backend ships CORS off by default; enable it in `vino.json`:

```json
{
  "cors": {
    "origins": ["http://localhost:5173"],
    "allowCredentials": false,
    "maxAge": 600
  }
}
```

> The origin must match exactly (the browser's `Origin` header). `"*"` is
> deliberately avoided: on a loopback-bound, unauthenticated server it would let
> any website you visit drive the local agent (DNS rebinding).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
npm test           # vitest run
npm run lint       # oxlint
```

## Project structure

```
src/
  vino.ts                    # Vino singleton (baseUrl = http://127.0.0.1:8080)
  errors.ts                  # describeError() normalizer
  App.tsx                    # layout + wiring (health, select, new-chat, finish)
  hooks/
    runState.ts              # pure reducer folding RunEvents into UI state
    runState.test.ts         # unit tests for the reducer
    useRun.ts                # stream consumption + cancel/reset + onFinished
    useConversations.ts      # list / refresh / load-more (nextCursor)
    useTranscript.ts         # transcript loading (derived state, no stale flashes)
  components/
    ChatView.tsx             # messages + composer + banners
    MessageList.tsx          # transcript + live run rendering
    ToolCard.tsx             # collapsible tool call card (auto-expands on error)
    Composer.tsx             # input + send + stop
    Sidebar.tsx              # conversation list + load more + new chat
    Markdown.tsx             # react-markdown wrapper
    ErrorBanner.tsx          # inline error banner
```

## Behavior

- **Streaming** — `vino.stream()` is consumed in `useRun`, folding typed SSE
  events into a normalized state: accumulated text, tool-call entries, and
  `idle | running | finished | error` status.
- **Resume** — sending in an open conversation passes its `conversationId` so the
  server appends to it rather than starting a new run.
- **Finish** — on `run_finished`, the sidebar refreshes and the transcript
  reloads (the server-persisted transcript is the source of truth for completed
  turns).
- **Errors** — inline banners: run errors, transcript-load errors, and a
  "backend offline" banner driven by `/health` on load.
- **Cancel** — the Stop button aborts the in-flight request via `AbortSignal`.

## Notes

- Assistant text is rendered as markdown (GFM + syntax highlighting) via
  `react-markdown` without `rehype-raw`, so raw HTML is never injected — no
  sanitizer needed.
- The SDK's advanced run options (`systemPrompt`, `maxIterations`, `toolTimeout`,
  `requestId`) are intentionally not exposed in the UI for v1; the SDK defaults
  apply.
