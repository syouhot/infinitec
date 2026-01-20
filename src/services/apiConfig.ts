const API_BASE_URL = 'http://localhost:3001'

export const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
}

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

