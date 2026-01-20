import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import '../styles/RegisterModal.css'
import { checkPhoneExists, registerUser } from '../services/userService'
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
    password: '',
    confirmPassword: ''
  })
  const [isClosing, setIsClosing] = useState(false)
  const { login } = useAuth()

  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: '',
        phone: '',
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

  const handleRegister = async () => {
    if (!formData.username || !formData.phone || !formData.password || !formData.confirmPassword) {
      message.warning('请填写所有字段')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      message.warning('两次输入的密码不一致')
      return
    }

    if (formData.phone.length !== 11) {
      message.warning('请输入正确的手机号')
      return
    }

    try {
      console.log('注册尝试:', formData)
      const phoneExists = await checkPhoneExists(formData.phone)
      if (phoneExists) {
        message.warning('该手机号已被注册')
        return
      }

      const result = await registerUser({
        name: formData.username,
        phone: formData.phone,
        password: formData.password
      })

      login(result.token, result.user)

      message.success('注册成功！')
      handleClose()
      setFormData({
        username: '',
        phone: '',
        password: '',
        confirmPassword: ''
      })
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
        <h2 className="register-modal-title">用户注册</h2>
        <div className="register-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="请输入用户名"
              maxLength={20}
            />
          </div>
          <div className="form-group">
            <label>手机号</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="请输入手机号"
              maxLength={11}
            />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="请输入密码"
            />
          </div>
          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="请再次输入密码"
            />
          </div>
          <button className="register-submit-button" onClick={handleRegister}>
            注 册
          </button>
          <p className="switch-auth-text">
            已有账号？
            <span className="switch-auth-link" onClick={onSwitchToLogin}>
              立即登录
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterModal