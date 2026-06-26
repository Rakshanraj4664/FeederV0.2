import ModbusRTU from 'modbus-serial'
import { CONFIG } from '../config.js'
import { logger } from './LoggerService.js'
import type { ConnectionState } from '../types/modbus.js'

class ModbusService {
  private client: ModbusRTU
  private _connected: ConnectionState = 'disconnected'
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
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

    try {
      this._connected = 'connecting'
      await this.client.connectTCP(CONFIG.PLC_IP, { port: CONFIG.PLC_PORT })
      this.client.setTimeout(2000)
      this._connected = 'connected'
      this.reconnectAttempts = 0
      logger.info('modbus', `PLC connected at ${CONFIG.PLC_IP}:${CONFIG.PLC_PORT}`)
      return true
    } catch (err) {
      this._connected = 'error'
      this.reconnectAttempts++
      logger.error('modbus', `PLC connection failed (attempt ${this.reconnectAttempts})`, err)
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

  async readRegister(address: number): Promise<number> {
    if (this._connected !== 'connected') {
      throw new Error('PLC not connected')
    }

    try {
      const result = await this.client.readHoldingRegisters(address, 1)
      return result.data[0]
    } catch (err) {
      logger.error('modbus', `Failed to read register ${address}`, err)
      throw err
    }
  }

  async writeRegister(address: number, value: number): Promise<boolean> {
    if (this._connected !== 'connected') {
      throw new Error('PLC not connected')
    }

    try {
      await this.client.writeRegister(address, value)
      logger.info('modbus', `Write register ${address} = ${value}`)
      return true
    } catch (err) {
      logger.error('modbus', `Failed to write register ${address}`, err)
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
    const mc1 = await this.readRegister(r.MODIFIER.MC1)
    const mc2 = await this.readRegister(r.MODIFIER.MC2)
    const mc3 = await this.readRegister(r.MODIFIER.MC3)
    const mc4 = await this.readRegister(r.MODIFIER.MC4)
    const mc1High = await this.readRegister(r.HIGH_MODIFIER.MC1)
    const mc2High = await this.readRegister(r.HIGH_MODIFIER.MC2)
    const mc3High = await this.readRegister(r.HIGH_MODIFIER.MC3)
    const mc4High = await this.readRegister(r.HIGH_MODIFIER.MC4)
    const speed1 = await this.readRegister(r.AXIS_SPEED.AXIS1)
    const speed2 = await this.readRegister(r.AXIS_SPEED.AXIS2)
    const speed3 = await this.readRegister(r.AXIS_SPEED.AXIS3)
    const speed4 = await this.readRegister(r.AXIS_SPEED.AXIS4)
    const widthGap = await this.readRegister(r.WIDTH.EXPAND)
    const widthOffset = await this.readRegister(r.WIDTH.CONTRACT)
    const conveyor = await this.readRegister(r.CONVEYOR)
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
    return this.writeRegister(addresses[axis - 1], Math.round(value))
  }

  async writeAxisHighSpeed(axis: number, value: number): Promise<boolean> {
    const addresses = [
      CONFIG.REGISTERS.HIGH_MODIFIER.MC1,
      CONFIG.REGISTERS.HIGH_MODIFIER.MC2,
      CONFIG.REGISTERS.HIGH_MODIFIER.MC3,
      CONFIG.REGISTERS.HIGH_MODIFIER.MC4,
    ]
    if (axis < 1 || axis > 4) throw new Error('Invalid axis (1-4)')
    return this.writeRegister(addresses[axis - 1], Math.round(value))
  }

  async writeConveyorSpeed(value: number): Promise<boolean> {
    return this.writeRegister(CONFIG.REGISTERS.CONVEYOR, Math.round(value))
  }

  async setRollerSpeed(axis: number, low: number, high: number): Promise<boolean> {
    await this.writeAxisSpeed(axis, low)
    await this.writeAxisHighSpeed(axis, high)
    return true
  }

  async emergencyStop(): Promise<void> {
    const r = CONFIG.REGISTERS.MODIFIER
    const hr = CONFIG.REGISTERS.HIGH_MODIFIER
    await this.writeRegister(r.MC1, 0)
    await this.writeRegister(r.MC2, 0)
    await this.writeRegister(r.MC3, 0)
    await this.writeRegister(r.MC4, 0)
    await this.writeRegister(hr.MC1, 0)
    await this.writeRegister(hr.MC2, 0)
    await this.writeRegister(hr.MC3, 0)
    await this.writeRegister(hr.MC4, 0)
    await this.writeRegister(CONFIG.REGISTERS.CONVEYOR, 0)
    logger.info('plc', 'EMERGENCY STOP — all modifiers and conveyor set to 0')
  }

  async readMachineRunning(): Promise<boolean> {
    if (this._connected !== 'connected') return false
    try {
      const result = await this.client.readDiscreteInputs(CONFIG.REGISTERS.RUNNING_INPUT, 1)
      return Boolean(result.data[0])
    } catch {
      return false
    }
  }

  async healthCheck(): Promise<boolean> {
    if (this._connected !== 'connected') return false
    try {
      await this.readRegister(CONFIG.REGISTERS.MODIFIER.MC1)
      return true
    } catch {
      return false
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    if (this.reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      logger.error('modbus', 'Max reconnect attempts reached')
      return
    }
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      logger.info('modbus', `Reconnecting (attempt ${this.reconnectAttempts + 1})...`)
      await this.connectPLC()
    }, CONFIG.RECONNECT_INTERVAL_MS)
  }
}

export const modbusService = new ModbusService()
