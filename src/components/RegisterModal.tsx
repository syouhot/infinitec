import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined, CheckCircleOutlined } from '@ant-design/icons'
import '../styles/RegisterModal.css'
import { registerUser } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
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
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      message.warning('请填写所有必填字段')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      message.warning('两次输入的密码不一致')
      return
    }

    if (formData.phone && formData.phone.length !== 11) {
      message.warning('请输入正确的手机号')
      return
    }

    try {
      console.log('注册尝试:', formData)

      await registerUser({
        name: formData.username,
        phone: formData.phone || undefined,
        email: formData.email,
        password: formData.password
      })

      setIsSuccess(true)

    } catch (error) {
      console.error('注册错误:', error)
      message.error(error instanceof Error ? error.message : '注册失败，请稍后重试')
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
            <h2 className="register-modal-title">注册成功</h2>
            <div className="success-message">
              <p>验证邮件已发送至：<span className="highlight-email">{formData.email}</span></p>
              <p>请登录邮箱点击验证链接完成账号激活</p>
              <p className="sub-text">验证完成后，请使用邮箱和密码登录</p>
            </div>
            <button className="register-submit-button" onClick={() => { handleClose(); onSwitchToLogin(); }}>
              前往登录
            </button>
          </div>
        ) : (
          <>
            <h2 className="register-modal-title">用户注册</h2>
            <div className="register-form">
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="用户名"
                  maxLength={20}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="邮箱"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="手机号"
                  maxLength={11}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="密码"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="确认密码"
                />
              </div>

              <button className="register-submit-button" onClick={handleRegister} style={{ marginTop: '20px' }}>
                注 册
              </button>
              <p className="switch-auth-text">
                已有账号？
                <span className="switch-auth-link" onClick={onSwitchToLogin}>
                  立即登录
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