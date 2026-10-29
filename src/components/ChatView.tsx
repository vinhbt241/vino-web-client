import { useEffect, useRef } from 'react'
import type { Conversation } from 'vino-sdk'
import type { RunState } from '../hooks/runState'
import { Composer } from './Composer'
import { ErrorBanner } from './ErrorBanner'
import { MessageList } from './MessageList'

interface ChatViewProps {
  title: string
  transcript: Conversation | null
  transcriptLoading: boolean
  transcriptError: string | null
  live: RunState
  isRunning: boolean
  onSend: (text: string) => void
  onCancel: () => void
}

export function ChatView({
  title,
  transcript,
  transcriptLoading,
  transcriptError,
  live,
  isRunning,
  onSend,
  onCancel,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const entries = transcript?.entries ?? []

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [live.text, live.toolCalls.length, live.status, entries.length])

  const isEmpty = entries.length === 0 && live.status === 'idle'

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-200">
        {title}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-4">
          {transcriptLoading && <p className="text-sm text-zinc-500">Loading transcript…</p>}
          {transcriptError && <ErrorBanner message={transcriptError} />}

          {isEmpty ? (
            <div className="pt-16 text-center">
              <p className="text-lg font-semibold text-zinc-300">Vino</p>
              <p className="mt-1 text-sm text-zinc-500">Ask vino to do something.</p>
            </div>
          ) : (
            <MessageList entries={entries} live={live} />
          )}
        </div>
      </div>

      {live.status === 'error' && live.error !== null && (
        <div className="px-4 pb-2">
          <ErrorBanner message={live.error} />
        </div>
      )}

      <Composer isRunning={isRunning} onSend={onSend} onCancel={onCancel} />
    </main>
  )
}
