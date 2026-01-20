import { apiConfig,buildApiUrl } from './apiConfig'

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  headers?: Record<string, string>
}

export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    method = 'POST',
    data,
    headers = {},
    ...restOptions
  } = options

  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...apiConfig.headers,
      ...headers,
    },
  }

  if (data && method !== 'GET') {
    fetchOptions.body = JSON.stringify(data)
  }

  const response = await fetch(buildApiUrl(url), fetchOptions)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(errorData.error || '请求失败')
  }

  return response.json()
}

export const api = {
  get: <T = any>(url: string, options?: Omit<ApiFetchOptions, 'data' | 'method'>) => {
    return apiFetch<T>(url, { ...options, method: 'GET' })
  },

  post: <T = any>(url: string, data?: any, options?: Omit<ApiFetchOptions, 'data' | 'method'>) => {
    return apiFetch<T>(url, { ...options, method: 'POST', data })
  },

  put: <T = any>(url: string, data?: any, options?: Omit<ApiFetchOptions, 'data' | 'method'>) => {
    return apiFetch<T>(url, { ...options, method: 'PUT', data })
  },

  delete: <T = any>(url: string, options?: Omit<ApiFetchOptions, 'data' | 'method'>) => {
    return apiFetch<T>(url, { ...options, method: 'DELETE' })
  },
}
