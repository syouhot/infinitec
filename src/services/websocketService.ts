import { HEARTBEAT_INTERVAL } from '../constants'

interface WebSocketMessage {
  type: string
  timestamp?: number
  roomId?: string
  userId?: string
}

type RoomDeletedCallback = (roomId: string) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private userId: string | null = null
  private roomId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private onRoomDeletedCallback: RoomDeletedCallback | null = null

  setRoomDeletedCallback(callback: RoomDeletedCallback): void {
    this.onRoomDeletedCallback = callback
  }

  connect(userId: string, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userId = userId
      this.roomId = roomId

      const wsUrl = `ws://localhost:3001`
      
      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket连接成功')
          this.reconnectAttempts = 0
          
          const joinMessage: WebSocketMessage = {
            type: 'join',
            userId,
            roomId
          }
          
          this.ws?.send(JSON.stringify(joinMessage))
          console.log(`发送加入房间消息: ${JSON.stringify(joinMessage)}`)
          
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            console.log(`收到WebSocket消息: ${JSON.stringify(message)}`)
            
            if (message.type === 'joined') {
              console.log(`成功加入房间 ${message.roomId}`)
            } else if (message.type === 'heartbeat') {
              this.handleHeartbeat(message)
            } else if (message.type === 'heartbeat_ack') {
              console.log(`心跳确认，时间戳: ${message.timestamp}`)
            } else if (message.type === 'room_deleted') {
              console.log(`收到房间解散通知: ${message.roomId}`)
              console.log('房间已解散，停止响应心跳并断开连接')
              
              this.stopHeartbeat()
              this.disconnect()
              
              if (this.onRoomDeletedCallback && message.roomId) {
                this.onRoomDeletedCallback(message.roomId)
              }
            }
          } catch (error) {
            console.error('解析WebSocket消息错误:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket连接关闭')
          this.stopHeartbeat()
          
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
            
            setTimeout(() => {
              if (this.userId && this.roomId) {
                this.connect(this.userId, this.roomId)
              }
            }, this.reconnectDelay)
          } else {
            console.log('达到最大重连次数，停止重连')
          }
        }
      } catch (error) {
        console.error('创建WebSocket连接错误:', error)
        reject(error)
      }
    })
  }

  private handleHeartbeat(message: WebSocketMessage): void {
    console.log(`收到心跳检测: ${JSON.stringify(message)}`)
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const response: WebSocketMessage = {
        type: 'heartbeat',
        timestamp: Date.now()
      }
      
      this.ws.send(JSON.stringify(response))
      console.log(`发送心跳响应: ${JSON.stringify(response)}`)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('发送主动心跳')
        const heartbeatMessage: WebSocketMessage = {
          type: 'heartbeat',
          timestamp: Date.now()
        }
        
        this.ws.send(JSON.stringify(heartbeatMessage))
      }
    }, HEARTBEAT_INTERVAL * 1000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  disconnect(): void {
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.userId = null
    this.roomId = null
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const websocketService = new WebSocketService()
