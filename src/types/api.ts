export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface StatusResponse {
  plcOnline: boolean
  piOnline: boolean
  uptime: number
  version: string
}

export interface RegisterListResponse {
  registers: Record<string, number>
  timestamp: string
}

export interface MachineStateResponse {
  rollers: {
    mc1: number
    mc2: number
    mc3: number
    mc4: number
  }
  speeds: {
    axis1: number
    axis2: number
    axis3: number
    axis4: number
  }
  widthGap: number
  widthOffset: number
}

export interface SpeedWriteRequest {
  value: number
}

export interface WidthWriteRequest {
  gap: number
  offset: number
}

export interface WebSocketMessage {
  type: 'status' | 'machineState' | 'registerUpdate' | 'error' | 'connection'
  payload: Record<string, unknown>
  timestamp: string
}
