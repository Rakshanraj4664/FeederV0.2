import { appendFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG } from '../config.js'

type LogCategory = 'app' | 'modbus' | 'plc' | 'auth' | 'system'

class LoggerService {
  private logDir: string
  private buffer: string[] = []
  private flushInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.logDir = CONFIG.LOG_DIR
    this.ensureLogDir()
    this.flushInterval = setInterval(() => this.flush(), 5000)
  }

  private async ensureLogDir() {
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true })
    }
  }

  private log(level: string, category: LogCategory, message: string, data?: unknown) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ?? null,
    }
    const line = JSON.stringify(entry)
    this.buffer.push(line)
    if (CONFIG.isDevelopment) {
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}]`
      if (level === 'error') {
        console.error(`${prefix} ${message}`, data ?? '')
      } else {
        console.log(`${prefix} ${message}`, data ?? '')
      }
    }
  }

  private async flush() {
    if (this.buffer.length === 0) return
    const lines = this.buffer.splice(0, this.buffer.length)
    const date = new Date().toISOString().slice(0, 10)
    const filePath = join(this.logDir, `${date}.log`)
    try {
      await appendFile(filePath, lines.join('\n') + '\n')
    } catch {
      console.error('Failed to write log file')
    }
  }

  info(category: LogCategory, message: string, data?: unknown) {
    this.log('info', category, message, data)
  }

  warn(category: LogCategory, message: string, data?: unknown) {
    this.log('warn', category, message, data)
  }

  error(category: LogCategory, message: string, data?: unknown) {
    this.log('error', category, message, data)
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

export const logger = new LoggerService()
