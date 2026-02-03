import React, { useEffect, useState } from 'react'
import { UserOutlined, PhoneOutlined, MailOutlined, CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import { updateUser } from '../services/userService'
import '../styles/ProfileModal.css'

interface User {
  id: string
  name: string
  phone?: string
  email?: string
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onUpdate: (token: string, user: User) => void
}

export default function ProfileModal({ isOpen, onClose, user, onUpdate }: ProfileModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setPhone(user.phone || '')
    }
  }, [user, isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      message.error(t('profile.usernameRequired'))
      return
    }

    setLoading(true)
    try {
      const response = await updateUser({ name, phone: phone || undefined })
      if (response.success) {
        message.success(t('profile.updateSuccess'))
        onUpdate(response.token, response.user)
        handleClose()
      }
    } catch (error: any) {
      message.error(error.message || t('profile.updateError'))
    } finally {
      setLoading(false)
    }
  }

  const maskEmail = (email?: string) => {
    if (!email) return ''
    const [local, domain] = email.split('@')
    if (!local || !domain) return email
    
    // Keep first 2 chars, mask the rest until last char of local part
    // If local part is too short, just mask appropriate amount
    if (local.length <= 3) {
      return `${local.slice(0, 1)}***@${domain}`
    }
    
    const start = local.slice(0, 2)
    const end = local.slice(-1)
    return `${start}****${end}@${domain}`
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`profile-modal-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`profile-modal ${isClosing ? 'closing' : ''}`}>
        <div className="profile-modal-close" onClick={handleClose}>
          <CloseOutlined />
        </div>
        
        <h2 className="profile-modal-title">{t('profile.title')}</h2>
        
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="profile-input-group">
            <label>{t('profile.username')}</label>
            <div className="profile-input-wrapper">
              <UserOutlined className="profile-input-icon" />
              <input
                type="text"
                className="profile-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('profile.usernamePlaceholder')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="profile-input-group">
            <label>{t('profile.phone')}</label>
            <div className="profile-input-wrapper">
              <PhoneOutlined className="profile-input-icon" />
              <input
                type="text"
                className="profile-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('profile.phonePlaceholder')}
                disabled={loading}
              />
            </div>
          </div>

          <div className="profile-input-group">
            <label>{t('profile.email')}</label>
            <div className="profile-input-wrapper">
              <MailOutlined className="profile-input-icon" />
              <input
                type="text"
                className="profile-input"
                value={maskEmail(user?.email)}
                disabled={true}
                readOnly
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="register-submit-button"
            disabled={loading}
          >
            {loading ? t('profile.updating') : t('profile.update')}
          </button>
        </form>
      </div>
    </div>
  )
}
