import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '../styles/RegisterModal.css'
import { changePassword } from '../services/userService'
import { hashPassword } from '../utils/crypto'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [isClosing, setIsClosing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        password: '',
        confirmPassword: ''
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

  const handleSubmit = async () => {
    if (!formData.password || !formData.confirmPassword) {
      message.warning(t('changePassword.fillAllFields'))
      return
    }
    if (formData.password.length < 8) {
      message.warning(t('changePassword.passwordLength'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      message.warning(t('changePassword.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      await changePassword({
        password: hashPassword(formData.password)
      })

      message.success(t('changePassword.success'))
      handleClose()
    } catch (error) {
      console.error('修改密码错误:', error)
      message.error(error instanceof Error ? error.message : t('changePassword.error'))
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
        <h2 className="register-modal-title">{t('changePassword.title')}</h2>
        <div className="register-form">
          <div className="form-group">
            <label>{t('changePassword.newPassword')}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder={t('changePassword.newPasswordPlaceholder')}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>{t('changePassword.confirmPassword')}</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder={t('changePassword.confirmPasswordPlaceholder')}
              disabled={loading}
            />
          </div>

          <button
            className="register-submit-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t('changePassword.submitting') : t('changePassword.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordModal
