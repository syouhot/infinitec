import { useEffect } from 'react'
import '../styles/Home.css'

interface HomeProps {
  onDoubleClick: () => void
  isHidden?: boolean
}

function Home({ onDoubleClick, isHidden = false }: HomeProps) {
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
    if (isHidden) return

    window.addEventListener('dblclick', onDoubleClick)
    
    return () => {
      window.removeEventListener('dblclick', onDoubleClick)
    }
  }, [onDoubleClick, isHidden])

  return (
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
  )
}

export default Home