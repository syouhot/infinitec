import React, { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import '../styles/FeedbackModal.css'
import { submitFeedback } from '../services/userService'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [content, setContent] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setContent('')
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  if (!isOpen && !isClosing) return null

  const handleSubmit = async () => {
    if (!content.trim()) {
      message.warning('反馈内容不能为空')
      return
    }

    if (content.length > 1000) {
      message.warning('反馈内容不能超过1000字')
      return
    }

    setLoading(true)
    try {
      await submitFeedback(content)
      message.success('提交成功，感谢您的宝贵意见！')
      handleClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`feedback-modal-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`feedback-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="feedback-close-button" onClick={handleClose}>
          <CloseOutlined />
        </button>
        <h2 className="feedback-modal-title">意见反馈</h2>
        <p className="feedback-modal-desc">
          <div style={{textAlign:"center"}}>任何使用方面的错误或改进提案都可以在此说明。</div>
          <div style={{textAlign:"center"}}> 留下您的宝贵意见，我们会不断改进完善，您的支持是我们前进的最大动力！</div>
        </p>
        <div className="feedback-form">
          <textarea
            className="feedback-textarea"
            placeholder="请输入您的建议（最多1000字）"
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          />
          <div className="feedback-char-count">
            {content.length}/1000
          </div>
          <button
            className="feedback-submit-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
