import { useCallback, useEffect, useState } from 'react'
import type { Conversation } from 'vino-sdk'
import { describeError } from '../errors'
import { vino } from '../vino'

export interface UseTranscriptResult {
  transcript: Conversation | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Loads the transcript for a conversation id, refetching on id change or
 * reload(). Transcript/error/loading are derived from the last settled fetch
 * so switching conversations never shows stale data.
 */
export function useTranscript(id: string | null): UseTranscriptResult {
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [data, setData] = useState<{ id: string; conversation: Conversation } | null>(null)
  const [errorData, setErrorData] = useState<{ id: string; message: string } | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (id === null) return
    let active = true
    vino.getConversation(id).then(
      (conversation) => {
        if (!active) return
        setData({ id, conversation })
        setErrorData(null)
        setResolvedId(id)
      },
      (err: unknown) => {
        if (!active) return
        setErrorData({ id, message: describeError(err) })
        setData(null)
        setResolvedId(id)
      },
    )
    return () => {
      active = false
    }
  }, [id, nonce])

  const transcript = id !== null && data?.id === id ? data.conversation : null
  const error = id !== null && errorData?.id === id ? errorData.message : null
  const loading = id !== null && resolvedId !== id

  return { transcript, loading, error, reload }
}
