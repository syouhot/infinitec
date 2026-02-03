import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '../styles/RegisterModal.css'
import { registerUser } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'
import { hashPassword } from '../utils/crypto'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isClosing, setIsClosing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { login } = useAuth()

  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
      })
      setIsSuccess(false)
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

  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone) {
      message.warning(t('register.fillAll'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      message.warning(t('register.passwordMismatch'))
      return
    }
    if (formData.password.length < 8) {
      message.warning(t('register.passwordLength'))
      return
    }

    if (formData.phone.length !== 11) {
      message.warning(t('register.invalidPhone'))
      return
    }

    try {
      console.log('注册尝试:', formData)

      await registerUser({
        name: formData.username,
        phone: formData.phone || undefined,
        email: formData.email,
        password: hashPassword(formData.password)
      })

      setIsSuccess(true)

    } catch (error) {
      console.error('注册错误:', error)
      message.error(error instanceof Error ? error.message : t('register.error'))
    }
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`register-modal-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`register-modal ${isClosing ? 'closing' : ''}`}>
        <button className="register-close-button" onClick={handleClose}>
          <CloseOutlined />
        </button>
        
        {isSuccess ? (
          <div className="register-success-content">
            <div className="success-icon-wrapper">
              <CheckCircleOutlined />
            </div>
            <h2 className="register-modal-title">{t('register.successTitle')}</h2>
            <div className="success-message">
              <p>{t('register.successMessage1')}<span className="highlight-email">{formData.email}</span></p>
              <p>{t('register.successMessage2')}</p>
              <p className="sub-text">{t('register.successMessage3')}</p>
            </div>
            <button className="register-submit-button" onClick={() => { handleClose(); onSwitchToLogin(); }}>
              {t('register.goToLogin')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="register-modal-title">{t('register.title')}</h2>
            <div className="register-form">
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder={t('register.usernamePlaceholder')}
                  maxLength={20}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('register.emailPlaceholder')}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={t('register.phonePlaceholder')}
                  maxLength={11}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('register.passwordPlaceholder')}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                />
              </div>

              <button className="register-submit-button" onClick={handleRegister} style={{ marginTop: '20px' }}>
                {t('register.submit')}
              </button>
              <p className="switch-auth-text">
                {t('register.hasAccount')}
                <span className="switch-auth-link" onClick={onSwitchToLogin}>
                  {t('register.loginLink')}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default RegisterModal