/**
 * WebSocket 实时通信系统
 */

export type WSMessageType = 
  | 'agent:status' 
  | 'agent:task'
  | 'system:event'
  | 'log:append'
  | 'ping'
  | 'pong'

export interface WSMessage {
  type: WSMessageType
  timestamp: number
  payload: any
}

export type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private heartbeatInterval: number | null = null
  private heartbeatIntervalMs = 30000
  
  private status: WSConnectionStatus = 'disconnected'
  private listeners: Map<WSMessageType, Set<(msg: WSMessage) => void>> = new Map()
  private statusListeners: Set<(status: WSConnectionStatus) => void> = new Set()

  constructor(port: number = 5173) {
    this.url = `ws://localhost:${port}/ws`
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return
    this.setStatus('connecting')
    
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        this.setStatus('connected')
        this.reconnectAttempts = 0
        this.startHeartbeat()
      }
      
      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          this.handleMessage(msg)
        } catch (e) {}
      }
      
      this.ws.onclose = () => {
        this.setStatus('disconnected')
        this.stopHeartbeat()
        this.attemptReconnect()
      }
      
      this.ws.onerror = () => {
        this.setStatus('error')
      }
    } catch {
      this.setStatus('error')
      this.attemptReconnect()
    }
  }

  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  send(type: WSMessageType, payload: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, timestamp: Date.now(), payload }))
    }
  }

  on(type: WSMessageType, handler: (msg: WSMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
    return () => this.listeners.get(type)?.delete(handler)
  }

  onStatusChange(handler: (status: WSConnectionStatus) => void): () => void {
    this.statusListeners.add(handler)
    return () => this.statusListeners.delete(handler)
  }

  getStatus(): WSConnectionStatus {
    return this.status
  }

  isConnected(): boolean {
    return this.status === 'connected'
  }

  private handleMessage(msg: WSMessage): void {
    if (msg.type === 'pong') return
    const handlers = this.listeners.get(msg.type)
    handlers?.forEach(h => { try { h(msg) } catch {} })
  }

  private setStatus(status: WSConnectionStatus): void {
    this.status = status
    this.statusListeners.forEach(h => h(status))
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = window.setInterval(() => {
      this.send('ping', {})
    }, this.heartbeatIntervalMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    this.reconnectAttempts++
    setTimeout(() => this.connect(), this.reconnectDelay)
  }
}

export const wsClient = new WebSocketClient()

// 便捷方法
export function onAgentStatusChange(callback: (agentId: string, status: string) => void): () => void {
  return wsClient.on('agent:status', (msg) => callback(msg.payload.agentId, msg.payload.status))
}

export function onAgentTaskUpdate(callback: (agentId: string, task: any) => void): () => void {
  return wsClient.on('agent:task', (msg) => callback(msg.payload.agentId, msg.payload.task))
}

export function onSystemEvent(callback: (event: any) => void): () => void {
  return wsClient.on('system:event', (msg) => callback(msg.payload))
}

export function onLogAppend(callback: (log: any) => void): () => void {
  return wsClient.on('log:append', (msg) => callback(msg.payload))
}
