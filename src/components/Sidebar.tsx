import type { ConversationSummary } from 'vino-sdk'

interface SidebarProps {
  conversations: ConversationSummary[]
  nextCursor: string | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
  onLoadMore: () => void
  onNewChat: () => void
}

export function Sidebar({
  conversations,
  nextCursor,
  loading,
  loadingMore,
  error,
  selectedId,
  onSelect,
  onRefresh,
  onLoadMore,
  onNewChat,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-3">
        <span className="font-semibold text-zinc-100">Conversations</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh"
            className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onNewChat}
            title="New chat"
            className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            +
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-3 text-sm text-zinc-500">Loading…</p>
        ) : error ? (
          <p className="p-3 text-sm text-red-400">{error}</p>
        ) : conversations.length === 0 ? (
          <p className="p-3 text-sm text-zinc-500">No conversations yet.</p>
        ) : (
          <ul className="p-2">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-900 ${
                    selectedId === conversation.id ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  <span className="block truncate">
                    {conversation.latestMessage?.content || `Conversation ${conversation.id}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {nextCursor !== null && (
        <div className="border-t border-zinc-800 p-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </aside>
  )
}
