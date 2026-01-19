import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { CANVAS_CONFIG } from '../config/content'
import { createBoundary, clampOffset, calculateClampedOffset } from '../util/boundary'
import { handleZoom } from '../util/zoom'
import '../styles/CanvasMain.css'

interface CanvasMainProps {
  selectedTool: string
  currentColor: string
  currentLineWidth: number
  eraserSize: number
  onZoomChange?: (scale: number, offset: { x: number; y: number }) => void;
}

const CanvasMain = forwardRef((props: CanvasMainProps, ref: any) => {
  const { selectedTool, currentColor, currentLineWidth, eraserSize, onZoomChange } = props;
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

  // 处理外部缩放请求
  const zoomToScaleHandler = useCallback((scale: number) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 计算新的缩放中心点（屏幕中心）
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    // 获取当前可视区域中心对应的画布坐标
    const currentCenterCanvasX = (windowWidth / 2 - (windowWidth / 2 - canvasSize.width / 2 + canvasOffset.x)) / zoomScale;
    const currentCenterCanvasY = (windowHeight / 2 - (windowHeight / 2 - canvasSize.height / 2 + canvasOffset.y)) / zoomScale;

    // 计算新的偏移量，以确保缩放后中心点不变
    const newOffsetX = centerX - currentCenterCanvasX * scale - (windowWidth / 2 - canvasSize.width / 2);
    const newOffsetY = centerY - currentCenterCanvasY * scale - (windowHeight / 2 - canvasSize.height / 2);

    // 应用边界限制
    const clampedOffset = calculateClampedOffset(
      { x: newOffsetX, y: newOffsetY },
      scale,
      canvasSize.width,
      canvasSize.height,
      windowWidth,
      windowHeight
    );

    setZoomScale(scale);
    setCanvasOffset(clampedOffset);

    // 如果提供了回调，通知偏移量变化
    if (onZoomChange) {
      onZoomChange(scale, clampedOffset);
    }
  }, [zoomScale, canvasOffset, canvasSize, onZoomChange]);

  // 使用 useImperativeHandle 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    zoomToScale: zoomToScaleHandler
  }));

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

  // 以指定点为中心进行缩放的函数
  const zoomToScaleWithPoint = useCallback((newScale: number, centerX: number, centerY: number) => {
    // 计算当前鼠标位置对应的画布坐标
    const currentCanvasX = (centerX - (window.innerWidth / 2 - canvasSize.width / 2 + canvasOffset.x)) / zoomScale;
    const currentCanvasY = (centerY - (window.innerHeight / 2 - canvasSize.height / 2 + canvasOffset.y)) / zoomScale;

    // 计算新的偏移量，以确保缩放后鼠标位置对应的画布坐标不变
    const newOffsetX = centerX - currentCanvasX * newScale - (window.innerWidth / 2 - canvasSize.width / 2);
    const newOffsetY = centerY - currentCanvasY * newScale - (window.innerHeight / 2 - canvasSize.height / 2);

    // 应用边界限制
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const clampedOffset = calculateClampedOffset(
      { x: newOffsetX, y: newOffsetY },
      newScale,
      canvasSize.width,
      canvasSize.height,
      windowWidth,
      windowHeight
    );

    setZoomScale(newScale);
    setCanvasOffset(clampedOffset);

    // 如果提供了回调，通知偏移量变化
    if (props.onZoomChange) {
      props.onZoomChange(newScale, clampedOffset);
    }
  }, [canvasOffset, canvasSize, zoomScale, props.onZoomChange]);

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
)
export default CanvasMain;
