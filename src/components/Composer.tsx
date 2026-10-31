import { useState } from 'react'

interface ComposerProps {
  isRunning: boolean
  busy: boolean
  onSend: (text: string) => void
  onCancel: () => void
}

export function Composer({ isRunning, busy, onSend, onCancel }: ComposerProps) {
  const [value, setValue] = useState('')
  const steer = busy && !isRunning

  const submit = () => {
    const text = value.trim()
    if (text === '') return
    setValue('')
    onSend(text)
  }

  return (
    <div className="border-t border-zinc-800 p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!isRunning) submit()
          }
        }}
        placeholder={steer ? 'Steer the running run…' : 'Message vino…'}
        rows={2}
        disabled={isRunning}
        className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60"
      />
      <div className="mt-2 flex justify-end">
        {isRunning ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-600"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={value.trim() === ''}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {steer ? 'Steer' : 'Send'}
          </button>
        )}
      </div>
    </div>
  )
}
