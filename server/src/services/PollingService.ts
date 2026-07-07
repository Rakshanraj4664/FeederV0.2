import { modbusService } from './ModbusService.js'
import { logger } from './LoggerService.js'
import { CONFIG } from '../config.js'

type BroadcastFn = (data: string) => void

class PollingService {
  private interval: ReturnType<typeof setInterval> | null = null
  private broadcast: BroadcastFn | null = null
  private lastState: string | null = null

  start(broadcast: BroadcastFn): void {
    this.broadcast = broadcast
    this.interval = setInterval(async () => {
      await this.poll()
    }, CONFIG.POLL_INTERVAL_MS)
    logger.info('system', `Polling started at ${CONFIG.POLL_INTERVAL_MS}ms interval`)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    logger.info('system', 'Polling stopped')
  }

  private async poll(): Promise<void> {
    try {
      const isPlcOnline = await modbusService.healthCheck()

      if (isPlcOnline) {
        const state = await modbusService.readMachineState()
        const isRunning = state.speed1 > 0 || state.speed2 > 0 || state.speed3 > 0 || state.speed4 > 0

        this.broadcast?.(JSON.stringify({
          type: 'status',
          payload: { plcOnline: true, running: isRunning },
          timestamp: new Date().toISOString(),
        }))

        const stateMsg = {
          type: 'machineState',
          payload: {
            speed1: state.speed1,
            speed2: state.speed2,
            speed3: state.speed3,
            speed4: state.speed4,
            widthGap: state.widthGap,
            widthOffset: state.widthOffset,
          },
          timestamp: new Date().toISOString(),
        }
        const stateStr = JSON.stringify(stateMsg)
        if (stateStr !== this.lastState) {
          this.broadcast?.(stateStr)
          this.lastState = stateStr
        }
      } else {
        modbusService.connectPLC()
        this.broadcast?.(JSON.stringify({
          type: 'status',
          payload: { plcOnline: false, running: false },
          timestamp: new Date().toISOString(),
        }))
      }
    } catch (err) {
      logger.error('plc', 'Polling error', err)
    }
  }
}

export const pollingService = new PollingService()
