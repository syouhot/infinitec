import React, { useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import '../styles/RoomModal.css'
import { createRoom, joinRoom } from '../services/roomService'

interface RoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateRoom: (password: string, roomId: string) => void
  onJoinRoom: (roomId: string, password: string) => void
}

const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, onCreateRoom, onJoinRoom }) => {
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
        password: password || undefined
      })
      
      message.success(`房间创建成功！房间ID: ${result.room.roomId}`)
      handleClose()
      onCreateRoom(password, result.room.roomId)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建房间失败，请稍后重试')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      message.warning('请输入房间ID')
      return
    }

    setIsJoining(true)
    try {
      const result = await joinRoom({
        roomId: roomId,
        password: password || undefined
      })
      
      message.success('加入房间成功')
      handleClose()
      onJoinRoom(roomId, password)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加入房间失败，请稍后重试')
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
        <h2 className="room-modal-title">房间管理</h2>

        <div className="room-modal-tabs">
          <div className={`tab-slider`} data-tab={activeTab} />
          <button
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            创建房间
          </button>
          <button
            className={`tab-button ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            加入房间
          </button>
        </div>

        <div className="room-modal-content">
          {activeTab === 'create' ? (
            <div className="create-room-form">
              <div className="form-group">
                <label>房间密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入房间密码（可选）"
                  maxLength={20}
                />
              </div>
              <button 
                className="confirm-button" 
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? '创建中...' : '确认创建'}
              </button>
            </div>
          ) : (
            <div className="join-room-form">
              <div className="form-group">
                <label>房间ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="请输入房间ID"
                  maxLength={20}
                />
              </div>
              <div className="form-group">
                <label>房间密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入房间密码"
                  maxLength={20}
                />
              </div>
              <button 
                className="confirm-button" 
                onClick={handleJoinRoom}
                disabled={isJoining}
              >
                {isJoining ? '加入中...' : '确认加入'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoomModal
