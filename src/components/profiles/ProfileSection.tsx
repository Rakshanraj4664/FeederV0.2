import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { ProfileGrid } from './ProfileGrid'
import { CreateProfileModal } from './CreateProfileModal'
import { ProfileEditorModal } from './ProfileEditorModal'
import { useProfileStore } from '@/store/profileStore'
import { useMachineStore } from '@/store/machineStore'
import { setRollerSpeed, writeConveyorSpeed } from '@/services/api'
import type { Profile } from '@/types/machine'
import { toast } from '@/components/common/Toast'

interface EditorState {
  name: string
  profileId?: string
  rollers: { modifier: number; highModifier: number }[]
  conveyor: number
}

export function ProfileSection() {
  const [showProfiles, setShowProfiles] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const profiles = useProfileStore((s) => s.profiles)
  const createProfile = useProfileStore((s) => s.createProfile)
  const updateProfile = useProfileStore((s) => s.updateProfile)
  const cloneProfile = useProfileStore((s) => s.cloneProfile)
  const deleteProfile = useProfileStore((s) => s.deleteProfile)
  const plcOnline = useMachineStore((s) => s.plcOnline)
  // Auth disabled — isTrusted always true
  const isTrusted = true
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null)

  const handleProfileSelect = (profile: Profile) => {
    setActiveProfileId(profile.id)
  }

  const handleSet = async (profile: Profile) => {
    const modifiers = profile.rollers.map(r => r.modifier)
    const highModifiers = profile.rollers.map(r => r.highModifier ?? 0)
    useMachineStore.getState().loadRollerValues(modifiers, highModifiers, profile.conveyorSpeed)

    try {
      for (let i = 0; i < 4; i++) {
        await setRollerSpeed(i + 1, profile.rollers[i].modifier, profile.rollers[i].highModifier ?? 0)
      }
      await writeConveyorSpeed(profile.conveyorSpeed)
      setPendingProfile(null)
      toast('success', `Profile "${profile.name}" applied to PLC`)
    } catch {
      setPendingProfile(profile)
      toast('info', `Profile "${profile.name}" set locally — will sync when PLC reconnects`)
    }
  }

  useEffect(() => {
    if (!plcOnline || !pendingProfile) return
    let cancelled = false
    const sync = async () => {
      try {
        for (let i = 0; i < 4; i++) {
          await setRollerSpeed(i + 1, pendingProfile.rollers[i].modifier, pendingProfile.rollers[i].highModifier ?? 0)
        }
        await writeConveyorSpeed(pendingProfile.conveyorSpeed)
        if (!cancelled) {
          setPendingProfile(null)
          toast('success', `Profile "${pendingProfile.name}" synced to PLC`)
        }
      } catch {
        // will retry next time PLC reconnects
      }
    }
    sync()
    return () => { cancelled = true }
  }, [plcOnline])

  const handleEdit = (profile: Profile) => {
    setEditorState({
      name: profile.name,
      profileId: profile.id,
      rollers: profile.rollers.map((r) => ({ modifier: r.modifier, highModifier: r.highModifier ?? 0 })),
      conveyor: profile.conveyorSpeed,
    })
  }

  const handleCreateName = (name: string) => {
    setShowCreateModal(false)
    setEditorState({
      name,
      rollers: [
        { modifier: 0, highModifier: 0 },
        { modifier: 0, highModifier: 0 },
        { modifier: 0, highModifier: 0 },
        { modifier: 0, highModifier: 0 },
      ],
      conveyor: 0,
    })
  }

  const handleEditorConfirm = (rollers: { modifier: number; highModifier: number }[], conveyor: number) => {
    if (!editorState) return
    if (editorState.profileId) {
      updateProfile(editorState.profileId, { rollers, conveyorSpeed: conveyor })
      toast('success', `Profile "${editorState.name}" updated`)
    } else {
      createProfile(editorState.name, rollers, conveyor)
      toast('success', `Profile "${editorState.name}" created`)
    }
    setEditorState(null)
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowProfiles((v) => !v)}
        className="flex items-center justify-between w-full px-6 py-3 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md text-slate-600 hover:text-slate-800 text-sm font-semibold transition-all"
      >
        <span>Profiles</span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowCreateModal(true) }}
            disabled={!isTrusted}
            title={!isTrusted ? 'Trust your device first' : ''}
            className="p-1 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-slate-400 text-xs">{showProfiles ? '▾' : '▸'}</span>
        </div>
      </button>

      <AnimatePresence>
        {showProfiles && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-3"
          >
            <ProfileGrid
              profiles={profiles}
              activeProfileId={activeProfileId}
              onProfileSelect={handleProfileSelect}
              onSet={handleSet}
              onEdit={handleEdit}
              onClone={(p) => cloneProfile(p.id)}
              onDelete={(id) => deleteProfile(id)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showCreateModal && (
        <CreateProfileModal
          onConfirm={handleCreateName}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editorState && (
        <ProfileEditorModal
          profileName={editorState.name}
          initialRollers={editorState.rollers}
          initialConveyor={editorState.conveyor}
          onConfirm={handleEditorConfirm}
          onClose={() => setEditorState(null)}
        />
      )}
    </div>
  )
}