import React, { useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import '../styles/RoomModal.css'
import { createRoom, joinRoom } from '../services/roomService'

interface RoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateRoom: (password: string, roomId: string) => void
  onJoinRoom: (roomId: string, password: string) => void
}

const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, onCreateRoom, onJoinRoom }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')
  const [password, setPassword] = useState('')
  const [roomId, setRoomId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setPassword('')
      setRoomId('')
      setIsClosing(false)
    }, 300)
  }

  if (!isOpen && !isClosing) return null

  const handleCreateRoom = async () => {
    setIsCreating(true)
    try {
      const result = await createRoom({
        password: password.trim() || undefined
      })
      
      message.success(t('room.createSuccess', { roomId: result.room.roomId }))
      handleClose()
      onCreateRoom(password.trim(), result.room.roomId)
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('room.createError'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      message.warning(t('room.roomIdRequired'))
      return
    }

    setIsJoining(true)
    try {
      const result = await joinRoom({
        roomId: roomId.trim(),
        password: password.trim() || undefined
      })
      
      message.success(t('room.joinSuccess'))
      handleClose()
      onJoinRoom(roomId.trim(), password.trim())
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('room.joinError'))
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className={`room-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`room-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="room-close-button" onClick={handleClose}>
          <CloseOutlined />
        </button>
        <h2 className="room-modal-title">{t('room.title')}</h2>

        <div className="room-modal-tabs">
          <div className={`tab-slider`} data-tab={activeTab} />
          <button
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            {t('room.createTab')}
          </button>
          <button
            className={`tab-button ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            {t('room.joinTab')}
          </button>
        </div>

        <div className="room-modal-content">
          {activeTab === 'create' ? (
            <div className="create-room-form">
              <div className="form-group">
                <label>{t('room.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.trim())}
                  placeholder={t('room.passwordPlaceholder')}
                  maxLength={20}
                />
              </div>
              <button 
                className="confirm-button" 
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? t('room.creating') : t('room.createConfirm')}
              </button>
            </div>
          ) : (
            <div className="join-room-form">
              <div className="form-group">
                <label>{t('room.roomId')}</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.trim())}
                  placeholder={t('room.roomIdPlaceholder')}
                  maxLength={20}
                />
              </div>
              <div className="form-group">
                <label>{t('room.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.trim())}
                  placeholder={t('room.passwordPlaceholder')}
                  maxLength={20}
                />
              </div>
              <button 
                className="confirm-button" 
                onClick={handleJoinRoom}
                disabled={isJoining}
              >
                {isJoining ? t('room.joining') : t('room.joinConfirm')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoomModal
