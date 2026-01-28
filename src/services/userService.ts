import type { RegisterData, LoginData, UpdateProfileData, RegisterResponse, LoginResponse, CheckPhoneResponse, UpdateProfileResponse } from './apiModel'
import { api } from './apiFetch'

export async function checkPhoneExists(phone: string): Promise<boolean> {
  console.log('检查手机号:', phone);
  
  try {
    const data = await api.post<CheckPhoneResponse>('/api/check-phone', { phone })
    return data.exists
  } catch (error) {
    console.error('检查手机号失败:', error)
    throw new Error('检查手机号失败')
  }
}

export async function registerUser(data: RegisterData): Promise<RegisterResponse> {
  try {
    const result = await api.post<RegisterResponse>('/api/register', data)
    
    if (!result.success) {
      throw new Error(result.message || '注册失败')
    }
    
    return result
  } catch (error) {
    console.error('注册失败:', error)
    throw new Error(error instanceof Error ? error.message : '注册失败，请稍后重试')
  }
}

export async function loginUser(data: LoginData): Promise<LoginResponse> {
  try {
    const result = await api.post<LoginResponse>('/api/login', data)
    
    if (!result.success) {
      throw new Error(result.message || '登录失败')
    }
    
    return result
  } catch (error) {
    console.error('登录失败:', error)
    throw new Error(error instanceof Error ? error.message : '登录失败，请稍后重试')
  }
}

export async function updateUser(data: UpdateProfileData): Promise<UpdateProfileResponse> {
  try {
    const result = await api.post<UpdateProfileResponse>('/api/user/update', data)
    
    if (!result.success) {
      throw new Error(result.message || '更新失败')
    }
    
    return result
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw new Error(error instanceof Error ? error.message : '更新用户信息失败，请稍后重试')
  }
}