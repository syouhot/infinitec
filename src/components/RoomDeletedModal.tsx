import React from 'react'
import { useTranslation } from 'react-i18next'
import '../styles/RoomDeletedModal.css'

interface RoomDeletedModalProps {
  isOpen: boolean
  onConfirm: () => void
}

const RoomDeletedModal: React.FC<RoomDeletedModalProps> = ({ isOpen, onConfirm }) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="room-deleted-overlay">
      <div className="room-deleted-modal">
        <div className="room-deleted-icon">
          🚫
        </div>
        <h2 className="room-deleted-title">{t('roomDeleted.title')}</h2>
        <p className="room-deleted-message">{t('roomDeleted.message')}</p>
        <button className="room-deleted-button" onClick={onConfirm}>
          {t('roomDeleted.confirm')}
        </button>
      </div>
    </div>
  )
}

export default RoomDeletedModal
