import { useEffect, useRef, useState } from 'react'
import '../styles/CanvasMain.css'

interface CanvasMainProps {
  selectedTool: string
  currentColor: string
  currentLineWidth: number
  eraserSize: number
}

function CanvasMain({ selectedTool, currentColor, currentLineWidth, eraserSize }: CanvasMainProps) {
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPositionRef = useRef<{ x: number, y: number } | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{ x: number, y: number } | null>(null)

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
    if (selectedTool !== 'pencil' && selectedTool !== 'eraser') return
    setIsDrawing(true)
    lastPositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPositionRef.current) return
    if (selectedTool !== 'pencil' && selectedTool !== 'eraser') return

    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y)
    ctx.lineTo(e.clientX, e.clientY)

    if (selectedTool === 'pencil') {
      ctx.strokeStyle = currentColor
      ctx.lineWidth = currentLineWidth
      ctx.globalCompositeOperation = 'source-over'
    } else if (selectedTool === 'eraser') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)'
      ctx.lineWidth = eraserSize
      ctx.globalCompositeOperation = 'destination-out'
    }

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    lastPositionRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool === 'eraser') {
      setCursorPosition({ x: e.clientX, y: e.clientY })
    } else {
      setCursorPosition(null)
    }
  }

  const handleCanvasMouseLeave = () => {
    setCursorPosition(null)
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
    <>
      <canvas 
        ref={drawingCanvasRef} 
        className={`drawing-canvas ${selectedTool === 'eraser' ? 'eraser-mode' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e)
          handleCanvasMouseMove(e)
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseLeave()
          handleCanvasMouseLeave()
        }}
      />
      {cursorPosition && selectedTool === 'eraser' && (
        <div 
          className="eraser-cursor"
          style={{
            left: `${cursorPosition.x - eraserSize / 2}px`,
            top: `${cursorPosition.y - eraserSize / 2}px`,
            width: `${eraserSize}px`,
            height: `${eraserSize}px`
          }}
        />
      )}
    </>
  )
}

export default CanvasMain
