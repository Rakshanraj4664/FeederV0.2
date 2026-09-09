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

  async readRegister(address: number): Promise<number> {
    if (this._connected !== 'connected') {
      throw new Error('PLC not connected')
    }

    try {
      const result = await this.client.readHoldingRegisters(address, 1)
      return result.data[0]
    } catch (err) {
      logger.error('modbus', `Failed to read register at ${address}`, err)
      this._connected = 'error'
      this.scheduleReconnect()
      throw err
    }
  }

  async writeRegister(address: number, value: number): Promise<boolean> {
    if (this._connected !== 'connected') {
      throw new Error('PLC not connected')
    }

    try {
      await this.client.writeRegister(address, value)
      logger.info('modbus', `Write register at ${address} = ${value}`)
      return true
    } catch (err) {
      logger.error('modbus', `Failed to write register at ${address}`, err)
      this._connected = 'error'
      this.scheduleReconnect()
      throw err
    }
  }

  async readAllState(): Promise<{
    mc1: number; mc2: number; mc3: number; mc4: number
    mc1High: number; mc2High: number; mc3High: number; mc4High: number
    speed1: number; speed2: number; speed3: number; speed4: number
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
    const rawConveyor = await this.readRegister(r.CONVEYOR)
    const rawConveyorClamped = Math.min(r.CONVEYOR_MAX, Math.max(r.CONVEYOR_MIN, Math.round(rawConveyor)))
    const conveyor = Math.round(rawConveyorClamped / 100)
    return { mc1, mc2, mc3, mc4, mc1High, mc2High, mc3High, mc4High, speed1, speed2, speed3, speed4, conveyor }
  }

  async readMachineState(): Promise<{
    speed1: number; speed2: number; speed3: number; speed4: number
  }> {
    const r = CONFIG.REGISTERS
    const speed1 = await this.readFloat(r.AXIS_SPEED.AXIS1)
    const speed2 = await this.readFloat(r.AXIS_SPEED.AXIS2)
    const speed3 = await this.readFloat(r.AXIS_SPEED.AXIS3)
    const speed4 = await this.readFloat(r.AXIS_SPEED.AXIS4)
    return { speed1, speed2, speed3, speed4 }
  }

  async writeCoil(address: number, state: boolean): Promise<boolean> {
    if (this._connected !== 'connected') throw new Error('PLC not connected')
    try {
      await this.client.writeCoil(address, state)
      logger.info('modbus', `Write coil ${address} = ${state}`)
      return true
    } catch (err) {
      logger.error('modbus', `Failed to write coil ${address}`, err)
      this._connected = 'error'
      this.scheduleReconnect()
      throw err
    }
  }

  async readStepperParams(): Promise<{
    speed1: number; distance1: number; speed2: number; distance2: number
  }> {
    const s = CONFIG.REGISTERS.STEPPER
    const speed1 = await this.readRegister(s.SPEED1)
    const distance1 = await this.readRegister(s.DISTANCE1)
    const speed2 = await this.readRegister(s.SPEED2)
    const distance2 = await this.readRegister(s.DISTANCE2)
    return { speed1, distance1, speed2, distance2 }
  }

  async writeStepperParams(
    speed1: number, distance1: number,
    speed2: number, distance2: number
  ): Promise<void> {
    const s = CONFIG.REGISTERS.STEPPER
    await this.writeRegister(s.SPEED1, Math.round(speed1))
    await this.writeRegister(s.DISTANCE1, Math.round(distance1))
    await this.writeRegister(s.SPEED2, Math.round(speed2))
    await this.writeRegister(s.DISTANCE2, Math.round(distance2))
    logger.info('modbus', `Stepper params written (speed: ${speed1}/${speed2}, dist: ${distance1}/${distance2})`)
  }

  async triggerStepperCommand(
    command: 'expand' | 'contract' | 'left' | 'right',
    speed1: number, distance1: number,
    speed2: number, distance2: number
  ): Promise<void> {
    const s = CONFIG.REGISTERS.STEPPER
    const coils = CONFIG.REGISTERS.COMMAND_COILS

    await this.writeRegister(s.SPEED1, Math.round(speed1))
    await this.writeRegister(s.DISTANCE1, Math.round(distance1))
    await this.writeRegister(s.SPEED2, Math.round(speed2))
    await this.writeRegister(s.DISTANCE2, Math.round(distance2))

    const coilAddr = coils[command.toUpperCase() as keyof typeof coils] as number
    await this.writeCoil(coilAddr, true)
    setTimeout(() => {
      this.writeCoil(coilAddr, false).catch(() => {})
    }, 150)
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
    await this.writeFloat(r.MC1, 0)
    await this.writeFloat(r.MC2, 0)
    await this.writeFloat(r.MC3, 0)
    await this.writeFloat(r.MC4, 0)
    await this.writeFloat(hr.MC1, 0)
    await this.writeFloat(hr.MC2, 0)
    await this.writeFloat(hr.MC3, 0)
    await this.writeFloat(hr.MC4, 0)
    await this.writeRegister(CONFIG.REGISTERS.CONVEYOR, 0)
    logger.info('plc', 'EMERGENCY STOP — all modifiers and conveyor set to 0')
  }

  async healthCheck(): Promise<boolean> {
    if (this._connected !== 'connected') return false
    try {
      await this.readFloat(CONFIG.REGISTERS.AXIS_SPEED.AXIS1)
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
