import React, { useEffect, useState } from 'react'
import '../styles/LocationNotification.css'

interface LocationNotificationProps {
  senderName: string
  onTrack: () => void
  onClose: () => void
}

const LocationNotification: React.FC<LocationNotificationProps> = ({ senderName, onTrack, onClose }) => {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
    }, 4500) // Start exit animation slightly before 5s

    const closeTimer = setTimeout(() => {
      onClose()
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearTimeout(closeTimer)
    }
  }, [onClose])

  const handleTrack = () => {
    onTrack()
    onClose()
  }

  return (
    <div className={`location-notification ${isExiting ? 'exiting' : ''}`}>
      <div className="notification-content">
        <div className="notification-text">
          {senderName}的坐标信息
        </div>
      </div>
      <button className="track-button" onClick={handleTrack}>
        追踪
      </button>
      <div className="progress-bar-container">
        <div className="progress-bar" />
      </div>
    </div>
  )
}

export default LocationNotification
