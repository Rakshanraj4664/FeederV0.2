import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MachineState, MachineStatus } from '@/types/machine'

interface MachineStore extends MachineState, MachineStatus {
  selectedRoller: number
  savedRollers: { modifier: number; highModifier: number }[] | null
  savedConveyor: number
  setRollerModifier: (index: number, modifier: number, speed: number) => void
  setRollerHighModifier: (index: number, highModifier: number, highSpeed: number) => void
  setRollerActualSpeed: (index: number, actualSpeed: number) => void
  setConveyorValue: (value: number) => void
  loadRollerValues: (modifiers: number[], highModifiers: number[], conveyor: number) => void
  setWidthGap: (gap: number) => void
  setWidthOffset: (offset: number) => void
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
  updateFromPoll: (data: Partial<MachineState & MachineStatus>) => void
}

type PersistedState = Pick<MachineStore, 'rollers' | 'widthGap' | 'widthOffset' | 'emergencyStop' | 'running' | 'conveyorValue' | 'selectedRoller' | 'savedRollers' | 'savedConveyor'>

export const useMachineStore = create<MachineStore>()(
  persist(
    (set, get) => ({
      rollers: [
        { modifier: 0, speed: 0, highModifier: 0, highSpeed: 0, actualSpeed: 0, enabled: true },
        { modifier: 0, speed: 0, highModifier: 0, highSpeed: 0, actualSpeed: 0, enabled: true },
        { modifier: 0, speed: 0, highModifier: 0, highSpeed: 0, actualSpeed: 0, enabled: true },
        { modifier: 0, speed: 0, highModifier: 0, highSpeed: 0, actualSpeed: 0, enabled: true },
      ],
      widthGap: 800,
      widthOffset: 0,
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

      setRollerModifier: (index, modifier, speed) =>
        set((state) => {
          const rollers = [...state.rollers]
          rollers[index] = { ...rollers[index], modifier, speed }
          return { rollers: rollers as MachineStore['rollers'], lastUpdate: new Date().toISOString() }
        }),

      setRollerHighModifier: (index, highModifier, highSpeed) =>
        set((state) => {
          const rollers = [...state.rollers]
          rollers[index] = { ...rollers[index], highModifier, highSpeed }
          return { rollers: rollers as MachineStore['rollers'], lastUpdate: new Date().toISOString() }
        }),

      setRollerActualSpeed: (index, actualSpeed) =>
        set((state) => {
          const rollers = [...state.rollers]
          rollers[index] = { ...rollers[index], actualSpeed }
          return { rollers: rollers as MachineStore['rollers'], lastUpdate: new Date().toISOString() }
        }),

      setConveyorValue: (value) => set({ conveyorValue: value, lastUpdate: new Date().toISOString() }),

      loadRollerValues: (modifiers, highModifiers, conveyor) =>
        set((state) => {
          const rollers = [...state.rollers] as MachineStore['rollers']
          for (let i = 0; i < 4; i++) {
            rollers[i] = {
              ...rollers[i],
              modifier: modifiers[i],
              highModifier: highModifiers[i],
              speed: modifiers[i] * 32010,
              highSpeed: highModifiers[i] * 32010,
            }
          }
          return { rollers, conveyorValue: conveyor, lastUpdate: new Date().toISOString() }
        }),

      setWidthGap: (gap) => set({ widthGap: gap, lastUpdate: new Date().toISOString() }),
      setWidthOffset: (offset) => set({ widthOffset: offset, lastUpdate: new Date().toISOString() }),
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
            speed: state.savedRollers[i].modifier * 32010,
            highSpeed: state.savedRollers[i].highModifier * 32010,
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

      updateFromPoll: (data) =>
        set((state) => ({ ...state, ...data, lastUpdate: new Date().toISOString() })),
    }),
    {
      name: 'feeder-machine-state',
      partialize: (state) => ({
        rollers: state.rollers,
        widthGap: state.widthGap,
        widthOffset: state.widthOffset,
        emergencyStop: state.emergencyStop,
        running: state.running,
        conveyorValue: state.conveyorValue,
        selectedRoller: state.selectedRoller,
        savedRollers: state.savedRollers,
        savedConveyor: state.savedConveyor,
      } as PersistedState),
    }
  )
)
