import type { RunEvent } from 'vino-sdk'

export type RunStatus = 'idle' | 'running' | 'finished' | 'error'

export interface ToolCallEntry {
  id: string
  name: string
  arguments: Record<string, unknown> | null
  status: 'running' | 'done' | 'error'
  result?: string
  error?: string
}

export interface RunState {
  status: RunStatus
  conversationId: string | null
  resumed: boolean
  userText: string
  text: string
  toolCalls: ToolCallEntry[]
  error: string | null
}

export const initialRunState: RunState = {
  status: 'idle',
  conversationId: null,
  resumed: false,
  userText: '',
  text: '',
  toolCalls: [],
  error: null,
}

export type RunAction =
  | { type: 'start'; userText: string }
  | { type: 'event'; event: RunEvent }
  | { type: 'stop' }
  | { type: 'reset' }

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case 'start':
      return {
        ...initialRunState,
        status: 'running',
        userText: action.userText,
      }
    case 'stop':
      return { ...state, status: 'idle', error: null }
    case 'reset':
      return initialRunState
    case 'event':
      return foldEvent(state, action.event)
  }
}

function foldEvent(state: RunState, event: RunEvent): RunState {
  switch (event.type) {
    case 'run_started':
      return {
        ...state,
        status: 'running',
        conversationId: event.conversationId || state.conversationId,
        resumed: event.resumed,
      }
    case 'text_delta':
      return { ...state, text: state.text + event.text }
    case 'tool_call_started':
      return {
        ...state,
        toolCalls: [
          ...state.toolCalls,
          {
            id: event.id,
            name: event.name,
            arguments: event.arguments,
            status: 'running',
          },
        ],
      }
    case 'tool_result':
      return {
        ...state,
        toolCalls: state.toolCalls.map((call) =>
          call.id === event.id
            ? {
                ...call,
                status: event.error === undefined ? 'done' : 'error',
                result: event.result,
                error: event.error,
              }
            : call,
        ),
      }
    case 'run_finished':
      return {
        ...state,
        status: 'finished',
        conversationId: event.conversationId || state.conversationId,
      }
    case 'error':
      return { ...state, status: 'error', error: event.error }
  }
}
