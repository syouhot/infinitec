import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import '../styles/RegisterModal.css'
import { loginUser } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToRegister: () => void
}

function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
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
      message.warning('请填写邮箱和密码')
      return
    }

    try {
      const result = await loginUser({
        email: formData.email,
        password: formData.password
      })

      login(result.token, result.user)

      message.success('登录成功！')
      handleClose()
      setFormData({
        email: '',
        password: ''
      })
    } catch (error) {
      console.error('登录错误:', error)
      message.error(error instanceof Error ? error.message : '登录失败，请稍后重试')
    }
  }

  if (!isOpen && !isClosing) return null

  return (
    <div className={`register-modal-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`register-modal ${isClosing ? 'closing' : ''}`}>
        <button className="register-close-button" onClick={handleClose}>
          <CloseOutlined />
        </button>
        <h2 className="register-modal-title">用户登录</h2>
        <div className="register-form">
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="请输入邮箱"
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
          <button className="register-submit-button" onClick={handleLogin}>
            登 录
          </button>
          <p className="switch-auth-text">
            还没有账号？
            <span className="switch-auth-link" onClick={onSwitchToRegister}>
              立即注册
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
