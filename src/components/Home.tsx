import { useEffect, useRef, useState } from 'react'
import '../styles/Home.css'
import RegisterModal from './RegisterModal'
import LoginModal from './LoginModal'
import { useAuth } from '../contexts/AuthContext'

interface HomeProps {
  onDoubleClick: () => void
  isHidden?: boolean
}

function Home({ onDoubleClick, isHidden = false }: HomeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

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
            <span className="user-name">{user?.name}</span>
            <button className="logout-button" onClick={logout}>
              退出
            </button>
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
        <p className="subtitle animate-fade-in" onDoubleClick={onDoubleClick}>
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
    </>
  )
}

export default Home