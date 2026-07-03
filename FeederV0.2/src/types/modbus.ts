export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

export interface ModbusConnectionState {
  plc: ConnectionStatus
  lastError: string | null
  reconnectAttempts: number
  latency: number
}

export interface RegisterAddress {
  address: number
  name: string
  description: string
  unit?: string
  min?: number
  max?: number
  readonly?: boolean
}

export interface RegisterMap {
  [key: string]: RegisterAddress
}
