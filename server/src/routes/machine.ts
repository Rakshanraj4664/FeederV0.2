import { Router } from 'express'
import { modbusService } from '../services/ModbusService.js'
import { logger } from '../services/LoggerService.js'
import type { ApiResponse, MachineStateResponse } from '../types/api.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const state = await modbusService.readAllState()
    const response: ApiResponse<MachineStateResponse> = {
      success: true,
      data: {
        rollers: { mc1: state.mc1, mc2: state.mc2, mc3: state.mc3, mc4: state.mc4 },
        highRollers: { mc1: state.mc1High, mc2: state.mc2High, mc3: state.mc3High, mc4: state.mc4High },
        speeds: { axis1: state.speed1, axis2: state.speed2, axis3: state.speed3, axis4: state.speed4 },
        widthGap: state.widthGap,
        widthOffset: state.widthOffset,
        conveyor: state.conveyor,
      },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to read machine state',
      timestamp: new Date().toISOString(),
    }
    res.status(503).json(response)
  }
})

router.post('/emergency', async (_req, res) => {
  try {
    await modbusService.emergencyStop()
    logger.info('plc', 'Emergency stop triggered via API')
    const response: ApiResponse = {
      success: true,
      data: { message: 'Emergency stop — all modifiers set to 0' },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Emergency stop failed',
      timestamp: new Date().toISOString(),
    }
    res.status(500).json(response)
  }
})

export default router
