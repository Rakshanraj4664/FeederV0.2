export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface SpeedWriteRequest {
  value: number
}

export interface WidthWriteRequest {
  gap: number
  offset: number
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
