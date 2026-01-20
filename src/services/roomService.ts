import type { CreateRoomData, CreateRoomResponse, LeaveRoomData, LeaveRoomResponse, JoinRoomData, JoinRoomResponse, DeleteRoomData, DeleteRoomResponse } from './apiModel'
import { api } from './apiFetch'

export async function createRoom(data: CreateRoomData): Promise<CreateRoomResponse> {
  try {
    const result = await api.post<CreateRoomResponse>('/api/rooms', data)
    
    if (!result.success) {
      throw new Error(result.message || '创建房间失败')
    }
    
    return result
  } catch (error) {
    console.error('创建房间失败:', error)
    throw new Error(error instanceof Error ? error.message : '创建房间失败，请稍后重试')
  }
}

export async function leaveRoom(data: LeaveRoomData): Promise<LeaveRoomResponse> {
  try {
    const result = await api.post<LeaveRoomResponse>('/api/rooms/leave', data)
    
    if (!result.success) {
      throw new Error(result.message || '退出房间失败')
    }
    
    return result
  } catch (error) {
    console.error('退出房间失败:', error)
    throw new Error(error instanceof Error ? error.message : '退出房间失败，请稍后重试')
  }
}

export async function joinRoom(data: JoinRoomData): Promise<JoinRoomResponse> {
  try {
    const result = await api.post<JoinRoomResponse>('/api/rooms/join', data)
    
    if (!result.success) {
      throw new Error(result.message || '加入房间失败')
    }
    
    return result
  } catch (error) {
    console.error('加入房间失败:', error)
    throw new Error(error instanceof Error ? error.message : '加入房间失败，请稍后重试')
  }
}

export async function deleteRoom(data: DeleteRoomData): Promise<DeleteRoomResponse> {
  try {
    const result = await api.post<DeleteRoomResponse>('/api/rooms/delete', data)
    
    if (!result.success) {
      throw new Error(result.message || '删除房间失败')
    }
    
    return result
  } catch (error) {
    console.error('删除房间失败:', error)
    throw new Error(error instanceof Error ? error.message : '删除房间失败，请稍后重试')
  }
}
