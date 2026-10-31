import { useEffect, useReducer } from 'react'
import { vino } from '../vino'
import { initialRunState, runReducer, type RunState } from './runState'

/**
 * Streams a conversation's live run events (`events`) into the same run-state
 * shape the local run stream uses. Used to show a run that is in flight in a
 * conversation this tab did not start — there is no replay, so the committed
 * transcript (view/watch) supplies everything before we attached.
 */
export function useLiveEvents(id: string | null, enabled: boolean): RunState {
  const [state, dispatch] = useReducer(runReducer, initialRunState)

  useEffect(() => {
    if (id === null || !enabled) {
      dispatch({ type: 'reset' })
      return
    }
    const controller = new AbortController()
    let active = true

    // `events` has no run_started, so mark the overlay running immediately.
    dispatch({ type: 'start', userText: '' })

    void (async () => {
      while (active) {
        try {
          for await (const event of vino.events(id, controller.signal)) {
            if (!active) return
            dispatch({ type: 'event', event })
          }
        } catch {
          // Transient stream failure: fall through and resubscribe.
        }
        if (!active) return
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [id, enabled])

  return state
}
