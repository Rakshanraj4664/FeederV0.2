import ModbusRTU from 'modbus-serial'
import { CONFIG } from '../config.js'
import { logger } from './LoggerService.js'
import type { ConnectionState } from '../types/modbus.js'

export class ModbusService {
  private client: ModbusRTU
  private _connected: ConnectionState = 'disconnected'
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _startTime = Date.now()

  constructor() {
    this.client = new ModbusRTU()
  }

  get connected(): ConnectionState {
    return this._connected
  }

  get uptime(): number {
    return Math.floor((Date.now() - this._startTime) / 1000)
  }

  async connectPLC(): Promise<boolean> {
    if (this._connected === 'connected') return true
    if (this._connected === 'connecting') return false

    try {
      this._connected = 'connecting'
      const connectPromise = this.client.connectTCP(CONFIG.PLC_IP, { port: CONFIG.PLC_PORT })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
      await Promise.race([connectPromise, timeoutPromise])
      this.client.setID(1)
      this.client.setTimeout(2000)
      this._connected = 'connected'
      logger.info('modbus', `PLC connected at ${CONFIG.PLC_IP}:${CONFIG.PLC_PORT}`)
      return true
    } catch (err) {
      try { this.client.close() } catch { }
      this._connected = 'error'
      logger.error('modbus', 'PLC connection failed', err)
      this.scheduleReconnect()
      return false
    }
  }

  async disconnectPLC(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    try {
      this.client.close()
    } catch {
      // ignore
    }
    this._connected = 'disconnected'
    logger.info('modbus', 'PLC disconnected')
  }

  async readFloat(address: number): Promise<number> {
    if (this._connected !== 'connected') {
      throw new Error('PLC not connected')
    }

    try {
      const result = await this.client.readHoldingRegisters(address, 2)
      const buf = Buffer.alloc(4)
      buf.writeUInt16LE(result.data[0], 0)
      buf.writeUInt16LE(result.data[1], 2)
      return buf.readFloatLE(0)
    } catch (err) {
      logger.error('modbus', `Failed to read float at ${address}`, err)
      this._connected = 'error'
      this.scheduleReconnect()
      throw err
    }
  }

  async writeFloat(address: number, value: number): Promise<boolean> {
    if (this._connected !== 'connected') {
      throw new Error('PLC not connected')
    }

    try {
      const buf = Buffer.alloc(4)
      buf.writeFloatLE(value, 0)
      const lowWord = buf.readUInt16LE(0)
      const highWord = buf.readUInt16LE(2)
      await this.client.writeRegisters(address, [lowWord, highWord])
      logger.info('modbus', `Write float at ${address} = ${value}`)
      return true
    } catch (err) {
      logger.error('modbus', `Failed to write float at ${address}`, err)
      this._connected = 'error'
      this.scheduleReconnect()
      throw err
    }
  }

  async readMachineState(): Promise<{
    mc1: number; mc2: number; mc3: number; mc4: number
    mc1High: number; mc2High: number; mc3High: number; mc4High: number
    speed1: number; speed2: number; speed3: number; speed4: number
    widthGap: number; widthOffset: number
    conveyor: number
  }> {
    const r = CONFIG.REGISTERS
    const mc1 = await this.readFloat(r.MODIFIER.MC1)
    const mc2 = await this.readFloat(r.MODIFIER.MC2)
    const mc3 = await this.readFloat(r.MODIFIER.MC3)
    const mc4 = await this.readFloat(r.MODIFIER.MC4)
    const mc1High = await this.readFloat(r.HIGH_MODIFIER.MC1)
    const mc2High = await this.readFloat(r.HIGH_MODIFIER.MC2)
    const mc3High = await this.readFloat(r.HIGH_MODIFIER.MC3)
    const mc4High = await this.readFloat(r.HIGH_MODIFIER.MC4)
    const speed1 = await this.readFloat(r.AXIS_SPEED.AXIS1)
    const speed2 = await this.readFloat(r.AXIS_SPEED.AXIS2)
    const speed3 = await this.readFloat(r.AXIS_SPEED.AXIS3)
    const speed4 = await this.readFloat(r.AXIS_SPEED.AXIS4)
    const widthGap = await this.readFloat(r.WIDTH.EXPAND)
    const widthOffset = await this.readFloat(r.WIDTH.CONTRACT)
    const conveyor = await this.readFloat(r.CONVEYOR)
    return { mc1, mc2, mc3, mc4, mc1High, mc2High, mc3High, mc4High, speed1, speed2, speed3, speed4, widthGap, widthOffset, conveyor }
  }

  async writeAxisSpeed(axis: number, value: number): Promise<boolean> {
    const addresses = [
      CONFIG.REGISTERS.MODIFIER.MC1,
      CONFIG.REGISTERS.MODIFIER.MC2,
      CONFIG.REGISTERS.MODIFIER.MC3,
      CONFIG.REGISTERS.MODIFIER.MC4,
    ]
    if (axis < 1 || axis > 4) throw new Error('Invalid axis (1-4)')
    return this.writeFloat(addresses[axis - 1], value)
  }

  async writeAxisHighSpeed(axis: number, value: number): Promise<boolean> {
    const addresses = [
      CONFIG.REGISTERS.HIGH_MODIFIER.MC1,
      CONFIG.REGISTERS.HIGH_MODIFIER.MC2,
      CONFIG.REGISTERS.HIGH_MODIFIER.MC3,
      CONFIG.REGISTERS.HIGH_MODIFIER.MC4,
    ]
    if (axis < 1 || axis > 4) throw new Error('Invalid axis (1-4)')
    return this.writeFloat(addresses[axis - 1], value)
  }

  async writeConveyorSpeed(value: number): Promise<boolean> {
    return this.writeFloat(CONFIG.REGISTERS.CONVEYOR, value)
  }

  async setRollerSpeed(axis: number, low: number, high: number): Promise<boolean> {
    await this.writeAxisSpeed(axis, low)
    await this.writeAxisHighSpeed(axis, high)
    return true
  }

  async emergencyStop(): Promise<void> {
    const r = CONFIG.REGISTERS.MODIFIER
    const hr = CONFIG.REGISTERS.HIGH_MODIFIER
    await this.writeFloat(r.MC1, 0)
    await this.writeFloat(r.MC2, 0)
    await this.writeFloat(r.MC3, 0)
    await this.writeFloat(r.MC4, 0)
    await this.writeFloat(hr.MC1, 0)
    await this.writeFloat(hr.MC2, 0)
    await this.writeFloat(hr.MC3, 0)
    await this.writeFloat(hr.MC4, 0)
    await this.writeFloat(CONFIG.REGISTERS.CONVEYOR, 0)
    logger.info('plc', 'EMERGENCY STOP — all modifiers and conveyor set to 0')
  }

  async healthCheck(): Promise<boolean> {
    if (this._connected !== 'connected') return false
    try {
      await this.readFloat(CONFIG.REGISTERS.MODIFIER.MC1)
      return true
    } catch {
      return false
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      logger.info('modbus', 'Reconnecting...')
      await this.connectPLC()
    }, CONFIG.RECONNECT_INTERVAL_MS)
  }
}

export const modbusService = new ModbusService()
