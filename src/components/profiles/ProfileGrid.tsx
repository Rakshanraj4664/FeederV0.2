import { ProfileCard } from './ProfileCard'
import type { Profile } from '@/types/machine'

interface ProfileGridProps {
  profiles: Profile[]
  activeProfileId: string | null
  onProfileSelect: (profile: Profile) => void
  onSet: (profile: Profile) => void
  onEdit: (profile: Profile) => void
  onClone: (profile: Profile) => void
  onDelete: (id: string) => void
}

export function ProfileGrid({ profiles, activeProfileId, onProfileSelect, onSet, onEdit, onClone, onDelete }: ProfileGridProps) {
  if (profiles.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        No profiles yet. Create one using the + button above.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {profiles.map((p) => (
        <ProfileCard
          key={p.id}
          profile={p}
          selected={p.id === activeProfileId}
          onSelect={onProfileSelect}
          onSet={onSet}
          onEdit={onEdit}
          onClone={onClone}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}