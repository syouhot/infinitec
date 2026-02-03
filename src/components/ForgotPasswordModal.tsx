import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '../styles/RegisterModal.css'
import { resetPassword } from '../services/userService'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

function ForgotPasswordModal({ isOpen, onClose, onSwitchToLogin }: ForgotPasswordModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    email: '',
    phone: ''
  })
  const [isClosing, setIsClosing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        phone: ''
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

  const handleSubmit = async () => {
    if (!formData.email || !formData.phone) {
      message.warning(t('forgotPassword.fillAll'))
      return
    }

    if (formData.phone.length !== 11) {
      message.warning(t('forgotPassword.invalidPhone'))
      return
    }

    setLoading(true)
    try {
      await resetPassword({
        email: formData.email,
        phone: formData.phone
      })

      setIsSuccess(true)
    } catch (error) {
      console.error('重置密码错误:', error)
      message.error(error instanceof Error ? error.message : t('forgotPassword.error'))
    } finally {
      setLoading(false)
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
            <h2 className="register-modal-title">{t('forgotPassword.successTitle')}</h2>
            <div className="success-message">
              <p>{t('forgotPassword.successMessage1')}<span className="highlight-email">{formData.email}</span></p>
              <p>{t('forgotPassword.successMessage2')}</p>
            </div>
            <button className="register-submit-button" onClick={() => { handleClose(); onSwitchToLogin(); }}>
              {t('forgotPassword.backToLogin')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="register-modal-title">{t('forgotPassword.title')}</h2>
            <div className="register-form">
              <div className="form-group">
                <label>{t('forgotPassword.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>{t('forgotPassword.phone')}</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={t('forgotPassword.phonePlaceholder')}
                  maxLength={11}
                  disabled={loading}
                />
              </div>

              <button 
                className="register-submit-button" 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
              </button>
              
              <p className="switch-auth-text">
                <span className="switch-auth-link" onClick={onSwitchToLogin}>
                  {t('forgotPassword.backToLogin')}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordModal
