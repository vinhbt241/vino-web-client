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
    runState.ts              # pure reducer folding run/live events into UI state
    runState.test.ts         # unit tests for the reducer
    conversationState.ts     # committed-state reducer + busy detection (pure)
    conversationState.test.ts# unit tests for the committed-state reducer
    useRun.ts                # local run stream + cancel/reset
    useConversation.ts       # committed transcript via view + watch (live sync)
    useLiveEvents.ts         # live events for runs this tab didn't start
    useConversations.ts      # list / refresh / load-more (nextCursor)
  components/
    ChatView.tsx             # messages + composer + banners + details toggle
    MessageList.tsx          # transcript + live run rendering
    ToolCard.tsx             # collapsible tool call card (auto-expands on error)
    Composer.tsx             # input + send/steer + stop
    Sidebar.tsx              # conversation list + load more + new chat
    ConversationDetails.tsx  # agent config, documents, submissions readout
    Markdown.tsx             # react-markdown wrapper
    ErrorBanner.tsx          # inline error banner
```

## Behavior

- **Streaming** — `vino.stream()` is consumed in `useRun`, folding typed SSE
  events into a normalized state: accumulated text, tool-call entries, and
  `idle | running | finished | error` status.
- **Resume** — sending in an open conversation passes its `conversationId` so the
  server appends to it rather than starting a new run.
- **Live sync** — the open conversation's transcript comes from
  `viewConversation` (snapshot) followed by `watchConversation` (committed
  changes), so completed turns appear as commits land from any client, with no
  manual reload. While a run is in flight, its committed assistant/tool entries
  are hidden in favor of the live overlay; they render once the submission
  settles.
- **Observe others' runs** — selecting a conversation that is busy (has a
  queued/placed submission) opens `events` to stream its live deltas, so a run
  started elsewhere is visible in real time.
- **Steer** — sending into a busy conversation uses `whenBusy: "steer"`: the
  message is appended to the transcript and the in-flight run re-runs with it
  in context (the composer switches to a "Steer" action while observing).
- **Details** — the header "Details" toggle shows the conversation's agent
  config, documents, and submission records from the `/view` snapshot.
- **Finish** — on `run_finished`, the sidebar refreshes and the new conversation
  is selected (for a fresh chat); the live overlay clears once the committed
  transcript has settled.
- **Errors** — inline banners: run errors, transcript-load errors, and a
  "backend offline" banner driven by `/health` on load.
- **Cancel** — the Stop button aborts the in-flight request via `AbortSignal`.

## Notes

- Assistant text is rendered as markdown (GFM + syntax highlighting) via
  `react-markdown` without `rehype-raw`, so raw HTML is never injected — no
  sanitizer needed.
- The SDK's remaining run options (`systemPrompt`, `maxIterations`,
  `toolTimeout`, `requestId`) are intentionally not exposed in the UI for v1;
  the SDK defaults apply. (`whenBusy` is surfaced as the steer action.)
