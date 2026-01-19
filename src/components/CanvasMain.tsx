import { useEffect, useRef, useState } from 'react'
import { CANVAS_CONFIG } from '../config/content'
import { createBoundary, clampOffset, calculateClampedOffset } from '../util/boundary'
import { handleZoom } from '../util/zoom'
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
  const [isDragging, setIsDragging] = useState(false)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef<{ x: number, y: number } | null>(null)
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [boundary, setBoundary] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
  const [zoomScale, setZoomScale] = useState(1)

  useEffect(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateSizes = () => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const padding = Math.max(windowWidth, windowHeight) * CANVAS_CONFIG.CANVAS_SCALE_MULTIPLIER
      
      const newCanvasSize = {
        width: windowWidth + padding,
        height: windowHeight + padding
      }
      
      setCanvasSize(newCanvasSize)
      setGridSize(newCanvasSize)
      
      canvas.width = newCanvasSize.width
      canvas.height = newCanvasSize.height
      
      const offsetX = padding / 2
      const offsetY = padding / 2
      ctx.setTransform(1, 0, 0, 1, offsetX, offsetY)
      
      document.documentElement.style.setProperty('--grid-size', `${CANVAS_CONFIG.GRID_SIZE}px`)
      
      setBoundary(createBoundary(newCanvasSize.width, newCanvasSize.height, windowWidth, windowHeight))
    }

    updateSizes()
    window.addEventListener('resize', updateSizes)

    return () => {
      window.removeEventListener('resize', updateSizes)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      return
    }
    if (e.button === 2) {
      return
    }
    if (selectedTool !== 'pencil' && selectedTool !== 'eraser') return
    setIsDrawing(true)
    
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const padding = Math.max(windowWidth, windowHeight) * CANVAS_CONFIG.CANVAS_SCALE_MULTIPLIER
    const offsetX = padding / 2
    const offsetY = padding / 2
    
    const canvasLeft = windowWidth / 2 - canvasSize.width / 2 + canvasOffset.x
    const canvasTop = windowHeight / 2 - canvasSize.height / 2 + canvasOffset.y
    
    lastPositionRef.current = { 
      x: (e.clientX - canvasLeft) / zoomScale - offsetX, 
      y: (e.clientY - canvasTop) / zoomScale - offsetY 
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      
      const newOffset = calculateClampedOffset(
        { x: canvasOffset.x + deltaX, y: canvasOffset.y + deltaY },
        zoomScale,
        canvasSize.width,
        canvasSize.height,
        window.innerWidth,
        window.innerHeight
      )
      setCanvasOffset(newOffset)
      
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    if (!isDrawing || !lastPositionRef.current) return
    if (selectedTool !== 'pencil' && selectedTool !== 'eraser') return

    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const padding = Math.max(windowWidth, windowHeight) * CANVAS_CONFIG.CANVAS_SCALE_MULTIPLIER
    const offsetX = padding / 2
    const offsetY = padding / 2

    const canvasLeft = windowWidth / 2 - canvasSize.width / 2 + canvasOffset.x
    const canvasTop = windowHeight / 2 - canvasSize.height / 2 + canvasOffset.y

    const currentX = (e.clientX - canvasLeft) / zoomScale - offsetX
    const currentY = (e.clientY - canvasTop) / zoomScale - offsetY

    ctx.beginPath()
    ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y)
    ctx.lineTo(currentX, currentY)

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

    lastPositionRef.current = { x: currentX, y: currentY }
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
    setIsDragging(false)
    lastPositionRef.current = null
    dragStartRef.current = null
  }

  const handleMouseLeave = () => {
    setIsDrawing(false)
    setIsDragging(false)
    lastPositionRef.current = null
    dragStartRef.current = null
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      e.preventDefault()
    }
  }



  return (
    <>
      <div 
        className="grid-background"
        style={{
          width: `${gridSize.width}px`,
          height: `${gridSize.height}px`,
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${canvasOffset.x}px), calc(-50% + ${canvasOffset.y}px)) scale(${zoomScale})`
        }}
      />
      <canvas 
        ref={drawingCanvasRef} 
        className={`drawing-canvas ${selectedTool === 'eraser' ? 'eraser-mode' : ''}`}
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${canvasOffset.x}px), calc(-50% + ${canvasOffset.y}px)) scale(${zoomScale})`
        }}
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
        onContextMenu={handleContextMenu}
      />
      {cursorPosition && selectedTool === 'eraser' && (
        <div 
          className="eraser-cursor"
          style={{
            left: `${cursorPosition.x - (eraserSize * zoomScale) / 2}px`,
            top: `${cursorPosition.y - (eraserSize * zoomScale) / 2}px`,
            width: `${eraserSize * zoomScale}px`,
            height: `${eraserSize * zoomScale}px`
          }}
        />
      )}
    </>
  )
}

export default CanvasMain
