import { describe, expect, it } from 'vitest'
import type { RunEvent } from 'vino-sdk'
import { initialRunState, runReducer } from './runState'

function started() {
  return runReducer(initialRunState, { type: 'start', userText: 'hi' })
}

describe('runReducer', () => {
  it('starts a run with the user text and empty stream', () => {
    const state = started()
    expect(state.status).toBe('running')
    expect(state.userText).toBe('hi')
    expect(state.text).toBe('')
    expect(state.toolCalls).toHaveLength(0)
  })

  it('accumulates text deltas in order', () => {
    let state = started()
    state = runReducer(state, { type: 'event', event: { type: 'text_delta', text: 'hello ' } })
    state = runReducer(state, { type: 'event', event: { type: 'text_delta', text: 'world' } })
    expect(state.text).toBe('hello world')
  })

  it('tracks a tool call from start to result', () => {
    let state = started()
    state = runReducer(state, {
      type: 'event',
      event: { type: 'tool_call_started', id: '1', name: 'list_files', arguments: { path: '.' } },
    })
    expect(state.toolCalls[0]).toMatchObject({ id: '1', name: 'list_files', status: 'running' })
    state = runReducer(state, {
      type: 'event',
      event: { type: 'tool_result', id: '1', name: 'list_files', result: 'a\nb' },
    })
    expect(state.toolCalls[0]).toMatchObject({ status: 'done', result: 'a\nb' })
  })

  it('marks a tool call as errored', () => {
    let state = started()
    state = runReducer(state, {
      type: 'event',
      event: { type: 'tool_call_started', id: '2', name: 'edit', arguments: null },
    })
    state = runReducer(state, {
      type: 'event',
      event: { type: 'tool_result', id: '2', name: 'edit', result: '', error: 'boom' },
    })
    expect(state.toolCalls[0]).toMatchObject({ status: 'error', error: 'boom' })
  })

  it('finishes a run and records the conversation id', () => {
    let state = started()
    state = runReducer(state, {
      type: 'event',
      event: { type: 'run_started', conversationId: '42', submissionId: 's1', resumed: false },
    })
    state = runReducer(state, {
      type: 'event',
      event: {
        type: 'run_finished',
        conversationId: '42',
        finalMessage: { role: 'assistant', content: 'done' },
      },
    })
    expect(state.status).toBe('finished')
    expect(state.conversationId).toBe('42')
  })

  it('records a terminal error event', () => {
    let state = started()
    state = runReducer(state, { type: 'event', event: { type: 'error', error: 'kaboom' } })
    expect(state.status).toBe('error')
    expect(state.error).toBe('kaboom')
  })

  it('folds a full stream into the final state', () => {
    const events: RunEvent[] = [
      { type: 'run_started', conversationId: '7', submissionId: 's1', resumed: false },
      { type: 'text_delta', text: 'I will list files' },
      { type: 'tool_call_started', id: 't1', name: 'list_files', arguments: { path: '.' } },
      { type: 'tool_result', id: 't1', name: 'list_files', result: 'a\nb' },
      { type: 'text_delta', text: ' done.' },
      { type: 'run_finished', conversationId: '7', finalMessage: { role: 'assistant' } },
    ]
    let state = started()
    for (const event of events) state = runReducer(state, { type: 'event', event })
    expect(state.status).toBe('finished')
    expect(state.conversationId).toBe('7')
    expect(state.text).toBe('I will list files done.')
    expect(state.toolCalls).toHaveLength(1)
    expect(state.toolCalls[0].status).toBe('done')
  })
})
