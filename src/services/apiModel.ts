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
