import React from 'react'
import '../styles/RoomDeletedModal.css'

interface RoomDeletedModalProps {
  isOpen: boolean
  onConfirm: () => void
}

const RoomDeletedModal: React.FC<RoomDeletedModalProps> = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null

  return (
    <div className="room-deleted-overlay">
      <div className="room-deleted-modal">
        <div className="room-deleted-icon">
          🚫
        </div>
        <h2 className="room-deleted-title">房间已解散</h2>
        <p className="room-deleted-message">当前房间已解散，请重新创建或加入其他房间</p>
        <button className="room-deleted-button" onClick={onConfirm}>
          确定
        </button>
      </div>
    </div>
  )
}

export default RoomDeletedModal
