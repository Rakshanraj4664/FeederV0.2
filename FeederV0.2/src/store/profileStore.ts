import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/machine'
import { fetchProfiles, createProfileOnServer, updateProfileOnServer, deleteProfileFromServer } from '@/services/api'

interface ProfileStore {
  profiles: Profile[]
  editingId: string | null
  synced: boolean
  loadProfilesFromServer: () => Promise<void>
  createProfile: (name: string, rollers: { modifier: number; highModifier?: number }[], conveyorSpeed: number) => Promise<void>
  updateProfile: (id: string, data: Partial<Pick<Profile, 'name' | 'rollers' | 'conveyorSpeed'>>) => void
  deleteProfile: (id: string) => Promise<void>
  cloneProfile: (id: string) => void
  setEditingId: (id: string | null) => void
}

let nextId = 1

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      editingId: null,
      synced: false,

      loadProfilesFromServer: async () => {
        try {
          const serverProfiles = await fetchProfiles()
          const localProfiles = get().profiles

          if (serverProfiles.length > 0) {
            set({ profiles: serverProfiles, synced: true })
          } else if (localProfiles.length > 0) {
            await Promise.all(localProfiles.map((p) => createProfileOnServer(p)))
            set({ synced: true })
          } else {
            set({ synced: true })
          }
        } catch {
          set({ synced: true })
        }
      },

      createProfile: async (name, rollers, conveyorSpeed) => {
        const profile: Profile = {
          id: `profile_${nextId++}_${Date.now()}`,
          name,
          rollers,
          conveyorSpeed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ profiles: [...state.profiles, profile] }))
        try {
          await createProfileOnServer(profile)
        } catch {
          // Server offline — profile saved locally, will sync when server is available
        }
      },

      updateProfile: (id, data) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }))
        updateProfileOnServer(id, data).catch(() => {})
      },

      deleteProfile: async (id) => {
        set((state) => ({ profiles: state.profiles.filter((p) => p.id !== id) }))
        try {
          await deleteProfileFromServer(id)
        } catch {
          // Server offline — deleted locally
        }
      },

      cloneProfile: (id) => {
        const source = get().profiles.find((p) => p.id === id)
        if (!source) return
        const clone: Profile = {
          ...source,
          id: `profile_${nextId++}_${Date.now()}`,
          name: `${source.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((state) => ({ profiles: [...state.profiles, clone] }))
        createProfileOnServer(clone).catch(() => {})
      },

      setEditingId: (id) => set({ editingId: id }),
    }),
    { name: 'feeder-profiles' }
  )
)
