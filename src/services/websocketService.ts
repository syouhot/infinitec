import { HEARTBEAT_INTERVAL } from '../constants'

interface WebSocketMessage {
  type: string
  timestamp?: number
  roomId?: string
  userId?: string
  userName?: string
  data?: any
}

type RoomDeletedCallback = (roomId: string) => void
type DrawEventCallback = (data: any) => void
type LocationCallback = (data: { userId: string, userName: string, x: number, y: number }) => void
type SnapshotCallback = (data: string, layerOrder?: string[]) => void
type LayerOrderCallback = (data: { layerOrder: string[], userId: string, userName?: string }) => void
type RoomUsersCallback = (users: { userId: string, userName: string }[]) => void
type AudioSignalCallback = (data: { userId: string, signal: any }) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private userId: string | null = null
  private userName: string | null = null
  private roomId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private onRoomDeletedCallback: RoomDeletedCallback | null = null
  private onDrawEventCallback: DrawEventCallback | null = null
  private onLocationCallback: LocationCallback | null = null
  private onSnapshotCallback: SnapshotCallback | null = null
  private onLayerOrderCallback: LayerOrderCallback | null = null
  private onRoomUsersCallback: RoomUsersCallback | null = null
  private onAudioSignalCallback: AudioSignalCallback | null = null

  setRoomDeletedCallback(callback: RoomDeletedCallback): void {
    this.onRoomDeletedCallback = callback
  }

  setDrawEventCallback(callback: DrawEventCallback): void {
    this.onDrawEventCallback = callback
  }

  setLocationCallback(callback: LocationCallback): void {
    this.onLocationCallback = callback
  }

  setSnapshotCallback(callback: SnapshotCallback): void {
    this.onSnapshotCallback = callback
  }

  setLayerOrderCallback(callback: LayerOrderCallback): void {
    this.onLayerOrderCallback = callback
  }

  setRoomUsersCallback(callback: RoomUsersCallback): void {
    this.onRoomUsersCallback = callback
  }

  setAudioSignalCallback(callback: AudioSignalCallback): void {
    this.onAudioSignalCallback = callback
  }


  sendDrawEvent(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomId && this.userId) {
      const message: WebSocketMessage = {
        type: 'draw_event',
        roomId: this.roomId,
        userId: this.userId,
        data
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  sendLocation(userName: string, x: number, y: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomId && this.userId) {
      // Use draw_event type to ensure server forwards it, but wrap as location data
      const message: WebSocketMessage = {
        type: 'draw_event',
        roomId: this.roomId,
        userId: this.userId,
        data: { 
          dataType: 'location',
          userName, 
          x, 
          y 
        }
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  sendAudioSignal(targetUserId: string | null, signal: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomId && this.userId) {
      const message: WebSocketMessage = {
        type: 'draw_event',
        roomId: this.roomId,
        userId: this.userId,
        data: {
          dataType: 'audio_signal',
          targetUserId,
          signal
        }
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  sendSnapshot(data: string, layerOrder?: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomId && this.userId) {
      // Ensure 'local' is replaced with actual userId before sending
      const sanitizedLayerOrder = layerOrder 
        ? layerOrder.map(id => id === 'local' ? this.userId! : id)
        : undefined;

      const message: WebSocketMessage = {
        type: 'save_snapshot',
        roomId: this.roomId,
        userId: this.userId,
        data: {
          data,
          layerOrder: sanitizedLayerOrder
        }
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  sendLayerOrder(layerOrder: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.roomId && this.userId) {
      // Ensure 'local' is replaced with actual userId before sending
      const sanitizedLayerOrder = layerOrder.map(id => id === 'local' ? this.userId! : id);

      const message: WebSocketMessage = {
        type: 'layer_order_update',
        roomId: this.roomId,
        userId: this.userId,
        userName: this.userName || undefined, // Include userName
        data: {
          layerOrder: sanitizedLayerOrder
        }
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  connect(userId: string, roomId: string, userName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userId = userId
      this.roomId = roomId
      this.userName = userName || null

      const wsUrl = `ws://localhost:3001`
      
      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('WebSocket连接成功')
          this.reconnectAttempts = 0
          
          const joinMessage: WebSocketMessage = {
            type: 'join',
            userId,
            roomId,
            userName
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
            } else if (message.type === 'draw_event') {
              // Check if this is a location message masquerading as a draw event
              if (message.data && message.data.dataType === 'location') {
                if (this.onLocationCallback) {
                  this.onLocationCallback({
                    userId: message.userId || '',
                    userName: message.data.userName,
                    x: message.data.x,
                    y: message.data.y
                  })
                }
              } else if (message.data && message.data.dataType === 'audio_signal') {
                // Check if this signal is for me or broadcast
                const targetUserId = message.data.targetUserId;
                if (!targetUserId || targetUserId === this.userId) {
                  if (this.onAudioSignalCallback) {
                    this.onAudioSignalCallback({
                      userId: message.userId || '',
                      signal: message.data.signal
                    })
                  }
                }
              } else {
                // Standard draw event
                if (this.onDrawEventCallback) {
                  this.onDrawEventCallback(message.data)
                }
              }
            } else if (message.type === 'location_share') {
              if (this.onLocationCallback) {
                // Combine message.userId with data if needed, or just pass data
                // The data object from sendLocation already has userName, x, y.
                // We should ensure userId is passed if needed. 
                // sendLocation puts { userName, x, y } in data.
                // We'll add userId from the message root to be safe.
                this.onLocationCallback({
                  userId: message.userId || '',
                  ...message.data
                })
              }
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
            } else if (message.type === 'snapshot_data') {
              if (this.onSnapshotCallback && message.data) {
                this.onSnapshotCallback(message.data, message.layerOrder)
              }
            } else if (message.type === 'layer_order_update') {
               if (this.onLayerOrderCallback && message.data && message.data.layerOrder) {
                 this.onLayerOrderCallback({
                    layerOrder: message.data.layerOrder,
                    userId: message.userId || '',
                    userName: message.userName || message.userId
                 })
               }
            } else if (message.type === 'room_users_update') {
              if (this.onRoomUsersCallback && message.data && message.data.users) {
                this.onRoomUsersCallback(message.data.users)
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
                this.connect(this.userId, this.roomId, this.userName || undefined)
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

  getUserId(): string | null {
    return this.userId
  }
}

export const websocketService = new WebSocketService()
