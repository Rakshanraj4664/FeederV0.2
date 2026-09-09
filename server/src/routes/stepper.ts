import { Router } from 'express'
import { modbusService } from '../services/ModbusService.js'
import { logger } from '../services/LoggerService.js'
import type { ApiResponse } from '../types/api.js'

const router = Router()

const VALID_COMMANDS = ['expand', 'contract', 'left', 'right'] as const

router.get('/', async (_req, res) => {
  try {
    const params = await modbusService.readStepperParams()
    const response: ApiResponse = {
      success: true,
      data: params,
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to read stepper parameters',
      timestamp: new Date().toISOString(),
    }
    res.status(503).json(response)
  }
})

router.post('/command', async (req, res) => {
  const { command, speed1, distance1, speed2, distance2 } = req.body as Record<string, unknown>

  if (!VALID_COMMANDS.includes(command as typeof VALID_COMMANDS[number])) {
    const response: ApiResponse = {
      success: false,
      error: `Invalid command. Must be one of: ${VALID_COMMANDS.join(', ')}`,
      timestamp: new Date().toISOString(),
    }
    res.status(400).json(response)
    return
  }

  const s1 = Number(speed1)
  const d1 = Number(distance1)
  const s2 = Number(speed2)
  const d2 = Number(distance2)

  if (!Number.isFinite(s1) || s1 < 0 || s1 > 65535 ||
      !Number.isFinite(d1) || d1 < 0 || d1 > 65535 ||
      !Number.isFinite(s2) || s2 < 0 || s2 > 65535 ||
      !Number.isFinite(d2) || d2 < 0 || d2 > 65535) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid speed/distance values. Must be 0–65535',
      timestamp: new Date().toISOString(),
    }
    res.status(400).json(response)
    return
  }

  try {
    await modbusService.triggerStepperCommand(
      command as typeof VALID_COMMANDS[number],
      s1, d1, s2, d2
    )
    logger.info('plc', `Stepper command "${command}" sent (speed: ${s1}/${s2}, dist: ${d1}/${d2})`)
    const response: ApiResponse = {
      success: true,
      data: { command, speed1: s1, distance1: d1, speed2: s2, distance2: d2 },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to execute stepper command',
      timestamp: new Date().toISOString(),
    }
    res.status(503).json(response)
  }
})

router.post('/params', async (req, res) => {
  const { speed1, distance1, speed2, distance2 } = req.body as Record<string, unknown>

  const s1 = Number(speed1); const d1 = Number(distance1)
  const s2 = Number(speed2); const d2 = Number(distance2)

  if (!Number.isFinite(s1) || s1 < 0 || s1 > 65535 ||
      !Number.isFinite(d1) || d1 < 0 || d1 > 65535 ||
      !Number.isFinite(s2) || s2 < 0 || s2 > 65535 ||
      !Number.isFinite(d2) || d2 < 0 || d2 > 65535) {
    const response: ApiResponse = {
      success: false,
      error: 'Invalid values. Must be 0–65535',
      timestamp: new Date().toISOString(),
    }
    res.status(400).json(response)
    return
  }

  try {
    await modbusService.writeStepperParams(s1, d1, s2, d2)
    const response: ApiResponse = {
      success: true,
      data: { speed1: s1, distance1: d1, speed2: s2, distance2: d2 },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to write stepper parameters',
      timestamp: new Date().toISOString(),
    }
    res.status(503).json(response)
  }
})

export default router
