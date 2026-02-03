import React, { useState, useEffect } from 'react'
import { message } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import '../styles/FeedbackModal.css'
import { submitFeedback } from '../services/userService'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useTranslation()
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
      message.warning(t('feedback.contentRequired'))
      return
    }

    if (content.length > 1000) {
      message.warning(t('feedback.contentTooLong'))
      return
    }

    setLoading(true)
    try {
      await submitFeedback(content)
      message.success(t('feedback.success'))
      handleClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('feedback.error'))
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
        <h2 className="feedback-modal-title">{t('feedback.title')}</h2>
        <div className="feedback-modal-desc">
          <div style={{textAlign:"center"}}>{t('feedback.description1')}</div>
          <div style={{textAlign:"center"}}> {t('feedback.description2')}</div>
        </div>
        <div className="feedback-form">
          <textarea
            className="feedback-textarea"
            placeholder={t('feedback.placeholder')}
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
            {loading ? t('feedback.submitting') : t('feedback.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
