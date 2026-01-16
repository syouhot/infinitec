import { useEffect, useRef, useState } from 'react'
import './App.css'
import Home from './components/Home'
import CanvasIndex from './components/CanvasIndex'
import Toolbar from './components/Toolbar'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [selectedTool, setSelectedTool] = useState('pencil')

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

    // 创建星星
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

    // 动画循环
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 30, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 绘制星星
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

  const handleDoubleClick = () => {
    setIsDrawingMode(true)
  }

  const handleExitDrawingMode = () => {
    setIsDrawingMode(false)
  }

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool)
  }

  return (
    <div className={`app ${isDrawingMode ? 'drawing-mode' : ''}`}>
      <canvas ref={canvasRef} className="starfield" />
      <Home onDoubleClick={handleDoubleClick} isHidden={isDrawingMode} />
      {isDrawingMode && (
        <>
          <CanvasIndex onBack={handleExitDrawingMode} />
          <Toolbar onToolSelect={handleToolSelect} selectedTool={selectedTool} />
        </>
      )}
    </div>
  )
}

export default App
