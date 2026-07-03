import { WS_URL } from '@/constants/api'
import type { WebSocketMessage } from '@/types/api'

type MessageHandler = (msg: WebSocketMessage) => void
type StatusHandler = (connected: boolean) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private statusHandlers: Set<StatusHandler> = new Set()
  private shouldReconnect = true
  private reconnectDelay = 2000

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        this.notifyStatus(true)
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        this.reconnectDelay = 2000
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage
          this.messageHandlers.forEach((h) => h(msg))
        } catch {
          // skip malformed messages
        }
      }

      this.ws.onclose = () => {
        this.notifyStatus(false)
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private notifyStatus(connected: boolean): void {
    this.statusHandlers.forEach((h) => h(connected))
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000)
      this.connect()
    }, this.reconnectDelay)
  }
}

export const wsService = new WebSocketService()
