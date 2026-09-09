import { Router } from 'express'
import { modbusService } from '../services/ModbusService.js'
import { logger } from '../services/LoggerService.js'
import { validateSpeedValue } from '../utils/validators.js'
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
  router.post(`/set/${param}`, async (req, res) => {
    const low = validateSpeedValue(req.body.low)
    const high = validateSpeedValue(req.body.high)
    if (low === null || high === null) {
      const response: ApiResponse = {
        success: false,
        error: `Invalid values. Must be ${CONFIG.REGISTERS.MODIFIER_MIN}-${CONFIG.REGISTERS.MODIFIER_MAX}`,
        timestamp: new Date().toISOString(),
      }
      res.status(400).json(response)
      return
    }

    try {
      await modbusService.setRollerSpeed(axis, low, high)
      const response: ApiResponse = {
        success: true,
        data: { axis: param, low, high },
        timestamp: new Date().toISOString(),
      }
      res.json(response)
    } catch (err) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to set roller speed',
        timestamp: new Date().toISOString(),
      }
      res.status(503).json(response)
    }
  })


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

  router.post(`/high/${param}`, async (req, res) => {
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
      await modbusService.writeAxisHighSpeed(axis, value)
      const response: ApiResponse = {
        success: true,
        data: { axis: param, value, speed: value * CONFIG.REGISTERS.BASE_FREQUENCY },
        timestamp: new Date().toISOString(),
      }
      res.json(response)
    } catch (err) {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to write high speed',
        timestamp: new Date().toISOString(),
      }
      res.status(503).json(response)
    }
  })
})

router.post('/conveyor', async (req, res) => {
  const rawValue = Number(req.body.value)
  if (!Number.isFinite(rawValue)) {
    logger.warn('app', `Invalid conveyor value: ${JSON.stringify(req.body.value)}`)
    const response: ApiResponse = {
      success: false,
      error: 'Invalid value. Must be 0-50',
      timestamp: new Date().toISOString(),
    }
    res.status(400).json(response)
    return
  }

  const scaled = Math.round(rawValue * 100)
  if (scaled < CONFIG.REGISTERS.CONVEYOR_MIN || scaled > CONFIG.REGISTERS.CONVEYOR_MAX) {
    logger.warn('app', `Conveyor value out of range: ${rawValue}`)
    const response: ApiResponse = {
      success: false,
      error: 'Invalid value. Must be 0-50',
      timestamp: new Date().toISOString(),
    }
    res.status(400).json(response)
    return
  }

  try {
    await modbusService.writeConveyorSpeed(scaled)
    const response: ApiResponse = {
      success: true,
      data: { value: rawValue, speed: scaled * CONFIG.REGISTERS.BASE_FREQUENCY },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to write conveyor speed',
      timestamp: new Date().toISOString(),
    }
    res.status(503).json(response)
  }
})

export default router
