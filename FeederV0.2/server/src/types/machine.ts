export interface RollerState {
  modifier: number
  speed: number
}

export interface MachineState {
  mc1: number
  mc2: number
  mc3: number
  mc4: number
  speed1: number
  speed2: number
  speed3: number
  speed4: number
  widthGap: number
  widthOffset: number
}

export interface PlcStatus {
  connected: boolean
  uptime: number
}
