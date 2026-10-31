import { useEffect, useRef, useState } from 'react'
import type { AgentConfig, DocumentRecord, Entry, SubmissionRecord } from 'vino-sdk'
import type { RunState } from '../hooks/runState'
import { Composer } from './Composer'
import { ConversationDetails } from './ConversationDetails'
import { ErrorBanner } from './ErrorBanner'
import { MessageList } from './MessageList'

interface ChatViewProps {
  title: string
  entries: Entry[]
  entriesLoading: boolean
  entriesError: string | null
  activeEntryId: string | null
  showUserBubble: boolean
  live: RunState
  runError: string | null
  isRunning: boolean
  observing: boolean
  agent: AgentConfig | null
  documents: DocumentRecord[]
  submissions: SubmissionRecord[]
  onSend: (text: string) => void
  onCancel: () => void
}

export function ChatView({
  title,
  entries,
  entriesLoading,
  entriesError,
  activeEntryId,
  showUserBubble,
  live,
  runError,
  isRunning,
  observing,
  agent,
  documents,
  submissions,
  onSend,
  onCancel,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [live.text, live.toolCalls.length, live.status, entries.length])

  const isEmpty = entries.length === 0 && live.status === 'idle'

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-semibold text-zinc-200">{title}</span>
        {agent !== null && (
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            {detailsOpen ? 'Hide details' : 'Details'}
          </button>
        )}
      </header>

      {detailsOpen && agent !== null && (
        <ConversationDetails agent={agent} documents={documents} submissions={submissions} />
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
          {entriesLoading && <p className="text-sm text-zinc-500">Loading transcript…</p>}
          {entriesError && <ErrorBanner message={entriesError} />}

          {isEmpty ? (
            <div className="pt-16 text-center">
              <p className="text-lg font-semibold text-zinc-300">Vino</p>
              <p className="mt-1 text-sm text-zinc-500">Ask vino to do something.</p>
            </div>
          ) : (
            <MessageList
              entries={entries}
              live={live}
              activeEntryId={activeEntryId}
              showUserBubble={showUserBubble}
            />
          )}
        </div>
      </div>

      {runError !== null && (
        <div className="px-4 pb-2">
          <ErrorBanner message={runError} />
        </div>
      )}

      {observing && (
        <p className="px-4 pt-2 text-xs text-amber-400/90">
          A run is in progress here — your next message will steer it.
        </p>
      )}

      <Composer isRunning={isRunning} busy={observing} onSend={onSend} onCancel={onCancel} />
    </main>
  )
}
