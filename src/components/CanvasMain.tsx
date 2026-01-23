import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { CANVAS_CONFIG } from '../constants'
import { createBoundary, clampOffset, calculateClampedOffset } from '../util/boundary'
import { websocketService } from '../services/websocketService'
import { useAppStore, useToolStore, useCanvasStore } from '../store/index' // Assuming store exists for userId
import '../styles/CanvasMain.css'

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

interface HistoryAction {
  type: 'draw' | 'erase'
  strokeIds: string[]
}

interface CanvasMainProps {
  selectedTool: string
  currentColor: string
  currentLineWidth: number
  eraserSize: number
  onZoomChange?: (scale: number, offset: { x: number; y: number }) => void;
}

const CanvasMain = forwardRef((props: CanvasMainProps, ref: any) => {
  const { selectedTool, currentColor, currentLineWidth, eraserSize, onZoomChange } = props;
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPositionRef = useRef<{ x: number, y: number } | null>(null)
  const eraserCursorRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const dragStartRef = useRef<{ x: number, y: number } | null>(null)
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [boundary, setBoundary] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
  const [zoomScale, setZoomScale] = useState(CANVAS_CONFIG.DEFAULT_ZOOM_SCALE)

  const strokesRef = useRef<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const historyRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  
  // Multi-canvas architecture state
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set(['local']));
  const layerRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Helper to ensure user ID is tracked
  const ensureUserLayer = useCallback((uid: string) => {
    setActiveUserIds(prev => {
      if (prev.has(uid)) return prev;
      return new Set(prev).add(uid);
    });
  }, []);

  // Helper to draw a single segment (incremental update)
  const drawSegment = useCallback((uid: string, p1: Point, p2: Point, color: string, width: number, tool: string) => {
    const canvas = layerRefs.current.get(uid);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = width;
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.stroke();
  }, []);

  const redrawLayer = useCallback((uid: string) => {
    const canvas = layerRefs.current.get(uid);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear this user's canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Redraw all strokes for this user
    // Note: We need to re-apply the transform for drawing?
    // The canvas has a transform applied via updateSizes (ctx.setTransform).
    // But clearRect needs identity or full clear.
    // After clear, we should restore the transform.
    // The `updateSizes` sets the default transform.
    // But here we might have lost it if we didn't save/restore properly or if we set identity.
    // Actually, `updateSizes` sets the transform on the context state.
    // `ctx.clearRect` clears pixels but doesn't reset transform.
    // However, if we do `ctx.setTransform(1,0,0,1,0,0)` to clear, we lose the padding transform.
    // So we must reset it to padding transform after clearing.
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const paddingX = (canvas.width - windowWidth) / 2;
    const paddingY = (canvas.height - windowHeight) / 2;
    
    ctx.setTransform(1, 0, 0, 1, paddingX, paddingY);

    strokesRef.current.forEach(stroke => {
      if (stroke.userId !== uid) return;
      if (stroke.isErased) return;
      if (stroke.points.length < 1) return;

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, []);

  const redrawAllLayers = useCallback(() => {
    activeUserIds.forEach(uid => redrawLayer(uid));
  }, [activeUserIds, redrawLayer]);

  // renderCanvas is now an alias for redrawAllLayers
  const renderCanvas = useCallback(() => {
    redrawAllLayers();
  }, [redrawAllLayers]);

  const drawStroke = useCallback((stroke: Stroke) => {
    const canvas = layerRefs.current.get(stroke.userId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (stroke.points.length < 1) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = stroke.width;
      ctx.globalCompositeOperation = 'destination-out';
      
      // For eraser, we need to draw segments individually to match local behavior (area-based)
      // instead of a single path which might behave differently with destination-out
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
         ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
         ctx.stroke();
         ctx.beginPath();
         ctx.moveTo(stroke.points[i].x, stroke.points[i].y);
      }
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalCompositeOperation = 'source-over';
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    websocketService.setDrawEventCallback((data: any) => {
      if (data.type === 'stroke') {
        const stroke = data.stroke;
        ensureUserLayer(stroke.userId);
        
        // Check if stroke already exists (unlikely but safe)
        if (!strokesRef.current.find(s => s.id === stroke.id)) {
            strokesRef.current.push(stroke);
            drawStroke(stroke);
        }
      } else if (data.type === 'erase') {
        const stroke = strokesRef.current.find(s => s.id === data.id)
        if (stroke) {
          stroke.isErased = true
          redrawLayer(stroke.userId);
        }
      } else if (data.type === 'restore') {
        const stroke = strokesRef.current.find(s => s.id === data.id)
        if (stroke) {
          stroke.isErased = false
          redrawLayer(stroke.userId);
        }
      }
    })

    return () => {
      websocketService.setDrawEventCallback(() => {});
    }
  }, [ensureUserLayer, drawSegment, redrawLayer])

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

  const undo = useCallback(() => {
    const action = historyRef.current.pop();
    if (!action) return;

    redoStackRef.current.push(action);

    if (action.type === 'draw') {
      action.strokeIds.forEach(id => {
        const stroke = strokesRef.current.find(s => s.id === id);
        if (stroke) {
          stroke.isErased = true;
          redrawLayer(stroke.userId);
          websocketService.sendDrawEvent({ type: 'erase', id: stroke.id });
        }
      });
    } else if (action.type === 'erase') {
      action.strokeIds.forEach(id => {
        const stroke = strokesRef.current.find(s => s.id === id);
        if (stroke) {
          stroke.isErased = false;
          redrawLayer(stroke.userId);
          websocketService.sendDrawEvent({ type: 'restore', id: stroke.id });
        }
      });
    }
  }, [redrawLayer]);

  const redo = useCallback(() => {
    const action = redoStackRef.current.pop();
    if (!action) return;

    historyRef.current.push(action);

    if (action.type === 'draw') {
      action.strokeIds.forEach(id => {
        const stroke = strokesRef.current.find(s => s.id === id);
        if (stroke) {
          stroke.isErased = false;
          redrawLayer(stroke.userId);
          websocketService.sendDrawEvent({ type: 'restore', id: stroke.id });
        }
      });
    } else if (action.type === 'erase') {
      action.strokeIds.forEach(id => {
        const stroke = strokesRef.current.find(s => s.id === id);
        if (stroke) {
          stroke.isErased = true;
          redrawLayer(stroke.userId);
          websocketService.sendDrawEvent({ type: 'erase', id: stroke.id });
        }
      });
    }
  }, [redrawLayer]);

  useEffect(() => {
    // Reset tools when component unmounts
    return () => {
      // We need to import store setters inside the component or use the store hooks
      // Since we are inside the component, we can use the props or access store if needed.
      // But props are read-only. We should use the store actions directly or let the parent handle it.
      // However, the requirement is "exit canvas", which implies unmounting.
      // We can use the store hooks here.
      useToolStore.getState().setSelectedTool('pencil');
      useCanvasStore.getState().setLineWidth(2); // Assuming 2 is default
      useCanvasStore.getState().setColor(0); // Assuming black is default
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 使用 useImperativeHandle 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    zoomToScale: zoomToScaleHandler,
    undo,
    redo
  }));

  useEffect(() => {
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

      // Update all layers
      layerRefs.current.forEach(canvas => {
        canvas.width = newCanvasSize.width
        canvas.height = newCanvasSize.height
        const ctx = canvas.getContext('2d')
        const offsetX = padding / 2
        const offsetY = padding / 2
        ctx?.setTransform(1, 0, 0, 1, offsetX, offsetY)
      })
      
      redrawAllLayers(); // Redraw content after resize

      setBoundary(createBoundary(newCanvasSize.width, newCanvasSize.height, windowWidth, windowHeight))
    }

    updateSizes()
    window.addEventListener('resize', updateSizes)

    return () => {
      window.removeEventListener('resize', updateSizes)
    }
  }, [redrawAllLayers])

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
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

    const startPoint = {
      x: windowWidth / 2 + (e.clientX - screenCenterX) / zoomScale,
      y: windowHeight / 2 + (e.clientY - screenCenterY) / zoomScale
    }
    
    lastPositionRef.current = startPoint
    
    const uid = websocketService.getUserId() || 'local';
    ensureUserLayer(uid);

    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      userId: uid,
      points: [startPoint],
      color: currentColor,
      width: selectedTool === 'eraser' ? eraserSize : currentLineWidth,
      isErased: false,
      tool: selectedTool as 'pencil' | 'eraser'
    }
    
    currentStrokeRef.current = newStroke
    strokesRef.current.push(newStroke)
    
    // Draw initial dot
    drawSegment(uid, startPoint, startPoint, currentColor, selectedTool === 'eraser' ? eraserSize : currentLineWidth, selectedTool);

    // History
    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    /* 
    websocketService.sendDrawEvent({
      type: 'start',
      id: newStroke.id,
      userId: uid,
      point: startPoint,
      color: currentColor,
      width: currentLineWidth,
      tool: selectedTool
    })
    */
  }

  const rafIdRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Persist event synthetic properties if needed, but for rAF we usually need the data immediately.
    // React events are pooled in older versions, but in newer React they are not.
    // However, to be safe and efficient, we extract needed values.
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
        if (isDragging && dragStartRef.current) {
          const deltaX = clientX - dragStartRef.current!.x
          const deltaY = clientY - dragStartRef.current!.y

          const newOffset = calculateClampedOffset(
            { x: canvasOffset.x + deltaX, y: canvasOffset.y + deltaY },
            zoomScale,
            canvasSize.width,
            canvasSize.height,
            window.innerWidth,
            window.innerHeight
          )
          setCanvasOffset(newOffset)

          dragStartRef.current = { x: clientX, y: clientY }
          return
        }

        if (!isDrawing || !lastPositionRef.current || !currentStrokeRef.current) return
        if (selectedTool !== 'pencil' && selectedTool !== 'eraser') return

        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        const screenCenterX = windowWidth / 2 + canvasOffset.x
        const screenCenterY = windowHeight / 2 + canvasOffset.y

        const currentX = windowWidth / 2 + (clientX - screenCenterX) / zoomScale
        const currentY = windowHeight / 2 + (clientY - screenCenterY) / zoomScale
        const currentPoint = { x: currentX, y: currentY }
        
        const uid = websocketService.getUserId() || 'local';

        // Incremental draw
        drawSegment(uid, lastPositionRef.current, currentPoint, currentColor, selectedTool === 'eraser' ? eraserSize : currentLineWidth, selectedTool);

        // Update data
        currentStrokeRef.current.points.push(currentPoint);

        lastPositionRef.current = currentPoint
    });
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Using requestAnimationFrame for cursor movement as well
    // Note: We can merge this with the above rAF if we refactor, but for now separate rAF is fine or we can assume handleMouseMove calls both.
    // Actually, calling rAF twice per mouse move might be redundant.
    // Let's optimize by not using rAF here if we can avoid it, OR use direct transform.
    // Direct transform is very fast. The issue is likely layout thrashing from top/left.
    
    if (selectedTool === 'eraser' && eraserCursorRef.current) {
      const size = eraserSize * zoomScale;
      // Use transform for GPU acceleration
      eraserCursorRef.current.style.display = 'block';
      eraserCursorRef.current.style.transform = `translate3d(${clientX - size / 2}px, ${clientY - size / 2}px, 0)`;
      eraserCursorRef.current.style.width = `${size}px`;
      eraserCursorRef.current.style.height = `${size}px`;
      // Reset top/left to 0 since we use transform
      eraserCursorRef.current.style.top = '0px';
      eraserCursorRef.current.style.left = '0px';
    } else if (eraserCursorRef.current) {
      eraserCursorRef.current.style.display = 'none';
    }
  }

  const handleCanvasMouseLeave = () => {
    if (eraserCursorRef.current) {
      eraserCursorRef.current.style.display = 'none';
    }
  }

  const handleMouseUp = () => {
    if (isDrawing && currentStrokeRef.current) {
        websocketService.sendDrawEvent({
            type: 'stroke',
            stroke: currentStrokeRef.current
        })
    }
    setIsDrawing(false)
    setIsDragging(false)
    lastPositionRef.current = null
    dragStartRef.current = null
    currentStrokeRef.current = null
  }

  const handleMouseLeave = () => {
    if (isDrawing && currentStrokeRef.current) {
        websocketService.sendDrawEvent({
            type: 'stroke',
            stroke: currentStrokeRef.current
        })
    }
    setIsDrawing(false)
    setIsDragging(false)
    lastPositionRef.current = null
    dragStartRef.current = null
    currentStrokeRef.current = null
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault()
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // 阻止默认的滚动行为
    // e.preventDefault(); // React 的合成事件不需要调用这个，因为是在容器上

    // 计算新的缩放比例
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
      
      {/* Render all user layers */}
      {Array.from(activeUserIds).map(uid => (
        <canvas
          key={uid}
          ref={el => {
            if (el) {
              layerRefs.current.set(uid, el);
              if (el.width !== canvasSize.width) {
                 el.width = canvasSize.width;
                 el.height = canvasSize.height;
                 const ctx = el.getContext('2d');
                 const paddingX = (canvasSize.width - window.innerWidth) / 2;
                 const paddingY = (canvasSize.height - window.innerHeight) / 2;
                 ctx?.setTransform(1, 0, 0, 1, paddingX, paddingY);
                 redrawLayer(uid);
              }
            } else {
              layerRefs.current.delete(uid);
            }
          }}
          className={`drawing-canvas ${selectedTool === 'eraser' ? 'eraser-mode' : ''}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${canvasOffset.x}px), calc(-50% + ${canvasOffset.y}px)) scale(${zoomScale})`,
            pointerEvents: 'none',
            zIndex: uid === (websocketService.getUserId() || 'local') ? 10 : 1
          }}
        />
      ))}
      
      {/* Interaction Layer */}
      <div
        className="interaction-layer"
        style={{
           position: 'absolute',
           width: '100%',
           height: '100%',
           zIndex: 100,
           cursor: selectedTool === 'eraser' ? 'none' : 'crosshair'
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

      <div
        ref={eraserCursorRef}
        className="eraser-cursor"
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 101,
          border: '1px solid black',
          borderRadius: '50%',
          display: 'none',
          transform: 'none'
        }}
      />
    </div>
  )
}
)
export default CanvasMain;
