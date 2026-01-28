import React, { useEffect, useState } from 'react'
import '../styles/LocationNotification.css' // Reuse styles

interface LayerOrderNotificationProps {
  senderName: string
  onApply: () => void
  onClose: () => void
}

const LayerOrderNotification: React.FC<LayerOrderNotificationProps> = ({ senderName, onApply, onClose }) => {
  const [isExiting, setIsExiting] = useState(false)
  const onCloseRef = React.useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
    }, 4500) // Start exit animation slightly before 5s

    const closeTimer = setTimeout(() => {
      if (onCloseRef.current) {
        onCloseRef.current()
      }
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearTimeout(closeTimer)
    }
  }, []) // Empty dependency array ensures timer is set only once

  const handleApply = () => {
    onApply()
    onClose()
  }

  return (
    <div className={`location-notification ${isExiting ? 'exiting' : ''}`}>
      <div className="notification-content">
        <div className="notification-text">
          {senderName}的画布层级信息
        </div>
      </div>
      <button className="track-button" onClick={handleApply}>
        应用
      </button>
      <div className="progress-bar-container">
        <div className="progress-bar" />
      </div>
    </div>
  )
}

export default LayerOrderNotification
