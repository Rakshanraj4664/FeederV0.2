export interface RollerState {
  modifier: number
  speed: number
  enabled: boolean
}

export interface MachineState {
  rollers: [RollerState, RollerState, RollerState, RollerState]
  widthGap: number
  widthOffset: number
  emergencyStop: boolean
  running: boolean
}

export interface MachineStatus {
  plcOnline: boolean
  piOnline: boolean
  websocketConnected: boolean
  lastUpdate: string
  latency: number
}

export const ROLLER_LABELS = ['MC1', 'MC2', 'MC3', 'MC4'] as const
export type RollerId = (typeof ROLLER_LABELS)[number]
