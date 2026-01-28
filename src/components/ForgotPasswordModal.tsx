import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined, CheckCircleOutlined } from '@ant-design/icons'
import '../styles/RegisterModal.css'
import { resetPassword } from '../services/userService'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

function ForgotPasswordModal({ isOpen, onClose, onSwitchToLogin }: ForgotPasswordModalProps) {
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
      message.warning('请填写邮箱和手机号')
      return
    }

    if (formData.phone.length !== 11) {
      message.warning('请输入正确的手机号')
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
      message.error(error instanceof Error ? error.message : '重置密码失败，请稍后重试')
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
            <h2 className="register-modal-title">重置成功</h2>
            <div className="success-message">
              <p>新密码已发送至：<span className="highlight-email">{formData.email}</span></p>
              <p>请查收邮件并使用新密码登录</p>
            </div>
            <button className="register-submit-button" onClick={() => { handleClose(); onSwitchToLogin(); }}>
              返回登录
            </button>
          </div>
        ) : (
          <>
            <h2 className="register-modal-title">重置密码</h2>
            <div className="register-form">
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="请输入注册邮箱"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>手机号</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="请输入注册手机号"
                  maxLength={11}
                  disabled={loading}
                />
              </div>

              <button 
                className="register-submit-button" 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? '处理中...' : '重 置 密 码'}
              </button>
              
              <p className="switch-auth-text">
                <span className="switch-auth-link" onClick={onSwitchToLogin}>
                  返回登录
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
