import type { Request, Response, NextFunction } from 'express'
import { deviceVerification } from '../services/DeviceVerificationService.js'

export interface AuthenticatedRequest extends Request {
  deviceId?: string
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next()
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized — missing or invalid token',
      timestamp: new Date().toISOString(),
    })
    return
  }

  const token = authHeader.slice(7)
  const session = deviceVerification.validateSession(token)

  if (!session) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized — session expired or invalid',
      timestamp: new Date().toISOString(),
    })
    return
  }

  req.deviceId = session.deviceId
  next()
}
