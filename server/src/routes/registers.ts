import { Router } from 'express'
import { modbusService } from '../services/ModbusService.js'
import { CONFIG } from '../config.js'
import type { ApiResponse } from '../types/api.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const r = CONFIG.REGISTERS
    const registers: Record<string, number> = {
      '20002': await modbusService.readRegister(r.MODIFIER.MC1),
      '20008': await modbusService.readRegister(r.MODIFIER.MC2),
      '20014': await modbusService.readRegister(r.MODIFIER.MC3),
      '20020': await modbusService.readRegister(r.MODIFIER.MC4),
      '28022': await modbusService.readRegister(r.AXIS_SPEED.AXIS1),
      '28024': await modbusService.readRegister(r.AXIS_SPEED.AXIS2),
      '28026': await modbusService.readRegister(r.AXIS_SPEED.AXIS3),
      '28028': await modbusService.readRegister(r.AXIS_SPEED.AXIS4),
      '2000': await modbusService.readRegister(r.WIDTH.EXPAND),
      '2004': await modbusService.readRegister(r.WIDTH.CONTRACT),
    }

    const response: ApiResponse = {
      success: true,
      data: { registers },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to read registers',
      timestamp: new Date().toISOString(),
    }
    res.status(503).json(response)
  }
})

export default router
