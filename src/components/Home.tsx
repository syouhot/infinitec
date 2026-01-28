import { useEffect, useRef, useState } from 'react'
import { message, Dropdown } from 'antd'
import { type MenuProps } from 'antd'
import { UserOutlined, LogoutOutlined, DownOutlined } from '@ant-design/icons'
import '../styles/Home.css'
import RegisterModal from './RegisterModal'
import LoginModal from './LoginModal'
import RoomModal from './RoomModal'
import ProfileModal from './ProfileModal'
import { useAuth } from '../contexts/AuthContext'
import { useAppStore } from "../store"
import { websocketService } from '../services/websocketService'

interface HomeProps {
  onDoubleClick: () => void
  isHidden?: boolean
}

function Home({ onDoubleClick, isHidden = false }: HomeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const { user, isAuthenticated, logout, login } = useAuth()
  const { setRoomId, setIsRoomOwner } = useAppStore()

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人信息',
      icon: <UserOutlined />,
      onClick: () => setShowProfileModal(true),
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: logout,
    },
  ]

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false)
    setTimeout(() => {
      setShowLoginModal(true)
    }, 300)
  }

  const handleSwitchToRegister = () => {
    setShowLoginModal(false)
    setTimeout(() => {
      setShowRegisterModal(true)
    }, 300)
  }

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false)
  }

  const handleCloseLoginModal = () => {
    setShowLoginModal(false)
  }

  const handleMultiplayerClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
    } else {
      setShowRoomModal(true)
    }
  }

  const handleCreateRoom = async (password: string, roomId: string) => {
    console.log('创建房间:', { password, roomId })
    setShowRoomModal(false)
    setRoomId(roomId)
    setIsRoomOwner(true)
    
    if (user) {
      try {
        await websocketService.connect(user.id, roomId)
        console.log('WebSocket连接已建立')
      } catch (error) {
        console.error('WebSocket连接失败:', error)
      }
    }
    
    onDoubleClick()
  }

  const handleJoinRoom = async (roomId: string, password: string) => {
    console.log('加入房间:', { roomId, password })
    setShowRoomModal(false)
    setRoomId(roomId)
    setIsRoomOwner(false)
    
    if (user) {
      try {
        await websocketService.connect(user.id, roomId)
        console.log('WebSocket连接已建立')
      } catch (error) {
        console.error('WebSocket连接失败:', error)
      }
    }
    
    onDoubleClick()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const stars: Array<{ x: number, y: number, size: number, brightness: number }> = []
    const starCount = 200

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        brightness: Math.random()
      })
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 30, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach(star => {
        star.brightness += (Math.random() - 0.5) * 0.1
        star.brightness = Math.max(0.3, Math.min(1, star.brightness))

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  useEffect(() => {
    if (isHidden || showRegisterModal || showLoginModal) return

    window.addEventListener('dblclick', onDoubleClick)
    
    return () => {
      window.removeEventListener('dblclick', onDoubleClick)
    }
  }, [onDoubleClick, isHidden, showRegisterModal, showLoginModal])

  return (
    <>
      <canvas ref={canvasRef} className="starfield" />
      {!isHidden && (
        isAuthenticated ? (
          <div className="user-info">
            <Dropdown 
              menu={{ items: userMenuItems }} 
              placement="bottomRight" 
              arrow 
              overlayClassName="custom-dropdown-menu"
            >
              <div className="user-dropdown-trigger">
                <span className="user-name">{user?.name}</span>
                <DownOutlined className="dropdown-arrow" />
              </div>
            </Dropdown>
          </div>
        ) : (
          <div className="auth-buttons">
            <span 
              className="auth-link register-link"
              onClick={() => setShowRegisterModal(true)}
            >
              注册
            </span>
            <span 
              className="auth-link login-link"
              onClick={() => setShowLoginModal(true)}
            >
              登录
            </span>
          </div>
        )
      )}
      <div className={`content ${isHidden ? 'hidden' : ''}`}>
        <h1 className="title animate-fade-in">
          infinitec
        </h1>
        <div className="subtitle-wrapper animate-fade-in">
          <p className="plain-subtitle">
            <span className="double-click-icon">⚡</span>
            双击开始绘画模式
          </p>
          <div className="divider"></div>
        </div>
        <p className="subtitle animate-fade-in" onClick={handleMultiplayerClick}>
          多人绘画
        </p>
      </div>

      <RegisterModal 
        isOpen={showRegisterModal} 
        onClose={handleCloseRegisterModal}
        onSwitchToLogin={handleSwitchToLogin}
      />
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseLoginModal}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RoomModal
        isOpen={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onUpdate={login}
      />
    </>
  )
}

export default Home