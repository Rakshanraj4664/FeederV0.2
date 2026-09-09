export interface RollerState {
  modifier: number
  highModifier: number
  actualSpeed: number
  enabled: boolean
}

export interface MachineState {
  rollers: [RollerState, RollerState, RollerState, RollerState]
  emergencyStop: boolean
  running: boolean
  conveyorValue: number
}

export interface MachineStatus {
  plcOnline: boolean
  piOnline: boolean
  websocketConnected: boolean
  lastUpdate: string
  latency: number
}

export interface Profile {
  id: string
  name: string
  rollers: { modifier: number; highModifier?: number }[]
  conveyorSpeed: number
  createdAt: string
  updatedAt: string
}

export const ROLLER_LABELS = ['MC1', 'MC2', 'MC3', 'MC4'] as const
export type RollerId = (typeof ROLLER_LABELS)[number]
