import type { Entry } from 'vino-sdk'
import type { RunState } from '../hooks/runState'
import { Markdown } from './Markdown'
import { ToolCard } from './ToolCard'

export function MessageList({ entries, live }: { entries: Entry[]; live: RunState }) {
  const hasLive =
    live.userText !== '' ||
    live.text !== '' ||
    live.toolCalls.length > 0 ||
    live.status === 'running'

  return (
    <>
      {entries.map((entry) => (
        <TranscriptEntry key={entry.id} entry={entry} />
      ))}
      {hasLive && (
        <>
          {live.userText !== '' && <UserBubble text={live.userText} />}
          {live.status === 'running' && live.text === '' && live.toolCalls.length === 0 && (
            <p className="px-1 text-sm italic text-zinc-500">Thinking…</p>
          )}
          {live.text !== '' && (
            <div className="markdown rounded-lg bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
              <Markdown text={live.text} />
            </div>
          )}
          {live.toolCalls.map((call) => (
            <ToolCard key={call.id} call={call} />
          ))}
        </>
      )}
    </>
  )
}

function TranscriptEntry({ entry }: { entry: Entry }) {
  const message = entry.message
  if (message.role === 'system') return null
  if (message.role === 'user') return <UserBubble text={message.content ?? ''} />
  if (message.role === 'assistant') {
    return (
      <div className="markdown rounded-lg bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
        <Markdown text={message.content ?? ''} />
      </div>
    )
  }
  return (
    <div className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-500">
      <span className="font-mono text-zinc-400">{message.name ?? 'tool'}</span>
      {message.content !== undefined && message.content !== '' && (
        <span className="block truncate">{message.content}</span>
      )}
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-lg bg-indigo-600/80 px-4 py-2 text-sm text-white">
        {text}
      </div>
    </div>
  )
}
