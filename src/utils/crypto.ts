import CryptoJS from 'crypto-js'

const PASSWORD_SALT = 'ywenyun'

export function hashPassword(password: string): string {
  if (!password) return ''
  return CryptoJS.SHA256(password + PASSWORD_SALT).toString()
}
