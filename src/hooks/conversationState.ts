import type {
  AgentConfig,
  CommitEvent,
  DocumentRecord,
  Entry,
  SubmissionRecord,
} from 'vino-sdk'

/** The committed state a conversation hook renders and folds commits into. */
export interface ConversationData {
  id: string
  entries: Entry[]
  documents: DocumentRecord[]
  submissions: SubmissionRecord[]
  agent: AgentConfig | null
}

/** Submission statuses that mean a run is still in flight. */
const ACTIVE_SUBMISSION_STATUSES = new Set(['queued', 'placed'])

/**
 * The committed entry id that starts the conversation's in-flight turn: the
 * earliest active submission's user entry. `null` when the conversation is
 * settled (no queued/placed submission).
 */
export function activeEntryIdOf(submissions: SubmissionRecord[]): string | null {
  let min: string | null = null
  for (const s of submissions) {
    if (!ACTIVE_SUBMISSION_STATUSES.has(s.status)) continue
    if (s.entryId === undefined) continue
    if (min === null || compareIds(s.entryId, min) < 0) min = s.entryId
  }
  return min
}

/**
 * Folds one atomic commit batch into committed state. Entries/documents/
 * submissions are upserted by id (submissions change status in place); entries
 * stay sorted by ascending id so transcript order is stable.
 */
export function applyCommit(data: ConversationData, commit: CommitEvent): ConversationData {
  let { entries, documents, submissions, agent } = data
  for (const write of commit.writes) {
    switch (write.type) {
      case 'conversation':
        agent = write.record.agent
        break
      case 'entry':
        entries = upsertById(entries, write.record)
        break
      case 'document':
        documents = upsertById(documents, write.record)
        break
      case 'submission':
        submissions = upsertById(submissions, write.record)
        break
    }
  }
  entries = [...entries].sort((a, b) => compareIds(a.id, b.id))
  return { ...data, entries, documents, submissions, agent }
}

function upsertById<T extends { id: string }>(records: T[], record: T): T[] {
  const idx = records.findIndex((r) => r.id === record.id)
  if (idx === -1) return [...records, record]
  const next = [...records]
  next[idx] = record
  return next
}

/** Compares ids numerically when both parse, else lexicographically. */
export function compareIds(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return a.localeCompare(b)
}
