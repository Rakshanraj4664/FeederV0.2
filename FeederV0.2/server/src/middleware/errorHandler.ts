import type { Request, Response, NextFunction } from 'express'
import { logger } from '../services/LoggerService.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('app', 'Unhandled error', err)
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  })
}
