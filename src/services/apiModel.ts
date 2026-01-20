export interface RegisterData {
  name: string
  phone: string
  password: string
}

export interface LoginData {
  phone: string
  password: string
}

export interface RegisterResponse {
  success: boolean
  message: string
  token: string
  user: {
    id: string
    name: string
    phone: string
  }
}

export interface LoginResponse {
  success: boolean
  message: string
  token: string
  user: {
    id: string
    name: string
    phone: string
  }
}

export interface CheckPhoneResponse {
  exists: boolean
}

export interface CreateRoomData {
  password?: string
  maxUsers?: number
}

export interface CreateRoomResponse {
  success: boolean
  message: string
  room: {
    id: string
    roomId: string
    name: string
    maxUsers: number
    status: string
    createdAt: string
  }
}

export interface LeaveRoomData {
  roomId: string
}

export interface LeaveRoomResponse {
  success: boolean
  message: string
}

export interface JoinRoomData {
  roomId: string
  password?: string
}

export interface JoinRoomResponse {
  success: boolean
  message: string
  room: {
    id: string
    roomId: string
    name: string
    maxUsers: number
    status: string
  }
}

export interface DeleteRoomData {
  roomId: string
}

export interface DeleteRoomResponse {
  success: boolean
  message: string
}
