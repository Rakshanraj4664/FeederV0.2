import { useState } from 'react'

interface CreateProfileModalProps {
  onConfirm: (name: string) => void
  onClose: () => void
}

export function CreateProfileModal({ onConfirm, onClose }: CreateProfileModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) {
      onConfirm(trimmed)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-slate-800 mb-4">New Profile</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name..."
            autoFocus
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-cyan-400 transition-all"
          />
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-xl bg-cyan-500 text-white text-sm font-bold hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}