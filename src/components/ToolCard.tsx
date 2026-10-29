import { useState } from 'react'
import type { ToolCallEntry } from '../hooks/runState'

export function ToolCard({ call }: { call: ToolCallEntry }) {
  const [openOverride, setOpenOverride] = useState(false)
  const open = call.status === 'error' || openOverride

  const statusLabel =
    call.status === 'running' ? 'running…' : call.status === 'error' ? 'error' : 'done'
  const statusClass =
    call.status === 'running'
      ? 'text-amber-400'
      : call.status === 'error'
        ? 'text-red-400'
        : 'text-emerald-400'

  return (
    <div className="my-1 overflow-hidden rounded-md border border-zinc-700 bg-zinc-800/60 text-sm">
      <button
        type="button"
        onClick={() => setOpenOverride((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800"
      >
        <span aria-hidden>🔧</span>
        <span className="truncate font-mono text-zinc-200">{call.name}</span>
        <span className={`shrink-0 text-xs ${statusClass}`}>{statusLabel}</span>
        <span className="ml-auto shrink-0 text-zinc-500">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-zinc-700 px-3 py-2">
          <Field label="Arguments" value={prettyArgs(call.arguments)} />
          {call.result !== undefined && <Field label="Result" value={call.result} />}
          {call.error !== undefined && <Field label="Error" value={call.error} tone="error" />}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, tone }: { label: string; value: string; tone?: 'error' }) {
  return (
    <div>
      <div
        className={`text-xs uppercase tracking-wide ${tone === 'error' ? 'text-red-400' : 'text-zinc-500'}`}
      >
        {label}
      </div>
      <pre
        className={`whitespace-pre-wrap break-words font-mono text-xs ${
          tone === 'error' ? 'text-red-300' : 'text-zinc-300'
        }`}
      >
        {value}
      </pre>
    </div>
  )
}

function prettyArgs(args: Record<string, unknown> | null): string {
  if (args === null) return '(no arguments)'
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}
