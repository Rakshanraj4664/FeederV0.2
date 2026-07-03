import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { verifyDevice, checkAuth } from '@/services/api'

function generateDeviceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = 'DEVICE-'
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

interface AuthStore {
  deviceId: string
  token: string | null
  isTrusted: boolean
  isVerifying: boolean
  lastChecked: string | null
  initDeviceId: () => void
  verifyDevice: () => Promise<boolean>
  checkSession: () => Promise<void>
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      deviceId: '',
      token: null,
      isTrusted: false,
      isVerifying: false,
      lastChecked: null,

      initDeviceId: () => {
        const existing = get().deviceId
        if (!existing) {
          set({ deviceId: generateDeviceId() })
        }
      },

      verifyDevice: async () => {
        const { deviceId } = get()
        if (!deviceId) return false

        set({ isVerifying: true })
        try {
          const result = await verifyDevice(deviceId)
          if (result.success && result.data?.trusted && result.data?.token) {
            set({
              token: result.data.token,
              isTrusted: true,
              isVerifying: false,
              lastChecked: new Date().toISOString(),
            })
            return true
          }
          set({ isTrusted: false, token: null, isVerifying: false, lastChecked: new Date().toISOString() })
          return false
        } catch {
          set({ isTrusted: false, isVerifying: false, lastChecked: new Date().toISOString() })
          return false
        }
      },

      checkSession: async () => {
        const { token } = get()
        if (!token) {
          set({ isTrusted: false })
          return
        }

        try {
          const result = await checkAuth()
          if (result.success && result.data?.trusted) {
            set({ isTrusted: true })
          } else {
            set({ isTrusted: false, token: null })
          }
        } catch {
          set({ isTrusted: false, token: null })
        }
      },

      clearAuth: () => {
        set({ token: null, isTrusted: false, lastChecked: null })
      },
    }),
    {
      name: 'feeder-auth',
      partialize: (state) => ({
        deviceId: state.deviceId,
        token: state.token,
        isTrusted: state.isTrusted,
        lastChecked: state.lastChecked,
      }),
    }
  )
)
