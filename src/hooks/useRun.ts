import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { RunEvent, RunOptions } from 'vino-sdk'
import { describeError } from '../errors'
import { vino } from '../vino'
import { initialRunState, runReducer, type RunState } from './runState'

export interface UseRunResult {
  state: RunState
  isRunning: boolean
  start: (
    userText: string,
    conversationId?: string,
    onFinished?: (conversationId: string) => void,
  ) => void
  cancel: () => void
  reset: () => void
}

export function useRun(): UseRunResult {
  const [state, dispatch] = useReducer(runReducer, initialRunState)
  const controllerRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  const start = useCallback(
    (userText: string, conversationId?: string, onFinished?: (conversationId: string) => void) => {
      dispatch({ type: 'start', userText })
      const controller = new AbortController()
      controllerRef.current = controller
      cancelledRef.current = false

      const options: RunOptions = {
        messages: [{ role: 'user', content: userText }],
        signal: controller.signal,
      }
      if (conversationId) options.conversationId = conversationId

      void (async () => {
        let finishedConversationId: string | null = null
        let finished = false
        try {
          for await (const event of vino.stream(options)) {
            dispatch({ type: 'event', event })
            if (event.type === 'run_started') {
              finishedConversationId = event.conversationId || finishedConversationId
            } else if (event.type === 'run_finished') {
              finished = true
              finishedConversationId = event.conversationId || finishedConversationId
            }
          }
          if (!finished) {
            const errorEvent: RunEvent = { type: 'error', error: 'run stream ended before run_finished' }
            dispatch({ type: 'event', event: errorEvent })
          } else if (finishedConversationId !== null) {
            onFinished?.(finishedConversationId)
          }
        } catch (err) {
          if (cancelledRef.current) {
            dispatch({ type: 'stop' })
          } else {
            const errorEvent: RunEvent = { type: 'error', error: describeError(err) }
            dispatch({ type: 'event', event: errorEvent })
          }
        } finally {
          controllerRef.current = null
        }
      })()
    },
    [],
  )

  const cancel = useCallback(() => {
    cancelledRef.current = true
    controllerRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    cancelledRef.current = true
    controllerRef.current?.abort()
    dispatch({ type: 'reset' })
  }, [])

  useEffect(
    () => () => {
      cancelledRef.current = true
      controllerRef.current?.abort()
    },
    [],
  )

  return {
    state,
    isRunning: state.status === 'running',
    start,
    cancel,
    reset,
  }
}
