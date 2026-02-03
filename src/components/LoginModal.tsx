import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '../styles/RegisterModal.css'
import { loginUser } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'
import { hashPassword } from '../utils/crypto'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToRegister: () => void
  onSwitchToForgotPassword: () => void
}

function LoginModal({ isOpen, onClose, onSwitchToRegister, onSwitchToForgotPassword }: LoginModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isClosing, setIsClosing] = useState(false)
  const { login } = useAuth()

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        password: ''
      })
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      message.warning(t('login.fillAll'))
      return
    }

    try {
      const result = await loginUser({
        email: formData.email,
        password: hashPassword(formData.password)
      })

      login(result.token, result.user)

      message.success(t('login.success'))
      handleClose()
      setFormData({
        email: '',
        password: ''
      })
    } catch (error) {
      console.error('登录错误:', error)
      message.error(error instanceof Error ? error.message : t('login.error'))
    }
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`register-modal-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`register-modal ${isClosing ? 'closing' : ''}`}>
        <button className="register-close-button" onClick={handleClose}>
          <CloseOutlined />
        </button>
        <h2 className="register-modal-title">{t('login.title')}</h2>
        <div className="register-form">
          <div className="form-group">
            <label>{t('login.email')}</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t('login.emailPlaceholder')}
            />
          </div>
          <div className="form-group">
            <label>{t('login.password')}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder={t('login.passwordPlaceholder')}
            />
          </div>
          <button className="register-submit-button" onClick={handleLogin}>
            {t('login.submit')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="switch-auth-text">
              {t('login.noAccount')}
              <span className="switch-auth-link" onClick={onSwitchToRegister}>
                {t('login.registerLink')}
              </span>
            </p>
            <span
              onClick={onSwitchToForgotPassword}
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'color 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              {t('login.forgotPassword')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
