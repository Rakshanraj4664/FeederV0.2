import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MachineState, MachineStatus } from '@/types/machine'

interface MachineStore extends MachineState, MachineStatus {
  selectedRoller: number
  savedRollers: { modifier: number; highModifier: number }[] | null
  savedConveyor: number
  setRollerModifier: (index: number, modifier: number) => void
  setRollerHighModifier: (index: number, highModifier: number) => void
  setRollerActualSpeed: (index: number, actualSpeed: number) => void
  setConveyorValue: (value: number) => void
  loadRollerValues: (modifiers: number[], highModifiers: number[], conveyor: number) => void
  setEmergencyStop: (active: boolean) => void
  setSavedRollers: (saved: { modifier: number; highModifier: number }[] | null) => void
  setSavedConveyor: (value: number) => void
  releaseEmergencyStop: () => void
  setPlcOnline: (online: boolean) => void
  setPiOnline: (online: boolean) => void
  setWebSocketConnected: (connected: boolean) => void
  setLatency: (latency: number) => void
  setRunning: (running: boolean) => void
  setSelectedRoller: (index: number) => void
}

type PersistedState = Pick<MachineStore, 'rollers' | 'emergencyStop' | 'running' | 'conveyorValue' | 'selectedRoller' | 'savedRollers' | 'savedConveyor'>

export const useMachineStore = create<MachineStore>()(
  persist(
    (set, get) => ({
      rollers: [
        { modifier: 0, highModifier: 0, actualSpeed: 0, enabled: true },
        { modifier: 0, highModifier: 0, actualSpeed: 0, enabled: true },
        { modifier: 0, highModifier: 0, actualSpeed: 0, enabled: true },
        { modifier: 0, highModifier: 0, actualSpeed: 0, enabled: true },
      ],
      emergencyStop: false,
      running: false,
      conveyorValue: 0,
      selectedRoller: 0,
      plcOnline: false,
      piOnline: false,
      websocketConnected: false,
      lastUpdate: new Date().toISOString(),
      latency: 0,
      savedRollers: null,
      savedConveyor: 0,

      setRollerModifier: (index, modifier) =>
        set((state) => {
          const rollers = [...state.rollers]
          rollers[index] = { ...rollers[index], modifier }
          return { rollers: rollers as MachineStore['rollers'], lastUpdate: new Date().toISOString() }
        }),

      setRollerHighModifier: (index, highModifier) =>
        set((state) => {
          const rollers = [...state.rollers]
          rollers[index] = { ...rollers[index], highModifier }
          return { rollers: rollers as MachineStore['rollers'], lastUpdate: new Date().toISOString() }
        }),

      setRollerActualSpeed: (index, actualSpeed) =>
        set((state) => {
          const rollers = [...state.rollers]
          rollers[index] = { ...rollers[index], actualSpeed }
          return { rollers: rollers as MachineStore['rollers'], lastUpdate: new Date().toISOString() }
        }),

      setConveyorValue: (value) => set({ conveyorValue: Math.min(50, Math.max(0, Math.round(value))), lastUpdate: new Date().toISOString() }),

      loadRollerValues: (modifiers, highModifiers, conveyor) =>
        set((state) => {
          const rollers = [...state.rollers] as MachineStore['rollers']
          for (let i = 0; i < 4; i++) {
            rollers[i] = {
              ...rollers[i],
              modifier: modifiers[i],
              highModifier: highModifiers[i],
            }
          }
          return { rollers, conveyorValue: conveyor, lastUpdate: new Date().toISOString() }
        }),

      setEmergencyStop: (active) => set({ emergencyStop: active }),
      setSavedRollers: (saved) => set({ savedRollers: saved }),
      setSavedConveyor: (value) => set({ savedConveyor: value }),
      releaseEmergencyStop: () => {
        const state = get()
        if (!state.savedRollers) return
        const rollers = [...state.rollers] as MachineStore['rollers']
        for (let i = 0; i < 4; i++) {
          rollers[i] = {
            ...rollers[i],
            modifier: state.savedRollers[i].modifier,
            highModifier: state.savedRollers[i].highModifier,
          }
        }
        set({ rollers, conveyorValue: state.savedConveyor, emergencyStop: false, savedRollers: null, savedConveyor: 0, lastUpdate: new Date().toISOString() })
      },
      setPlcOnline: (online) => set({ plcOnline: online }),
      setPiOnline: (online) => set({ piOnline: online }),
      setWebSocketConnected: (connected) => set({ websocketConnected: connected }),
      setLatency: (latency) => set({ latency }),
      setRunning: (running) => set({ running, lastUpdate: new Date().toISOString() }),
      setSelectedRoller: (index) => set({ selectedRoller: index }),
    }),
    {
      name: 'feeder-machine-state',
      partialize: (state) => ({
        rollers: state.rollers,
        emergencyStop: state.emergencyStop,
        running: state.running,
        conveyorValue: state.conveyorValue,
        selectedRoller: state.selectedRoller,
        savedRollers: state.savedRollers,
        savedConveyor: state.savedConveyor,
      } as PersistedState),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<MachineStore>) }
        merged.conveyorValue = Math.min(50, Math.max(0, Math.round(merged.conveyorValue)))
        return merged
      },
    }
  )
)
