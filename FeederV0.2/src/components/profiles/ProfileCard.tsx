import type { Profile } from '@/types/machine'

interface ProfileCardProps {
  profile: Profile
  selected: boolean
  onSelect: (profile: Profile) => void
  onSet: (profile: Profile) => void
  onEdit: (profile: Profile) => void
  onClone: (profile: Profile) => void
  onDelete: (id: string) => void
}

export function ProfileCard({ profile, selected, onSelect, onSet, onEdit, onClone, onDelete }: ProfileCardProps) {
  return (
    <div
      onClick={() => onSelect(profile)}
      className={`rounded-xl border-2 p-4 shadow-sm transition-all duration-200 cursor-pointer ${
        selected
          ? 'border-cyan-400 bg-white shadow-[0_0_20px_rgba(6,182,212,0.1)]'
          : 'border-slate-200/80 bg-white/80 hover:border-slate-300 shadow-sm hover:shadow-md'
      }`}
    >
      <h4 className={`text-sm font-bold truncate mb-3 ${selected ? 'text-cyan-700' : 'text-slate-700'}`}>
        {profile.name}
      </h4>

      <div className="space-y-1 text-xs font-mono text-slate-500">
        {profile.rollers.map((r, i) => (
          <div key={i} className="flex justify-between">
            <span>R{i + 1}:</span>
            <span>
              <span className="text-cyan-600">{r.modifier}</span>
              {(r.highModifier ?? 0) > 0 && (
                <span className="text-orange-500"> / {r.highModifier}</span>
              )}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-100 pt-1 mt-1">
          <span>Conv:</span>
          <span className="text-slate-600">{profile.conveyorSpeed}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onSet(profile) }}
          className="py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 transition-all"
        >
          Set
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(profile) }}
          className="py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 transition-all"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClone(profile) }}
          className="py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 transition-all"
        >
          Clone
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(profile.id) }}
          className="py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-all"
        >
          Delete
        </button>
      </div>
    </div>
  )
}