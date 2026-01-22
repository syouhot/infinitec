import { useEffect, useState } from 'react'
import { message } from 'antd'
import { LuSlack } from "react-icons/lu";
import { IoWarningOutline } from "react-icons/io5";
import '../styles/CanvasMenu.css'
import '../styles/ConfirmModal.css'
import ThemeControls from './ThemeControls';
import { useAppStore } from '../store'
import { leaveRoom, deleteRoom } from '../services/roomService'
import { websocketService } from '../services/websocketService'
import RoomDeletedModal from './RoomDeletedModal'
function CanvasIndex({ onBack }: { onBack: () => void }) {
  const [showBackButton, setShowBackButton] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showRoomDeletedModal, setShowRoomDeletedModal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const { roomId, setRoomId, isRoomOwner, setIsRoomOwner } = useAppStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBackButton(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    websocketService.setRoomDeletedCallback((deletedRoomId) => {
      if (deletedRoomId === roomId) {
        setShowRoomDeletedModal(true)
      }
    })
  }, [roomId])

  const handleRoomDeletedConfirm = () => {
    setShowRoomDeletedModal(false)
    websocketService.disconnect()
    setRoomId(null)
    setIsRoomOwner(false)
    onBack()
  }

  const handleExitRoom = async () => {
    if (!roomId) {
      onBack()
      return
    }

    if (isRoomOwner) {
      setShowConfirmModal(true)
      return
    }

    try {
      websocketService.disconnect()
      await leaveRoom({ roomId })
      message.success('已退出房间')
      setRoomId(null)
      setIsRoomOwner(false)
      onBack()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退出房间失败')
    }
  }

  const handleConfirmDelete = async () => {
    try {
      websocketService.disconnect()
      await deleteRoom({ roomId })
      message.success('房间已解散')
      handleCloseConfirmModal()
      setRoomId(null)
      setIsRoomOwner(false)
      onBack()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除房间失败')
    }
  }

  const handleCancelDelete = () => {
    handleCloseConfirmModal()
  }

  const handleCloseConfirmModal = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowConfirmModal(false)
      setIsClosing(false)
    }, 300)
  }

  return (
    <>
      {showBackButton && (
        <div 
          className="menu-container"
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <div className="menu-icon">
            <LuSlack size={30} />
          </div>
          <div className={`menu-dropdown ${isMenuOpen ? 'open' : ''}`}>
            {roomId && (
              <div className="room-info">
                <span className="room-label">房间ID</span>
                <span className="room-id">{roomId}</span>
              </div>
            )}
            <ThemeControls style={{ minWidth: '240px' }} />
            <button className="back-button" onClick={handleExitRoom}>
              ← 退出
            </button>
          </div>
        </div>
      )}
      
      {showConfirmModal && (
        <div className={`confirm-modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleCancelDelete}>
          <div className={`confirm-modal ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              <IoWarningOutline />
            </div>
            <h2 className="confirm-modal-title">确认解散房间</h2>
            <p className="confirm-modal-message">您是房主，退出后房间将自动解散，是否继续？</p>
            <div className="confirm-modal-buttons">
              <button className="confirm-modal-button cancel" onClick={handleCancelDelete}>
                取消
              </button>
              <button className="confirm-modal-button confirm" onClick={handleConfirmDelete}>
                确认解散
              </button>
            </div>
          </div>
        </div>
      )}
      
      <RoomDeletedModal 
        isOpen={showRoomDeletedModal} 
        onConfirm={handleRoomDeletedConfirm}
      />
    </>
  )
}

export default CanvasIndex