import { Router } from 'express'
import { deviceVerification } from '../services/DeviceVerificationService.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import type { ApiResponse } from '../types/api.js'

const router = Router()

router.post('/verify', async (req, res) => {
  const { deviceId } = req.body

  if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
    const response: ApiResponse = {
      success: false,
      error: 'Device ID is required',
      timestamp: new Date().toISOString(),
    }
    res.status(400).json(response)
    return
  }

  const session = await deviceVerification.verifyDevice(deviceId.trim())

  if (!session) {
    const response: ApiResponse = {
      success: false,
      error: 'Device not in whitelist',
      timestamp: new Date().toISOString(),
    }
    res.status(401).json(response)
    return
  }

  const response: ApiResponse = {
    success: true,
    data: {
      trusted: true,
      token: session.token,
      deviceId: session.deviceId,
    },
    timestamp: new Date().toISOString(),
  }
  res.json(response)
})

router.get('/check', requireAuth, (req: AuthenticatedRequest, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      trusted: true,
      deviceId: req.deviceId,
    },
    timestamp: new Date().toISOString(),
  }
  res.json(response)
})

router.post('/reload-whitelist', async (_req, res) => {
  try {
    await deviceVerification.reloadWhitelist()
    const response: ApiResponse = {
      success: true,
      data: { count: deviceVerification.getWhitelistCount() },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to reload whitelist',
      timestamp: new Date().toISOString(),
    }
    res.status(500).json(response)
  }
})

export default router
