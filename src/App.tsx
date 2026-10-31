import { useCallback, useEffect, useState } from 'react'
import { ChatView } from './components/ChatView'
import { Sidebar } from './components/Sidebar'
import { useConversation } from './hooks/useConversation'
import { useConversations } from './hooks/useConversations'
import { useLiveEvents } from './hooks/useLiveEvents'
import { useRun } from './hooks/useRun'
import { initialRunState, type RunState } from './hooks/runState'
import { vino } from './vino'

type Health = 'checking' | 'online' | 'offline'

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { state: runState, isRunning, start, cancel, reset } = useRun()
  const conversations = useConversations()
  const conversation = useConversation(selectedId)
  const [health, setHealth] = useState<Health>('checking')

  const { refresh: refreshConversations } = conversations

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

  // Observe a run this tab did not start, only when viewing that conversation
  // while no local run is active.
  const observing = selectedId !== null && runState.status === 'idle' && conversation.isBusy
  const liveEvents = useLiveEvents(selectedId, observing)

  const handleFinished = useCallback(
    (conversationId: string) => {
      void refreshConversations()
      if (selectedId === null) setSelectedId(conversationId)
    },
    [refreshConversations, selectedId],
  )

  // Clear the live overlay once the committed transcript has settled (the
  // run's final entry is visible from view/watch, so the stream is redundant).
  useEffect(() => {
    if (runState.status === 'finished' && selectedId !== null && conversation.isSettled) {
      reset()
    }
  }, [runState.status, selectedId, conversation.isSettled, reset])

  const handleSend = useCallback(
    (text: string) => {
      const whenBusy = observing ? 'steer' : undefined
      start(text, selectedId ?? undefined, handleFinished, whenBusy)
    },
    [start, selectedId, observing, handleFinished],
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

  // Pick the live overlay: the local run (when it belongs to the selection, or
  // for a new chat), else the observer stream for a busy conversation. Once the
  // conversation has settled, the committed transcript is the source of truth.
  let live: RunState = initialRunState
  let showUserBubble = false
  if (selectedId === null) {
    if (runState.status !== 'idle') {
      live = runState
      showUserBubble = runState.userText !== ''
    }
  } else if (runState.status !== 'idle' && runState.conversationId === selectedId && !conversation.isSettled) {
    live = runState
  } else if (observing) {
    live = liveEvents
  }

  const runError = runState.status === 'error' ? runState.error : null

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
          entries={conversation.entries}
          entriesLoading={conversation.loading}
          entriesError={conversation.error}
          activeEntryId={conversation.activeEntryId}
          showUserBubble={showUserBubble}
          live={live}
          runError={runError}
          isRunning={isRunning}
          observing={observing}
          agent={conversation.agent}
          documents={conversation.documents}
          submissions={conversation.submissions}
          onSend={handleSend}
          onCancel={cancel}
        />
      </div>
    </div>
  )
}

export default App
