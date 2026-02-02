import { useEffect, useState } from 'react'
import { message } from 'antd'
import { LuSlack, LuCopy, LuMic, LuMicOff, LuCamera } from "react-icons/lu";
import { IoWarningOutline } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa6";
import '../styles/CanvasMenu.css'
import '../styles/ConfirmModal.css'
import ThemeControls from './ThemeControls';
import { LayerManager } from './LayerManager';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAppStore, useCanvasStore } from '../store'
import { leaveRoom, deleteRoom } from '../services/roomService'
import { websocketService } from '../services/websocketService'
import { audioService } from '../services/audioService'
import RoomDeletedModal from './RoomDeletedModal'
function CanvasIndex({ onBack }: { onBack: () => void }) {
  const [showBackButton, setShowBackButton] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showRoomDeletedModal, setShowRoomDeletedModal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const { roomId, setRoomId, isRoomOwner, setIsRoomOwner } = useAppStore()
  const setIsScreenshotMode = useAppStore((state) => state.setIsScreenshotMode)
  useEffect(() => {
    if (roomId) {
      audioService.initialize()
      audioService.joinAudioRoom()
    }
    return () => {
      audioService.stopAudio()
      setIsAudioEnabled(false)
    }
  }, [roomId])

  const toggleAudio = async () => {
    try {
      if (isAudioEnabled) {
        audioService.disableMicrophone()
        setIsAudioEnabled(false)
        message.info('麦克风已关闭，仍可收听他人声音')
      } else {
        await audioService.enableMicrophone()
        setIsAudioEnabled(true)
        message.success('麦克风已开启')
      }
    } catch (error) {
      message.error('无法访问麦克风')
      console.error(error)
    }
  }

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

  const handleCopyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      message.success('房间ID已复制');
    } catch (err) {
      message.error('复制失败');
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
            <ThemeControls
              style={{ minWidth: '240px' }}
              onThemeChange={(theme) => useCanvasStore.getState().setTheme(theme)}
            />
            {roomId && (
              <div className="room-info">
                <div className="audio-button-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={toggleAudio}
                    className="location-button"
                    title={isAudioEnabled ? "关闭麦克风" : "开启音频通话"}
                    style={{
                      backgroundColor: isAudioEnabled ? 'rgba(76, 175, 80, 0.2)' : undefined,
                      borderColor: isAudioEnabled ? '#4CAF50' : undefined,
                      color: isAudioEnabled ? '#4CAF50' : undefined
                    }}
                  >
                    {isAudioEnabled ? <LuMic size={12} /> : <LuMicOff size={12} />}
                    {isAudioEnabled ? '关闭音频' : '开启音频'}
                  </button>
                </div>
                <span className="room-label">房间ID</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="room-id">{roomId}</span>
                  <button
                    onClick={handleCopyRoomId}
                    className="copy-button"
                    title="复制房间ID"
                  >
                    <LuCopy size={14} />
                  </button>
                </div>
                <button
                  onClick={() => useCanvasStore.getState().triggerLocationBroadcast()}
                  className="location-button"
                  title="发送当前位置给所有人"
                >
                  <FaLocationArrow size={12} /> 发送坐标
                </button>

                <DndProvider backend={HTML5Backend}>
                  <LayerManager isOwner={isRoomOwner} />
                </DndProvider>
              </div>
            )}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setIsScreenshotMode(true);
              }}
              className="location-button"
              style={{ marginTop: '8px' }}
              title="截取当前视口"
            >
              <LuCamera size={16} /> 截屏
            </button>
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