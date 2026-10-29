import { useCallback, useEffect, useState } from 'react'
import { ChatView } from './components/ChatView'
import { Sidebar } from './components/Sidebar'
import { useConversations } from './hooks/useConversations'
import { useRun } from './hooks/useRun'
import { useTranscript } from './hooks/useTranscript'
import { vino } from './vino'

type Health = 'checking' | 'online' | 'offline'

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { state: runState, isRunning, start, cancel, reset } = useRun()
  const conversations = useConversations()
  const transcript = useTranscript(selectedId)
  const [health, setHealth] = useState<Health>('checking')

  const { refresh: refreshConversations } = conversations
  const { reload: reloadTranscript } = transcript

  useEffect(() => {
    let active = true
    vino.health().then(
      () => active && setHealth('online'),
      () => active && setHealth('offline'),
    )
    return () => {
      active = false
    }
  }, [])

  const handleFinished = useCallback(
    (conversationId: string) => {
      void refreshConversations()
      if (selectedId === null) {
        setSelectedId(conversationId)
      } else if (selectedId === conversationId) {
        reloadTranscript()
      }
      reset()
    },
    [refreshConversations, reloadTranscript, reset, selectedId],
  )

  const handleSend = useCallback(
    (text: string) => {
      start(text, selectedId ?? undefined, handleFinished)
    },
    [start, selectedId, handleFinished],
  )

  const handleSelect = useCallback(
    (id: string) => {
      reset()
      setSelectedId(id)
    },
    [reset],
  )

  const handleNewChat = useCallback(() => {
    reset()
    setSelectedId(null)
  }, [reset])

  const title = selectedId === null ? 'New chat' : `Conversation ${selectedId}`

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {health === 'offline' && (
        <div className="border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          Backend offline — start the vino server at http://127.0.0.1:8080.
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          conversations={conversations.conversations}
          nextCursor={conversations.nextCursor}
          loading={conversations.loading}
          loadingMore={conversations.loadingMore}
          error={conversations.error}
          selectedId={selectedId}
          onSelect={handleSelect}
          onRefresh={() => void conversations.refresh()}
          onLoadMore={() => void conversations.loadMore()}
          onNewChat={handleNewChat}
        />
        <ChatView
          title={title}
          transcript={transcript.transcript}
          transcriptLoading={transcript.loading}
          transcriptError={transcript.error}
          live={runState}
          isRunning={isRunning}
          onSend={handleSend}
          onCancel={cancel}
        />
      </div>
    </div>
  )
}

export default App
