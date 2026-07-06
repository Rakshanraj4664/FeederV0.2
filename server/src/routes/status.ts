import { Router } from 'express'
import { modbusService } from '../services/ModbusService.js'
import { deviceVerification } from '../services/DeviceVerificationService.js'
import { CONFIG } from '../config.js'
import type { ApiResponse } from '../types/api.js'

const router = Router()

router.get('/', async (_req, res) => {
  let running = false
  try {
    const state = await modbusService.readMachineState()
    running = state.speed1 > 0 || state.speed2 > 0 || state.speed3 > 0 || state.speed4 > 0
  } catch {
  }
  const response: ApiResponse = {
    success: true,
    data: {
      plcOnline: modbusService.connected === 'connected',
      running,
      piOnline: true,
      uptime: modbusService.uptime,
      version: '1.0.0',
      whitelistCount: deviceVerification.getWhitelistCount(),
      activeSessions: deviceVerification.getActiveSessions(),
      config: {
        plcIp: CONFIG.PLC_IP,
        piIp: CONFIG.PI_IP,
        pollInterval: CONFIG.POLL_INTERVAL_MS,
      },
    },
    timestamp: new Date().toISOString(),
  }
  res.json(response)
})

export default router
