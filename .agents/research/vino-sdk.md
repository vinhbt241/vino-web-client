# vino-sdk — research notes

Source: https://github.com/vinhbt241/vino-sdk (cloned to `/tmp/vino-sdk`, `main` @ shallow HEAD).
All line references are from that clone.

## What it is

A **zero-dependency TypeScript client** for the
[vino-backend](https://github.com/vinhbt241/vino-backend) HTTP API. It does three things:
stream runs, continue conversations, and read transcripts — "no hand-rolled SSE parsing
or error mapping" (`README.md`).

- Runs on **Node 18+, browsers, Deno, Bun** — anything with `fetch` (`README.md`).
- **No runtime dependencies** (`package.json` — only devDeps: typescript, tsx, @types/node).
- ESM only (`"type": "module"`), ships `dist/index.js` + `dist/index.d.ts` (`package.json`).
- Hand-written strict types mirroring the server's wire contract (`src/types.ts` header).

## Public API surface

Everything exports from `src/index.ts`:

- **`Vino`** (class) — the client
- **`VinoError`**, **`VinoHttpError`**, **`VinoStreamError`** (errors)
- Types: `Conversation`, `ConversationSummary`, `Entry`, `ForkRef`, `LatestMessage`,
  `ListConversationsResult`, `ListQuery`, `Message`, `OutgoingMessage`, `OutgoingRole`,
  `OwnerRef`, `Role`, `RunEvent`, `RunOptions`, `RunResult`, `ToolCall`, `ToolResult`,
  `VinoOptions`

### Constructor — `new Vino(options?)` (`src/client.ts`)

```ts
new Vino({
  baseUrl?: string,            // default "http://127.0.0.1:8080"
  headers?: Record<string,string>, // merged into every request
  apiKey?: string,             // sent as `Authorization: Bearer <key>`
  timeout?: number,            // default request timeout, ms
  fetch?: (input, init?) => Promise<Response>, // injectable, for tests/non-fetch runtimes
});
```

### Methods (`src/client.ts`)

| Method | Returns | Notes |
|---|---|---|
| `health(signal?)` | `Promise<{ok:boolean}>` | GET `/health` |
| `run(options)` | `Promise<RunResult>` | folds the stream; throws `VinoStreamError` on abort/error |
| `stream(options)` | `AsyncGenerator<RunEvent>` | terminal `error` is *yielded*, not thrown |
| `listConversations(query?, signal?)` | `Promise<ListConversationsResult>` | GET `/conversations?limit&cursor&order` |
| `getConversation(id, signal?)` | `Promise<Conversation>` | GET `/conversations/{id}` |

### `RunOptions` (`src/types.ts`)

```ts
{
  messages: OutgoingMessage[];  // { role: "user" | "assistant"; content: string } — non-empty
  systemPrompt?: string;
  maxIterations?: number;       // 0/absent -> server default (50)
  toolTimeout?: string;         // Go duration string, e.g. "30s"
  requestId?: string;           // exactly-once: retries resume the same run
  conversationId?: string;      // present -> append (resume) to this conversation
  signal?: AbortSignal;
}
```

### `RunEvent` (discriminated union, `src/types.ts`)

```
run_started        { conversationId, submissionId, resumed }
text_delta         { text }
tool_call_started  { id, name, arguments: Record<string,unknown> | null }
tool_result        { id, name, result, error? }
run_finished       { conversationId, finalMessage: Message }
error              { error: string }
```

### `RunResult`

```
{ conversationId, submissionId, resumed, finalMessage, text, toolResults }
```
`text` = all `text_delta` payloads concatenated in order; `toolResults` = `ToolResult[]`
(`{id,name,result,error?}`).

### Conversation types

- `Message`: `{ role: "system"|"user"|"assistant"|"tool", content?, tool_calls?, tool_call_id?, name? }`
- `ConversationSummary`: `{ id, parent?, owner?, latestMessage? }` (for lists)
- `Conversation`: `{ id, parent?, owner?, entries: Entry[] }` where `Entry = { id, kind, message }`
- `ListConversationsResult`: `{ conversations, nextCursor: string | null }`
- `ListQuery`: `{ limit?, cursor?, order?: "asc"|"desc" }`

## Transport / protocol (`src/transport.ts`)

- **HTTP + SSE.** Plain `fetch`, injected by default.
- Endpoints:
  - `POST /runs` (new run) — body `RunRequestBody`
  - `POST /conversations/{id}/runs` (resume) — same body
  - `GET /conversations` (list, `limit`/`cursor`/`order` query params)
  - `GET /conversations/{id}` (transcript)
  - `GET /health`
- Run request body `RunRequestBody`: `{ systemPrompt, messages, maxIterations, toolTimeout, requestId }`
  (all serialized; empty strings for unset systemPrompt/toolTimeout/requestId, `0` for maxIterations).
- SSE framing: `event: <name>\ndata: <json>\n\n` — `parseSSE` decodes via `TextDecoder`,
  splits on `\n\n`, parses `event:`/`data:` lines, unknown event names are **skipped**
  (forward compatibility), malformed JSON → `VinoStreamError`.
- Auth: `apiKey` → `Authorization: Bearer <key>` header. **Inert server-side today**
  (README: "inert until the server grows auth").
- Timeouts: `withTimeout` wraps the signal in an `AbortController`; abort reason is a
  `VinoStreamError("request timed out after Nms")`. Caller `AbortSignal` is chained.

## Errors (`src/errors.ts`)

- `VinoError` — base
- `VinoHttpError` — non-2xx before streaming; carries `.status` + server `{"error":...}` message
- `VinoStreamError` — terminal SSE `error` event, premature end, or timeout

## Browser / CORS — IMPORTANT for a web client

README, "Browser / CORS note":

> The vino-backend server binds to loopback and sends **no CORS headers**. A browser client
> calling it cross-origin will be blocked. Serve your app from the same origin (reverse proxy),
> or add CORS handling to the server.

So a pure browser SPA calling `http://127.0.0.1:8080` directly **will be blocked by CORS**
**unless** CORS is enabled on the backend.

### Backend CORS status (checked locally at `~/projects/vino/backend`)

The local vino-backend now has **opt-in CORS** (`internal/api/cors.go`, `README.md` CORS
section). `cors.origins` in `vino.json`: empty = off, `"*"` = any origin, or a specific
list (mismatch → 403). Supports `authorization`, `content-type`, `accept` preflight
headers, and optional `allowCredentials`.

> ⚠️ Security note from backend README: enabling `"*"` while loopback-bound and
> unauthenticated means **any website can drive the local agent** (DNS rebinding). Prefer
> a specific origins list, and never `"*"` on a public bind.

So the browser has three viable paths: (a) same-origin reverse proxy (no CORS change),
(b) enable backend CORS with a specific origin list, or (c) a server-side BFF running the
SDK. The local backend has no CORS configured today (`vino.example.json` has no `cors` key).

## Examples (`examples/`)

- `run.ts` — one-shot `vino.run(...)`, prints `result.text`, `toolResults`, `conversationId`
- `stream.ts` — `for await` over `vino.stream(...)`, switches on `event.type`
- `conversations.ts` — list + get + resume via `conversationId`

## Backend reference (mentioned, not cloned)

- Server defaults to `http://127.0.0.1:8080` (README).
- Wire contract lives in the backend's `docs/api.md`; the SDK types mirror it (`src/types.ts`).
- Integration tests vendor the backend and boot it with `go run` against a mock OpenAI-compatible
  provider (`README.md` "Development").
