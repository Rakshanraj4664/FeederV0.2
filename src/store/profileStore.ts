import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/machine'

interface ProfileStore {
  profiles: Profile[]
  editingId: string | null
  createProfile: (name: string, rollers: { modifier: number; highModifier?: number }[], conveyorSpeed: number) => void
  updateProfile: (id: string, data: Partial<Pick<Profile, 'name' | 'rollers' | 'conveyorSpeed'>>) => void
  deleteProfile: (id: string) => void
  cloneProfile: (id: string) => void
  setEditingId: (id: string | null) => void
}

let nextId = 1

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      editingId: null,

      createProfile: (name, rollers, conveyorSpeed) =>
        set((state) => ({
          profiles: [
            ...state.profiles,
            {
              id: `profile_${nextId++}_${Date.now()}`,
              name,
              rollers,
              conveyorSpeed,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateProfile: (id, data) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProfile: (id) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        })),

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
      },

      setEditingId: (id) => set({ editingId: id }),
    }),
    { name: 'feeder-profiles' }
  )
)
