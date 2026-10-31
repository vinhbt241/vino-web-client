import { describe, expect, it } from 'vitest'
import type { CommitEvent, Entry, SubmissionRecord } from 'vino-sdk'
import { activeEntryIdOf, applyCommit, compareIds, type ConversationData } from './conversationState'

function entry(id: string, role: Entry['message']['role'], content = 'x'): Entry {
  return { id, kind: role === 'user' ? 'user' : role === 'assistant' ? 'assistant' : 'tool', message: { role, content } }
}

function submission(id: string, status: SubmissionRecord['status'], entryId?: string): SubmissionRecord {
  const rec: SubmissionRecord = { id, type: 'input', status }
  if (entryId !== undefined) rec.entryId = entryId
  return rec
}

const base: ConversationData = {
  id: '12',
  entries: [entry('10', 'user')],
  documents: [],
  submissions: [submission('s1', 'done', '10')],
  agent: null,
}

describe('activeEntryIdOf', () => {
  it('is null when there are no active submissions', () => {
    expect(activeEntryIdOf([submission('s1', 'done', '10')])).toBeNull()
    expect(activeEntryIdOf([])).toBeNull()
  })

  it('returns the earliest active submission entry id', () => {
    expect(
      activeEntryIdOf([
        submission('s1', 'done', '10'),
        submission('s2', 'queued', '11'),
        submission('s3', 'placed', '13'),
      ]),
    ).toBe('11')
  })

  it('skips active submissions without an entryId', () => {
    expect(activeEntryIdOf([submission('s2', 'queued')])).toBeNull()
  })
})

describe('applyCommit', () => {
  it('upserts entries and keeps them sorted by id', () => {
    const commit: CommitEvent = {
      seq: '2',
      writes: [
        { type: 'entry', record: entry('12', 'assistant') },
        { type: 'entry', record: entry('11', 'tool') },
      ],
    }
    const next = applyCommit(base, commit)
    expect(next.entries.map((e) => e.id)).toEqual(['10', '11', '12'])
  })

  it('replaces an existing entry in place', () => {
    const commit: CommitEvent = {
      seq: '2',
      writes: [{ type: 'entry', record: entry('10', 'user', 'edited') }],
    }
    const next = applyCommit(base, commit)
    expect(next.entries).toHaveLength(1)
    expect(next.entries[0].message.content).toBe('edited')
  })

  it('replaces submissions in place when their status changes', () => {
    const commit: CommitEvent = {
      seq: '2',
      writes: [{ type: 'submission', record: submission('s1', 'placed', '10') }],
    }
    const next = applyCommit(base, commit)
    expect(next.submissions).toHaveLength(1)
    expect(next.submissions[0].status).toBe('placed')
    expect(activeEntryIdOf(next.submissions)).toBe('10')
  })

  it('applies conversation agent and document writes', () => {
    const commit: CommitEvent = {
      seq: '2',
      writes: [
        { type: 'conversation', record: { id: '12', agent: { model: 'm1' } } },
        { type: 'document', record: { id: '20', name: 'plan', value: { n: 1 } } },
      ],
    }
    const next = applyCommit(base, commit)
    expect(next.agent).toEqual({ model: 'm1' })
    expect(next.documents).toEqual([{ id: '20', name: 'plan', value: { n: 1 } }])
  })
})

describe('compareIds', () => {
  it('compares numeric ids numerically', () => {
    expect(compareIds('2', '10')).toBeLessThan(0)
    expect(compareIds('10', '10')).toBe(0)
  })

  it('falls back to lexicographic for non-numeric ids', () => {
    expect(compareIds('a', 'b')).toBeLessThan(0)
  })
})
