import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { CONFIG } from '../config.js'
import { logger } from './LoggerService.js'

interface DeviceSession {
  deviceId: string
  token: string
  createdAt: number
  verified: boolean
}

class DeviceVerificationService {
  private whitelist: Set<string> = new Set()
  private sessions: Map<string, DeviceSession> = new Map()
  private whitelistPath: string

  constructor() {
    this.whitelistPath = CONFIG.WHITELIST_PATH
    this.loadWhitelist()
  }

  private async loadWhitelist(): Promise<void> {
    try {
      if (!existsSync(this.whitelistPath)) {
        await writeFile(this.whitelistPath, '# Device Whitelist\n# Format: MAC_ADDRESS or DEVICE_ID\n')
        logger.info('auth', 'Created empty whitelist file')
        return
      }
      const content = await readFile(this.whitelistPath, 'utf-8')
      this.whitelist.clear()
      content.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
          this.whitelist.add(trimmed.toUpperCase())
        }
      })
      logger.info('auth', `Loaded ${this.whitelist.size} device(s) in whitelist`)
    } catch (err) {
      logger.error('auth', 'Failed to load whitelist', err)
    }
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  async verifyDevice(deviceId: string): Promise<DeviceSession | null> {
    const normalizedId = deviceId.toUpperCase()

    // Check whitelist
    const isAuthorized = this.whitelist.has(normalizedId)

    if (!isAuthorized) {
      logger.warn('auth', `Device ${normalizedId} rejected — not in whitelist`)
      return null
    }

    const session: DeviceSession = {
      deviceId: normalizedId,
      token: this.generateToken(),
      createdAt: Date.now(),
      verified: true,
    }

    this.sessions.set(session.token, session)
    logger.info('auth', `Device ${normalizedId} verified, session created`)
    return session
  }

  validateSession(token: string): DeviceSession | null {
    const session = this.sessions.get(token)
    if (!session) return null

    // Session expires after 24 hours
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
      this.sessions.delete(token)
      return null
    }

    return session
  }

  invalidateSession(token: string): void {
    this.sessions.delete(token)
  }

  async reloadWhitelist(): Promise<void> {
    await this.loadWhitelist()
  }

  getWhitelistCount(): number {
    return this.whitelist.size
  }

  getActiveSessions(): number {
    return this.sessions.size
  }
}

export const deviceVerification = new DeviceVerificationService()
