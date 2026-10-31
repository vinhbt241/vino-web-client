import { useCallback, useEffect, useMemo, useState } from 'react'
import { VinoHttpError } from 'vino-sdk'
import type { AgentConfig, DocumentRecord, Entry, SubmissionRecord } from 'vino-sdk'
import { describeError } from '../errors'
import { vino } from '../vino'
import { activeEntryIdOf, applyCommit, type ConversationData } from './conversationState'

export interface UseConversationResult {
  entries: Entry[]
  documents: DocumentRecord[]
  submissions: SubmissionRecord[]
  agent: AgentConfig | null
  /** Start of the in-flight turn (earliest active submission's user entry). */
  activeEntryId: string | null
  /** True once loaded and a run is in flight. */
  isBusy: boolean
  /** True once loaded and no run is in flight. */
  isSettled: boolean
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Loads a conversation's committed snapshot via `viewConversation` and follows
 * changes gap-free via `watchConversation`. Replaces the old one-shot
 * `getConversation` read: the transcript now updates as commits land, from any
 * client, without a manual reload.
 */
export function useConversation(id: string | null): UseConversationResult {
  const [data, setData] = useState<ConversationData | null>(null)
  const [errorData, setErrorData] = useState<{ id: string; message: string } | null>(null)
  const [nonce, setNonce] = useState(0)

  // Reset committed state when the target conversation changes (or clears).
  const [prevId, setPrevId] = useState(id)
  if (prevId !== id) {
    setPrevId(id)
    setData(null)
    setErrorData(null)
  }

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (id === null) return
    let active = true
    const controller = new AbortController()

    void (async () => {
      while (active) {
        try {
          const view = await vino.viewConversation(id, controller.signal)
          if (!active) return
          setData({
            id,
            entries: view.entries,
            documents: view.documents,
            submissions: view.submissions,
            agent: view.conversation.agent,
          })
          setErrorData(null)

          for await (const commit of vino.watchConversation(id, view.seq, controller.signal)) {
            if (!active) return
            setData((prev) => (prev === null || prev.id !== id ? prev : applyCommit(prev, commit)))
          }
          // The watch stream closed cleanly (rare): loop to re-view and re-attach.
        } catch (err) {
          if (!active) return
          if (err instanceof VinoHttpError && err.status === 409) {
            // Commit window expired behind us: re-read the snapshot and retry.
            continue
          }
          if (controller.signal.aborted) return
          setErrorData({ id, message: describeError(err) })
          setData(null)
          return
        }
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [id, nonce])

  const activeEntryId = useMemo(
    () => (data !== null && data.id === id ? activeEntryIdOf(data.submissions) : null),
    [data, id],
  )

  const isBusy = data !== null && data.id === id && activeEntryId !== null
  const isSettled = data !== null && data.id === id && activeEntryId === null
  const loading = id !== null && data?.id !== id && errorData?.id !== id
  const error = id !== null && errorData?.id === id ? errorData.message : null

  return {
    entries: data?.id === id ? data.entries : [],
    documents: data?.id === id ? data.documents : [],
    submissions: data?.id === id ? data.submissions : [],
    agent: data?.id === id ? data.agent : null,
    activeEntryId,
    isBusy,
    isSettled,
    loading,
    error,
    refresh,
  }
}
