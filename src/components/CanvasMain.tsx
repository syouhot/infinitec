import { useEffect, useRef, useState } from 'react'
import '../styles/CanvasMain.css'

interface CanvasMainProps {
  selectedTool: string
  currentColor: string
  currentLineWidth: number
}

function CanvasMain({ selectedTool, currentColor, currentLineWidth }: CanvasMainProps) {
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPositionRef = useRef<{ x: number, y: number } | null>(null)

  useEffect(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeDrawingCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeDrawingCanvas()
    window.addEventListener('resize', resizeDrawingCanvas)

    return () => {
      window.removeEventListener('resize', resizeDrawingCanvas)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool !== 'pencil') return
    setIsDrawing(true)
    lastPositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPositionRef.current || selectedTool !== 'pencil') return

    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y)
    ctx.lineTo(e.clientX, e.clientY)
    ctx.strokeStyle = currentColor
    ctx.lineWidth = currentLineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    lastPositionRef.current = null
  }

  const handleMouseLeave = () => {
    setIsDrawing(false)
    lastPositionRef.current = null
  }

  return (
    <canvas 
      ref={drawingCanvasRef} 
      className="drawing-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  )
}

export default CanvasMain
