import { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import '../styles/RegisterModal.css'
import { changePassword } from '../services/userService'
import { hashPassword } from '../utils/crypto'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
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
      message.warning('请填写所有字段')
      return
    }
    if (formData.password.length < 8) {
      message.warning('密码长度不能小于8位')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      message.warning('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      await changePassword({
        password: hashPassword(formData.password)
      })

      message.success('修改成功')
      handleClose()
    } catch (error) {
      console.error('修改密码错误:', error)
      message.error(error instanceof Error ? error.message : '修改密码失败，请稍后重试')
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
        <h2 className="register-modal-title">修改密码</h2>
        <div className="register-form">
          <div className="form-group">
            <label>新密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="请输入新密码"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="请再次输入新密码"
              disabled={loading}
            />
          </div>

          <button
            className="register-submit-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '处理中...' : '确 定'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordModal
