import type { AgentConfig, DocumentRecord, SubmissionRecord } from 'vino-sdk'

interface ConversationDetailsProps {
  agent: AgentConfig
  documents: DocumentRecord[]
  submissions: SubmissionRecord[]
}

/** Collapsible readout of a conversation's agent config, documents, and submissions. */
export function ConversationDetails({ agent, documents, submissions }: ConversationDetailsProps) {
  return (
    <div className="space-y-3 border-b border-zinc-800 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-300">
      <section>
        <h3 className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">Agent</h3>
        <dl className="space-y-1">
          <Row label="model" value={agent.model ?? '(default)'} />
          {agent.systemPrompt && <Row label="systemPrompt" value={agent.systemPrompt} />}
          {agent.tools && agent.tools.length > 0 && <Row label="tools" value={agent.tools.join(', ')} />}
          {agent.extensions && agent.extensions.length > 0 && (
            <Row label="extensions" value={agent.extensions.join(', ')} />
          )}
        </dl>
      </section>

      <section>
        <h3 className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">Documents</h3>
        {documents.length === 0 ? (
          <p className="text-zinc-600">None.</p>
        ) : (
          <ul className="space-y-1">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded border border-zinc-800 px-2 py-1">
                <span className="font-mono text-zinc-200">{doc.name}</span>
                <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-zinc-400">
                  {prettyValue(doc.value)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">Submissions</h3>
        {submissions.length === 0 ? (
          <p className="text-zinc-600">None.</p>
        ) : (
          <ul className="space-y-1">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded border border-zinc-800 px-2 py-1 font-mono">
                <StatusBadge status={s.status} />
                <span className="text-zinc-200">{s.type}</span>
                <span className="text-zinc-500">#{s.id}</span>
                {s.entryId && <span className="text-zinc-500">entry {s.entryId}</span>}
                {s.answerId && <span className="text-zinc-500">answer {s.answerId}</span>}
                {s.reason && <span className="truncate text-zinc-400">— {s.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-mono text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-zinc-300">{value}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'done'
      ? 'text-emerald-400'
      : status === 'unanswered'
        ? 'text-red-400'
        : status === 'placed'
          ? 'text-sky-400'
          : 'text-amber-400'
  return <span className={`shrink-0 ${tone}`}>{status}</span>
}

function prettyValue(value: unknown): string {
  if (value === undefined) return '(empty)'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
