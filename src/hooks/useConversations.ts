import { useCallback, useEffect, useState } from 'react'
import type { ConversationSummary } from 'vino-sdk'
import { describeError } from '../errors'
import { vino } from '../vino'

const PAGE_SIZE = 20

export interface UseConversationsResult {
  conversations: ConversationSummary[]
  nextCursor: string | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFirstPage = useCallback(
    () => vino.listConversations({ limit: PAGE_SIZE, order: 'desc' }),
    [],
  )

  useEffect(() => {
    let active = true
    fetchFirstPage().then(
      (page) => {
        if (!active) return
        setConversations(page.conversations)
        setNextCursor(page.nextCursor)
      },
      (err: unknown) => {
        if (active) setError(describeError(err))
      },
    ).finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [fetchFirstPage])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await fetchFirstPage()
      setConversations(page.conversations)
      setNextCursor(page.nextCursor)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }, [fetchFirstPage])

  const loadMore = useCallback(async () => {
    if (nextCursor === null || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await vino.listConversations({
        limit: PAGE_SIZE,
        cursor: nextCursor,
        order: 'desc',
      })
      setConversations((prev) => [...prev, ...page.conversations])
      setNextCursor(page.nextCursor)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore])

  return { conversations, nextCursor, loading, loadingMore, error, refresh, loadMore }
}
