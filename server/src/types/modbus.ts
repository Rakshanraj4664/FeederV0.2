export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ReadResult {
  address: number
  value: number
  error?: string
}

export interface WriteResult {
  address: number
  success: boolean
  error?: string
}

export interface ModbusConfig {
  host: string
  port: number
  timeout: number
  retries: number
}
