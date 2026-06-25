import express from 'express'
import cors from 'cors'
import compression from 'compression'
import helmet from 'helmet'
import { createServer } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { CONFIG } from './config.js'
import { modbusService } from './services/ModbusService.js'
import { pollingService } from './services/PollingService.js'
import { logger } from './services/LoggerService.js'
import { errorHandler } from './middleware/errorHandler.js'
import statusRouter from './routes/status.js'
import machineRouter from './routes/machine.js'
import registersRouter from './routes/registers.js'
import speedRouter from './routes/speed.js'

const app = express()
const server = createServer(app)

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: '*' }))
app.use(compression())
app.use(express.json())

// Trust proxy
app.set('trust proxy', 1)

// Routes
app.use('/api/status', statusRouter)
app.use('/api/machine', machineRouter)
app.use('/api/registers', registersRouter)
app.use('/api/speed', speedRouter)
app.use('/api', speedRouter)  // width endpoint

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: modbusService.uptime })
})

// Error handler
app.use(errorHandler)

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', async (ws: WebSocket) => {
  logger.info('system', 'WebSocket client connected')

  // Send initial status
  const running = await modbusService.readMachineRunning()
  ws.send(JSON.stringify({
    type: 'status',
    payload: { plcOnline: modbusService.connected === 'connected', running },
    timestamp: new Date().toISOString(),
  }))

  ws.on('close', () => {
    logger.info('system', 'WebSocket client disconnected')
  })

  ws.on('error', (err) => {
    logger.error('system', 'WebSocket error', err)
  })
})

// Broadcast function for polling service
function broadcast(data: string): void {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

// Start services
async function start() {
  logger.info('system', `Server starting on port ${CONFIG.PORT}...`)

  // Connect to PLC
  await modbusService.connectPLC()

  // Start polling
  pollingService.start(broadcast)

  // Start HTTP server
  server.listen(CONFIG.PORT, () => {
    logger.info('system', `Server listening on http://0.0.0.0:${CONFIG.PORT}`)
    console.log(`\n  Feeder HMI Server running:`)
    console.log(`  - HTTP:    http://localhost:${CONFIG.PORT}`)
    console.log(`  - API:     http://localhost:${CONFIG.PORT}/api`)
    console.log(`  - WebSocket: ws://localhost:${CONFIG.PORT}/ws`)
    console.log(`  - Mode:    ${CONFIG.isDevelopment ? 'Development' : 'Production'}\n`)
  })
}

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info('system', `Received ${signal}, shutting down...`)
  pollingService.stop()
  await modbusService.disconnectPLC()
  wss.close()
  server.close(() => {
    logger.info('system', 'Server closed')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('uncaughtException', (err) => {
  logger.error('system', 'Uncaught exception', err)
})
process.on('unhandledRejection', (reason) => {
  logger.error('system', 'Unhandled rejection', reason)
})

start()
