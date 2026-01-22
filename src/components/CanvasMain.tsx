import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { CANVAS_CONFIG } from '../config/content'
import { createBoundary, calculateClampedOffset } from '../util/boundary'
import '../styles/CanvasMain.css'
import { useAppStore } from '../store'
import { websocketService } from '../services/websocketService'

interface Point {
  x: number
  y: number
}

interface Stroke {
  id: string
  userId: string
  points: Point[]
  color: string
  width: number
  isErased: boolean
  tool: 'pencil' | 'eraser'
}

type HistoryAction = 
  | { type: 'draw'; strokeId: string }
  | { type: 'erase'; strokeId: string };

interface CanvasMainProps {
  selectedTool: string
  currentColor: string
  currentLineWidth: number
  eraserSize: number
  onZoomChange?: (scale: number, offset: { x: number; y: number }) => void;
}

const CanvasMain = forwardRef((props: CanvasMainProps, ref: any) => {
  const { selectedTool, currentColor, currentLineWidth, eraserSize } = props;
  const { userId, roomId } = useAppStore()
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

  const strokesRef = useRef<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const historyRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  // const currentErasedStrokeIdsRef = useRef<Set<string>>(new Set());
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    offscreenCanvasRef.current = document.createElement('canvas');
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current
    const ctx = canvas?.getContext('2d')
    const offscreenCanvas = offscreenCanvasRef.current;
    const offCtx = offscreenCanvas?.getContext('2d');
    
    if (!canvas || !ctx || !offscreenCanvas || !offCtx) return

    // 确保离屏画布尺寸与主画布一致
    if (offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
    }

    // 清除主画布
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // 注意：这里不再 restore，因为我们要保持 identity transform 进行最终的 drawImage
    // ctx.restore() 

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // 计算变换参数
    const paddingX = (canvas.width - windowWidth) / 2
    const paddingY = (canvas.height - windowHeight) / 2

    // 按用户分组笔触
    const userStrokes = new Map<string, Stroke[]>();
    strokesRef.current.forEach(stroke => {
      if (stroke.isErased) return;
      if (stroke.points.length < 1) return;
      
      if (!userStrokes.has(stroke.userId)) {
        userStrokes.set(stroke.userId, []);
      }
      userStrokes.get(stroke.userId)!.push(stroke);
    });

    // 获取所有用户ID并排序（保证渲染顺序一致，避免层级跳变）
    // 将当前用户放在最后（最上层），或者使用固定的排序规则
    // 这里使用简单的字符串排序，确保一致性
    const sortedUserIds = Array.from(userStrokes.keys()).sort();

    // 逐个用户渲染图层并合成
    sortedUserIds.forEach(uid => {
      // 1. 清除离屏画布
      offCtx.save();
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      offCtx.restore();

      // 2. 设置离屏画布变换
      offCtx.save();
      offCtx.setTransform(1, 0, 0, 1, paddingX, paddingY);

      // 3. 渲染该用户的笔触
      const strokes = userStrokes.get(uid) || [];
      strokes.forEach(stroke => {
        offCtx.beginPath();
        offCtx.strokeStyle = stroke.color;
        offCtx.lineWidth = stroke.width;
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';

        if (stroke.tool === 'eraser') {
          offCtx.globalCompositeOperation = 'destination-out';
        } else {
          offCtx.globalCompositeOperation = 'source-over';
        }

        offCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          offCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        offCtx.stroke();
      });
      
      offCtx.restore();

      // 4. 将该用户的图层合成到主画布
      // 确保主画布变换为 identity
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(offscreenCanvas, 0, 0);
    });
    
    // 恢复主画布之前的状态（如果需要的话，虽然这里已经是函数末尾）
    ctx.restore();

  }, [])

  useEffect(() => {
    websocketService.setDrawEventCallback((data: any) => {
      if (data.type === 'start') {
        if (!strokesRef.current.find(s => s.id === data.id)) {
          strokesRef.current.push({
            id: data.id,
            userId: data.userId,
            points: [data.point],
            color: data.color,
            width: data.width,
            isErased: false,
            tool: data.tool || 'pencil'
          })
        }
      } else if (data.type === 'move') {
        const stroke = strokesRef.current.find(s => s.id === data.id)
        if (stroke) {
          stroke.points.push(data.point)
          renderCanvas()
        }
      } else if (data.type === 'end') {
        // 可以做一些清理或优化
      } else if (data.type === 'erase') {
        const stroke = strokesRef.current.find(s => s.id === data.id)
        if (stroke) {
          stroke.isErased = true
          renderCanvas()
        }
      } else if (data.type === 'restore') {
        const stroke = strokesRef.current.find(s => s.id === data.id)
        if (stroke) {
          stroke.isErased = false
          renderCanvas()
        }
      }
    })
  }, [renderCanvas])

  const undo = useCallback(() => {
    const lastAction = historyRef.current.pop();
    if (!lastAction) return;

    redoStackRef.current.push(lastAction);

    if (lastAction.type === 'draw' || lastAction.type === 'erase') {
      const stroke = strokesRef.current.find(s => s.id === lastAction.strokeId);
      if (stroke) {
        stroke.isErased = true;
        renderCanvas();
        if (roomId) websocketService.sendDrawEvent({ type: 'erase', id: stroke.id });
      }
    }
  }, [roomId, renderCanvas]);

  const redo = useCallback(() => {
    const nextAction = redoStackRef.current.pop();
    if (!nextAction) return;

    historyRef.current.push(nextAction);

    if (nextAction.type === 'draw' || nextAction.type === 'erase') {
      const stroke = strokesRef.current.find(s => s.id === nextAction.strokeId);
      if (stroke) {
        stroke.isErased = false;
        renderCanvas();
        if (roomId) websocketService.sendDrawEvent({ type: 'restore', id: stroke.id });
      }
    }
  }, [roomId, renderCanvas]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if target is not input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 处理外部缩放请求
  const zoomToScaleHandler = useCallback((scale: number) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 计算新的缩放中心点（屏幕中心）
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    // 获取当前可视区域中心对应的画布坐标
    const currentCenterCanvasX = canvasSize.width / 2 - canvasOffset.x / zoomScale;
    const currentCenterCanvasY = canvasSize.height / 2 - canvasOffset.y / zoomScale;

    // 计算新的偏移量，以确保缩放后中心点不变
    const newOffsetX = -(currentCenterCanvasX - canvasSize.width / 2) * scale;
    const newOffsetY = -(currentCenterCanvasY - canvasSize.height / 2) * scale;

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
  }, [zoomScale, canvasOffset, canvasSize]);

  // 使用 useImperativeHandle 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    zoomToScale: zoomToScaleHandler,
    undo,
    redo
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

      const offscreen = offscreenCanvasRef.current;
      if (offscreen) {
        offscreen.width = newCanvasSize.width;
        offscreen.height = newCanvasSize.height;
      }

      const offsetX = padding / 2
      const offsetY = padding / 2
      ctx.setTransform(1, 0, 0, 1, offsetX, offsetY)

      document.documentElement.style.setProperty('--grid-size', `${CANVAS_CONFIG.GRID_SIZE}px`)

      setBoundary(createBoundary(newCanvasSize.width, newCanvasSize.height, windowWidth, windowHeight))
      
      // Re-render strokes when resized
      renderCanvas();
    }

    updateSizes()
    window.addEventListener('resize', updateSizes)

    return () => {
      window.removeEventListener('resize', updateSizes)
    }
  }, [renderCanvas]) // Added renderCanvas to dependency

  // 以指定点为中心进行缩放的函数
  const zoomToScaleWithPoint = useCallback((newScale: number, centerX: number, centerY: number) => {
    // 计算当前鼠标位置对应的画布坐标
    const screenCenterX = window.innerWidth / 2 + canvasOffset.x;
    const screenCenterY = window.innerHeight / 2 + canvasOffset.y;
    
    const currentCanvasX = canvasSize.width / 2 + (centerX - screenCenterX) / zoomScale;
    const currentCanvasY = canvasSize.height / 2 + (centerY - screenCenterY) / zoomScale;

    // 计算新的偏移量，以确保缩放后鼠标位置对应的画布坐标不变
    const newOffsetX = centerX - window.innerWidth / 2 - (currentCanvasX - canvasSize.width / 2) * newScale;
    const newOffsetY = centerY - window.innerHeight / 2 - (currentCanvasY - canvasSize.height / 2) * newScale;

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
  }, [canvasOffset, canvasSize, zoomScale]);

  const checkEraserCollision = (x: number, y: number) => {
    const eraserRadius = eraserSize / 2 / zoomScale;
    let hasErased = false;
    strokesRef.current.forEach(stroke => {
      if (stroke.isErased) return;
      if (stroke.userId !== (userId || 'local')) return; // Only erase own strokes
      
      for (const p of stroke.points) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < (eraserRadius + stroke.width / 2) ** 2) {
          stroke.isErased = true;
          hasErased = true;
          currentErasedStrokeIdsRef.current.add(stroke.id);
          if (roomId) {
            websocketService.sendDrawEvent({
              type: 'erase',
              id: stroke.id
            });
          }
          break;
        }
      }
    });
    if (hasErased) renderCanvas();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      return
    }
    if (e.button === 2) return
    if (selectedTool !== 'pencil' && selectedTool !== 'eraser') return
    setIsDrawing(true)

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const screenCenterX = windowWidth / 2 + canvasOffset.x
    const screenCenterY = windowHeight / 2 + canvasOffset.y
    const point = {
      x: windowWidth / 2 + (e.clientX - screenCenterX) / zoomScale,
      y: windowHeight / 2 + (e.clientY - screenCenterY) / zoomScale
    }
    lastPositionRef.current = point

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newStroke: Stroke = {
      id,
      userId: userId || 'local',
      points: [point],
      color: selectedTool === 'eraser' ? '#000000' : currentColor, // Eraser color doesn't matter for destination-out
      width: selectedTool === 'eraser' ? eraserSize : currentLineWidth,
      isErased: false,
      tool: selectedTool === 'eraser' ? 'eraser' : 'pencil'
    };
    currentStrokeRef.current = newStroke;
    strokesRef.current.push(newStroke);
    
    if (roomId) {
      websocketService.sendDrawEvent({
        type: 'start',
        id: newStroke.id,
        point: newStroke.points[0],
        color: newStroke.color,
        width: newStroke.width,
        tool: newStroke.tool
      });
    }
    renderCanvas();
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

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const screenCenterX = windowWidth / 2 + canvasOffset.x
    const screenCenterY = windowHeight / 2 + canvasOffset.y
    const currentX = windowWidth / 2 + (e.clientX - screenCenterX) / zoomScale
    const currentY = windowHeight / 2 + (e.clientY - screenCenterY) / zoomScale
    const currentPoint = { x: currentX, y: currentY }

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(currentPoint);
      if (roomId) {
        websocketService.sendDrawEvent({
          type: 'move',
          id: currentStrokeRef.current.id,
          point: currentPoint
        });
      }
      renderCanvas();
    }

    lastPositionRef.current = currentPoint
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
    if (isDrawing) {
      if (currentStrokeRef.current) {
        historyRef.current.push({ type: 'draw', strokeId: currentStrokeRef.current.id });
        redoStackRef.current = []; // Clear redo stack
        if (roomId) {
          websocketService.sendDrawEvent({ type: 'end', id: currentStrokeRef.current.id });
        }
        currentStrokeRef.current = null;
      }
    }
    setIsDrawing(false)
    setIsDragging(false)
    lastPositionRef.current = null
    dragStartRef.current = null
  }

  const handleMouseLeave = () => {
    // Should behave like MouseUp
    if (isDrawing) {
       handleMouseUp();
    }
    setIsDragging(false)
    lastPositionRef.current = null
    dragStartRef.current = null
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      e.preventDefault()
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY > 0 ? -CANVAS_CONFIG.ZOOM_STEP : CANVAS_CONFIG.ZOOM_STEP;
    const newScale = Math.max(
      CANVAS_CONFIG.MIN_ZOOM_SCALE,
      Math.min(CANVAS_CONFIG.MAX_ZOOM_SCALE, zoomScale + delta)
    );
    zoomToScaleWithPoint(newScale, e.clientX, e.clientY);
  };

  return (
    <div 
      className="canvas-container" 
      onWheel={handleWheel}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
    >
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
    </div>
  )
})

export default CanvasMain