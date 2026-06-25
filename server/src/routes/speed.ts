import { Router } from 'express'
import { modbusService } from '../services/ModbusService.js'
import { validateSpeedValue, validateWidthGap, validateWidthOffset } from '../utils/validators.js'
import { CONFIG } from '../config.js'
import type { ApiResponse } from '../types/api.js'

const router = Router()

const MC_ENDPOINTS = [
  { param: 'mc1', axis: 1 },
  { param: 'mc2', axis: 2 },
  { param: 'mc3', axis: 3 },
  { param: 'mc4', axis: 4 },
]

MC_ENDPOINTS.forEach(({ param, axis }) => {
  router.post(`/${param}`, async (req, res) => {
    const value = validateSpeedValue(req.body.value)
    if (value === null) {
      const response: ApiResponse = {
        success: false,
        error: `Invalid value. Must be ${CONFIG.REGISTERS.MODIFIER_MIN}-${CONFIG.REGISTERS.MODIFIER_MAX}`,
        timestamp: new Date().toISOString(),
      }
      res.status(400).json(response)
      return
    }

    try {
      await modbusService.writeAxisSpeed(axis, value)
      const response: ApiResponse = {
        success: true,
        data: { axis: param, value, speed: value * CONFIG.REGISTERS.BASE_FREQUENCY },
        timestamp: new Date().toISOString(),
      }
      res.json(response)
    } catch (err) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to write speed',
        timestamp: new Date().toISOString(),
      }
      res.status(503).json(response)
    }
  })
})

router.post('/width', async (req, res) => {
  const gap = validateWidthGap(req.body.gap)
  const offset = validateWidthOffset(req.body.offset ?? 0)

  if (gap === null) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid gap value (800-2000)',
      timestamp: new Date().toISOString(),
    }
    res.status(400).json(response)
    return
  }

  try {
    await modbusService.writeRegister(CONFIG.REGISTERS.WIDTH.EXPAND, gap)
    if (offset !== null) {
      await modbusService.writeRegister(CONFIG.REGISTERS.WIDTH.CONTRACT, Math.abs(offset))
    }
    const response: ApiResponse = {
      success: true,
      data: { gap, offset: offset ?? 0 },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to write width values',
      timestamp: new Date().toISOString(),
    }
    res.status(503).json(response)
  }
})

export default router
