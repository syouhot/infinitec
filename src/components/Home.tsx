import { useEffect, useRef } from 'react'
import '../styles/Home.css'

interface HomeProps {
  onDoubleClick: () => void
  isHidden?: boolean
}

function Home({ onDoubleClick, isHidden = false }: HomeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    if (isHidden) return

    window.addEventListener('dblclick', onDoubleClick)
    
    return () => {
      window.removeEventListener('dblclick', onDoubleClick)
    }
  }, [onDoubleClick, isHidden])

  return (
    <>
      <canvas ref={canvasRef} className="starfield" />
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
    </>
  )
}

export default Home