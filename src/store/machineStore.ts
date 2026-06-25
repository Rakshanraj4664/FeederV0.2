import { create } from 'zustand'
import type { MachineState, MachineStatus } from '@/types/machine'

interface MachineStore extends MachineState, MachineStatus {
  selectedRoller: number
  setRollerModifier: (index: number, modifier: number, speed: number) => void
  setWidthGap: (gap: number) => void
  setWidthOffset: (offset: number) => void
  setEmergencyStop: (active: boolean) => void
  setPlcOnline: (online: boolean) => void
  setPiOnline: (online: boolean) => void
  setWebSocketConnected: (connected: boolean) => void
  setLatency: (latency: number) => void
  setRunning: (running: boolean) => void
  setSelectedRoller: (index: number) => void
  updateFromPoll: (data: Partial<MachineState & MachineStatus>) => void
}

export const useMachineStore = create<MachineStore>((set) => ({
  rollers: [
    { modifier: 0, speed: 0, enabled: true },
    { modifier: 0, speed: 0, enabled: true },
    { modifier: 0, speed: 0, enabled: true },
    { modifier: 0, speed: 0, enabled: true },
  ],
  widthGap: 800,
  widthOffset: 0,
  emergencyStop: false,
  running: false,
  selectedRoller: 0,
  plcOnline: false,
  piOnline: false,
  websocketConnected: false,
  lastUpdate: new Date().toISOString(),
  latency: 0,

  setRollerModifier: (index, modifier, speed) =>
    set((state) => {
      const rollers = [...state.rollers]
      rollers[index] = { ...rollers[index], modifier, speed }
      return { rollers: rollers as MachineStore['rollers'], lastUpdate: new Date().toISOString() }
    }),

  setWidthGap: (gap) => set({ widthGap: gap, lastUpdate: new Date().toISOString() }),
  setWidthOffset: (offset) => set({ widthOffset: offset, lastUpdate: new Date().toISOString() }),
  setEmergencyStop: (active) => set({ emergencyStop: active }),
  setPlcOnline: (online) => set({ plcOnline: online }),
  setPiOnline: (online) => set({ piOnline: online }),
  setWebSocketConnected: (connected) => set({ websocketConnected: connected }),
  setLatency: (latency) => set({ latency }),
  setRunning: (running) => set({ running, lastUpdate: new Date().toISOString() }),
  setSelectedRoller: (index) => set({ selectedRoller: index }),

  updateFromPoll: (data) =>
    set((state) => ({ ...state, ...data, lastUpdate: new Date().toISOString() })),
}))
