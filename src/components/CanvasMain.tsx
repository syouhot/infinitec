import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { CANVAS_CONFIG } from '../constants'
import { createBoundary, clampOffset, calculateClampedOffset } from '../util/boundary'
import { websocketService } from '../services/websocketService'
import { useAppStore, useToolStore, useCanvasStore } from '../store/index' // Assuming store exists for userId
import '../styles/CanvasMain.css'

import RectangleEditor from './RectangleEditor'
import CircleEditor from './CircleEditor'
import LineEditor from './LineEditor'
import ArrowEditor from './ArrowEditor'
import type { RectangleEditorRef } from './RectangleEditor'
import type { LineEditorRef } from './LineEditor'
import type { CircleEditorRef } from './CircleEditor'
import type { ArrowEditorRef } from './ArrowEditor'
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
  tool: 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'arrow'
  isFilled?: boolean
  lineDash?: number[]
  arrowType?: 'standard' | 'double' | 'solid' | 'solid-double'
}

interface HistoryAction {
  type: 'draw' | 'erase'
  strokeIds: string[]
}

interface CanvasMainProps {
  selectedTool: string
  currentColor: string
  currentLineWidth: number
  currentLineDash?: number[]
  currentArrowType?: 'standard' | 'double' | 'solid' | 'solid-double'
  eraserSize: number
  onZoomChange?: (scale: number, offset: { x: number; y: number }) => void;
}

const CanvasMain = forwardRef((props: CanvasMainProps, ref: any) => {
  const { selectedTool, currentColor, currentLineWidth, currentLineDash = [], currentArrowType = 'standard', eraserSize, onZoomChange } = props;
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
  
  const [isEditingRectangle, setIsEditingRectangle] = useState(false);
  const [isEditingCircle, setIsEditingCircle] = useState(false);
  const [isEditingLine, setIsEditingLine] = useState(false);
  const [isEditingArrow, setIsEditingArrow] = useState(false);
  const [tempRect, setTempRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [tempLine, setTempLine] = useState<{p1: Point, p2: Point} | null>(null);
  const [tempArrow, setTempArrow] = useState<{p1: Point, p2: Point} | null>(null);
  const [lineStartPoint, setLineStartPoint] = useState<Point | null>(null);
  const [arrowStartPoint, setArrowStartPoint] = useState<Point | null>(null);

  const strokesRef = useRef<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const historyRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  
  const rectangleEditorRef = useRef<RectangleEditorRef>(null);
  const circleEditorRef = useRef<CircleEditorRef>(null);
  const lineEditorRef = useRef<LineEditorRef>(null);
  const arrowEditorRef = useRef<ArrowEditorRef>(null);

  // Auto-confirm when tool changes
  useEffect(() => {
    if (isEditingRectangle && selectedTool !== 'rectangle') {
      rectangleEditorRef.current?.confirm();
    }
    if (isEditingCircle && selectedTool !== 'circle') {
      circleEditorRef.current?.confirm();
    }
    if (isEditingLine && selectedTool !== 'line') {
      lineEditorRef.current?.confirm();
    }
    if (isEditingArrow && selectedTool !== 'arrow') {
      arrowEditorRef.current?.confirm();
    }
  }, [selectedTool, isEditingRectangle, isEditingCircle, isEditingLine, isEditingArrow]);
  
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
        
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.tool === 'rectangle') {
        if (stroke.points.length < 2) return;
        ctx.globalCompositeOperation = 'source-over';
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p1.x - p2.x);
        const h = Math.abs(p1.y - p2.y);
        
        if (stroke.isFilled) {
          ctx.fillStyle = stroke.color;
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.strokeRect(x, y, w, h);
        }
      } else if (stroke.tool === 'circle') {
        if (stroke.points.length < 2) return;
        ctx.globalCompositeOperation = 'source-over';
        const p1 = stroke.points[0];
        const p2 = stroke.points[1];
        
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p1.x - p2.x);
        const h = Math.abs(p1.y - p2.y);
        
        ctx.beginPath();
        // Draw ellipse/circle
        ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, 2 * Math.PI);
        
        if (stroke.isFilled) {
          ctx.fillStyle = stroke.color;
          ctx.fill();
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.stroke();
        }
      } else if (stroke.tool === 'line') {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
        ctx.setLineDash(stroke.lineDash || []);
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
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
    } else if (stroke.tool === 'rectangle') {
      if (stroke.points.length < 2) return;
      const p1 = stroke.points[0];
      const p2 = stroke.points[1];
      
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p1.x - p2.x);
      const h = Math.abs(p1.y - p2.y);
      
      if (stroke.isFilled) {
        ctx.fillStyle = stroke.color;
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.strokeRect(x, y, w, h);
      }
    } else if (stroke.tool === 'circle') {
      if (stroke.points.length < 2) return;
      const p1 = stroke.points[0];
      const p2 = stroke.points[1];
      
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p1.x - p2.x);
      const h = Math.abs(p1.y - p2.y);
      
      ctx.beginPath();
      ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, 2 * Math.PI);
      
      if (stroke.isFilled) {
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.stroke();
      }
    } else if (stroke.tool === 'line') {
      if (stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash(stroke.lineDash || []);
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (stroke.tool === 'arrow') {
      if (stroke.points.length < 2) return;
      const p1 = stroke.points[0];
      const p2 = stroke.points[1];
      const width = stroke.width;
      const color = stroke.color;
      const arrowType = stroke.arrowType || 'standard';

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw Main Line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Draw Arrow Heads
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLen = Math.max(10, width * 3);

      const drawHead = (x: number, y: number, angle: number, isSolid: boolean) => {
           const actualHeadLen = isSolid ? headLen * 1.8 : headLen;
           if (isSolid) {
               const pBack = { x: x - actualHeadLen * Math.cos(angle), y: y - actualHeadLen * Math.sin(angle) };
               const pLeft = { 
                   x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle - Math.PI/2),
                   y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle - Math.PI/2)
               };
               const pRight = { 
                   x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle + Math.PI/2),
                   y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle + Math.PI/2)
               };
               ctx.fillStyle = color;
               ctx.beginPath();
               ctx.moveTo(x, y);
               ctx.lineTo(pLeft.x, pLeft.y);
               ctx.lineTo(pRight.x, pRight.y);
               ctx.closePath();
               ctx.fill();
           } else {
               const xLeft = x - headLen * Math.cos(angle - Math.PI / 6);
               const yLeft = y - headLen * Math.sin(angle - Math.PI / 6);
               const xRight = x - headLen * Math.cos(angle + Math.PI / 6);
               const yRight = y - headLen * Math.sin(angle + Math.PI / 6);
               
               ctx.beginPath();
               ctx.moveTo(xLeft, yLeft);
               ctx.lineTo(x, y);
               ctx.lineTo(xRight, yRight);
               ctx.stroke();
           }
      }

      if (arrowType === 'standard') {
          drawHead(p2.x, p2.y, angle, false);
      } else if (arrowType === 'double') {
          drawHead(p1.x, p1.y, angle + Math.PI, false);
          drawHead(p2.x, p2.y, angle, false);
      } else if (arrowType === 'solid') {
          drawHead(p2.x, p2.y, angle, true);
      } else if (arrowType === 'solid-double') {
          drawHead(p1.x, p1.y, angle + Math.PI, true);
          drawHead(p2.x, p2.y, angle, true);
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

    // Auto-confirm editing shapes when starting a new drawing interaction
    if (isEditingRectangle) {
      rectangleEditorRef.current?.confirm();
    }
    if (isEditingCircle) {
      circleEditorRef.current?.confirm();
    }
    if (isEditingLine) {
      lineEditorRef.current?.confirm();
    }
    if (isEditingArrow) {
      arrowEditorRef.current?.confirm();
    }

    if (selectedTool !== 'pencil' && selectedTool !== 'eraser' && selectedTool !== 'rectangle' && selectedTool !== 'circle' && selectedTool !== 'line' && selectedTool !== 'arrow') return
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
    
    if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      setTempRect({ x: startPoint.x, y: startPoint.y, width: 0, height: 0 });
      return;
    }

    if (selectedTool === 'line') {
      if (lineStartPoint) {
        // Second click - Finish line and enter edit mode
        let p2 = startPoint;
        if (e.ctrlKey) {
             const dx = startPoint.x - lineStartPoint.x;
             const dy = startPoint.y - lineStartPoint.y;
             const angle = Math.atan2(dy, dx);
             const distance = Math.sqrt(dx * dx + dy * dy);
             
             // Snap to 15 degrees (PI/12 radians)
             const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
             
             const snappedX = lineStartPoint.x + distance * Math.cos(snapAngle);
             const snappedY = lineStartPoint.y + distance * Math.sin(snapAngle);
             p2 = { x: snappedX, y: snappedY };
        }
        
        setTempLine({ p1: lineStartPoint, p2: p2 });
        setIsEditingLine(true);
        setLineStartPoint(null);
      } else {
        // First click - Start line
        setLineStartPoint(startPoint);
        setTempLine({ p1: startPoint, p2: startPoint });
        setIsEditingLine(false);
      }
      return;
    }

    if (selectedTool === 'arrow') {
      if (arrowStartPoint) {
        // Second click - Finish arrow and enter edit mode
        let p2 = startPoint;
        if (e.ctrlKey) {
             const dx = startPoint.x - arrowStartPoint.x;
             const dy = startPoint.y - arrowStartPoint.y;
             const angle = Math.atan2(dy, dx);
             const distance = Math.sqrt(dx * dx + dy * dy);
             
             // Snap to 15 degrees (PI/12 radians)
             const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
             
             const snappedX = arrowStartPoint.x + distance * Math.cos(snapAngle);
             const snappedY = arrowStartPoint.y + distance * Math.sin(snapAngle);
             p2 = { x: snappedX, y: snappedY };
        }
        
        setTempArrow({ p1: arrowStartPoint, p2: p2 });
        setIsEditingArrow(true);
        setArrowStartPoint(null);
      } else {
        // First click - Start arrow
        setArrowStartPoint(startPoint);
        setTempArrow({ p1: startPoint, p2: startPoint });
        setIsEditingArrow(false);
      }
      return;
    }
    
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
    const isCtrlPressed = e.ctrlKey;

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

        const windowWidth = window.innerWidth
        const windowHeight = window.innerHeight

        const screenCenterX = windowWidth / 2 + canvasOffset.x
        const screenCenterY = windowHeight / 2 + canvasOffset.y

        const currentX = windowWidth / 2 + (clientX - screenCenterX) / zoomScale
        const currentY = windowHeight / 2 + (clientY - screenCenterY) / zoomScale
        const currentPoint = { x: currentX, y: currentY }

        if (selectedTool === 'line' && lineStartPoint) {
           if (isCtrlPressed) {
             const dx = currentPoint.x - lineStartPoint.x;
             const dy = currentPoint.y - lineStartPoint.y;
             const angle = Math.atan2(dy, dx);
             const distance = Math.sqrt(dx * dx + dy * dy);
             
             // Snap to 15 degrees (PI/12 radians)
             const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
             
             const snappedX = lineStartPoint.x + distance * Math.cos(snapAngle);
             const snappedY = lineStartPoint.y + distance * Math.sin(snapAngle);
             
             setTempLine({ p1: lineStartPoint, p2: { x: snappedX, y: snappedY } });
           } else {
             setTempLine({ p1: lineStartPoint, p2: currentPoint });
           }
           return;
        }

        if (selectedTool === 'arrow' && arrowStartPoint) {
           if (isCtrlPressed) {
             const dx = currentPoint.x - arrowStartPoint.x;
             const dy = currentPoint.y - arrowStartPoint.y;
             const angle = Math.atan2(dy, dx);
             const distance = Math.sqrt(dx * dx + dy * dy);
             
             // Snap to 15 degrees (PI/12 radians)
             const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
             
             const snappedX = arrowStartPoint.x + distance * Math.cos(snapAngle);
             const snappedY = arrowStartPoint.y + distance * Math.sin(snapAngle);
             
             setTempArrow({ p1: arrowStartPoint, p2: { x: snappedX, y: snappedY } });
           } else {
             setTempArrow({ p1: arrowStartPoint, p2: currentPoint });
           }
           return;
        }

        if (!isDrawing || !lastPositionRef.current) return
        
        if (selectedTool !== 'pencil' && selectedTool !== 'eraser' && selectedTool !== 'rectangle' && selectedTool !== 'circle' && selectedTool !== 'line' && selectedTool !== 'arrow') return

        if (selectedTool === 'rectangle' || selectedTool === 'circle') {
          const start = lastPositionRef.current;
          const deltaX = currentPoint.x - start.x;
          const deltaY = currentPoint.y - start.y;

          if (isCtrlPressed) {
            // Center-based drawing
            // Distance from center to current mouse point determines half-width/height
            const halfWidth = Math.abs(deltaX);
            const halfHeight = Math.abs(deltaY);
            
            // Since previous logic for Ctrl was Square, we keep it: Square from Center
            // To make it just "From Center" without Square, we would use halfWidth and halfHeight directly.
            // But usually modifier keys add constraints. 
            // The user asked "When holding Ctrl... draw with center point as center".
            // The previous request was "Ctrl... draw a square".
            // It is safest to assume they want "Square FROM Center".
            // Let's use the max dimension for square.
            const size = Math.max(halfWidth, halfHeight);
            
            setTempRect({
              x: start.x - size,
              y: start.y - size,
              width: size * 2,
              height: size * 2
            });
          } else {
            setTempRect({
              x: Math.min(start.x, currentPoint.x),
              y: Math.min(start.y, currentPoint.y),
              width: Math.abs(deltaX),
              height: Math.abs(deltaY)
            });
          }
          return;
        }

        if (selectedTool === 'line' && lineStartPoint) {
          setTempLine({ p1: lineStartPoint, p2: currentPoint });
          return;
        }

        if (!currentStrokeRef.current) return;
        
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
    if ((selectedTool === 'rectangle' || selectedTool === 'circle') && isDrawing) {
      setIsDrawing(false);
      lastPositionRef.current = null;
      if (tempRect && tempRect.width > 0 && tempRect.height > 0) {
        if (selectedTool === 'rectangle') {
          setIsEditingRectangle(true);
        } else {
          setIsEditingCircle(true);
        }
      } else {
        setTempRect(null);
      }
      return;
    }

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

  const handleConfirmRectangle = useCallback((rect: { x: number, y: number, width: number, height: number }, style: { color: string, width: number, isFilled: boolean }) => {
    const uid = websocketService.getUserId() || 'local';
    ensureUserLayer(uid);

    let p1 = { x: rect.x, y: rect.y };
    let p2 = { x: rect.x + rect.width, y: rect.y + rect.height };

    // Adjust for stroke width to match visual preview (border-box)
    // Canvas draws stroke centered on path, so we move path inwards by width/2
    if (!style.isFilled) {
      const offset = style.width / 2;
      p1 = { x: rect.x + offset, y: rect.y + offset };
      p2 = { x: rect.x + rect.width - offset, y: rect.y + rect.height - offset };
    }

    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      userId: uid,
      points: [p1, p2],
      color: style.color,
      width: style.width,
      isErased: false,
      tool: 'rectangle',
      isFilled: style.isFilled
    }

    strokesRef.current.push(newStroke);
    drawStroke(newStroke);
    
    // History
    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    // Websocket
    websocketService.sendDrawEvent({
      type: 'stroke',
      stroke: newStroke
    });

    setIsEditingRectangle(false);
    setTempRect(null);
  }, [drawStroke, ensureUserLayer]);

  const handleConfirmCircle = useCallback((rect: { x: number, y: number, width: number, height: number }, style: { color: string, width: number, isFilled: boolean }) => {
    const uid = websocketService.getUserId() || 'local';
    ensureUserLayer(uid);

    let p1 = { x: rect.x, y: rect.y };
    let p2 = { x: rect.x + rect.width, y: rect.y + rect.height };

    // Adjust for stroke width to match visual preview (border-box)
    if (!style.isFilled) {
      const offset = style.width / 2;
      p1 = { x: rect.x + offset, y: rect.y + offset };
      p2 = { x: rect.x + rect.width - offset, y: rect.y + rect.height - offset };
    }

    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      userId: uid,
      points: [p1, p2],
      color: style.color,
      width: style.width,
      isErased: false,
      tool: 'circle',
      isFilled: style.isFilled
    }

    strokesRef.current.push(newStroke);
    drawStroke(newStroke);
    
    // History
    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    // Websocket
    websocketService.sendDrawEvent({
      type: 'stroke',
      stroke: newStroke
    });

    setIsEditingCircle(false);
    setTempRect(null);
  }, [drawStroke, ensureUserLayer]);

  const handleCancelRectangle = useCallback(() => {
    setIsEditingRectangle(false);
    setTempRect(null);
  }, []);

  const handleCancelCircle = useCallback(() => {
    setIsEditingCircle(false);
    setTempRect(null);
  }, []);

  const handleConfirmLine = useCallback((p1: Point, p2: Point, style: { color: string, width: number, lineDash?: number[] }) => {
    const uid = websocketService.getUserId() || 'local';
    ensureUserLayer(uid);

    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      userId: uid,
      points: [p1, p2],
      color: style.color,
      width: style.width,
      isErased: false,
      tool: 'line',
      isFilled: false,
      lineDash: style.lineDash || currentLineDash // Use style dash or current prop
    }

    strokesRef.current.push(newStroke);
    drawStroke(newStroke);
    
    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    websocketService.sendDrawEvent({
      type: 'stroke',
      stroke: newStroke
    });

    setIsEditingLine(false);
    setTempLine(null);
  }, [drawStroke, ensureUserLayer]);

  const handleCancelLine = useCallback(() => {
    setIsEditingLine(false);
    setTempLine(null);
  }, []);

  const handleConfirmArrow = useCallback((p1: Point, p2: Point, style: { color: string, width: number, arrowType: 'standard' | 'double' | 'solid' | 'solid-double' }) => {
    const uid = websocketService.getUserId() || 'local';
    ensureUserLayer(uid);

    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      userId: uid,
      points: [p1, p2],
      color: style.color,
      width: style.width,
      isErased: false,
      tool: 'arrow',
      arrowType: style.arrowType
    }

    strokesRef.current.push(newStroke);
    drawStroke(newStroke);
    
    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    websocketService.sendDrawEvent({
      type: 'stroke',
      stroke: newStroke
    });

    setIsEditingArrow(false);
    setTempArrow(null);
  }, [drawStroke, ensureUserLayer]);

  const handleCancelArrow = useCallback(() => {
    setIsEditingArrow(false);
    setTempArrow(null);
  }, []);

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

      {/* Rectangle Editor & Temp Preview Wrapper */}
      <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${canvasOffset.x}px), calc(-50% + ${canvasOffset.y}px)) scale(${zoomScale})`,
          width: canvasSize.width,
          height: canvasSize.height,
          pointerEvents: 'none',
          zIndex: 200
      }}>
         <div style={{
             position: 'absolute',
             left: (canvasSize.width - window.innerWidth) / 2,
             top: (canvasSize.height - window.innerHeight) / 2,
             width: 0,
             height: 0,
             overflow: 'visible'
         }}>
             {isEditingRectangle && tempRect && (
              <RectangleEditor
                ref={rectangleEditorRef}
                initialRect={tempRect}
                initialColor={currentColor}
                initialWidth={currentLineWidth}
                zoomScale={zoomScale}
                onConfirm={handleConfirmRectangle}
                onCancel={handleCancelRectangle}
              />
            )}

            {isEditingCircle && tempRect && (
              <CircleEditor
                ref={circleEditorRef}
                initialRect={tempRect}
                initialColor={currentColor}
                initialWidth={currentLineWidth}
                zoomScale={zoomScale}
                onConfirm={handleConfirmCircle}
                onCancel={handleCancelCircle}
              />
            )}

            {isEditingLine && tempLine && (
              <LineEditor
                ref={lineEditorRef}
                initialP1={tempLine.p1}
                initialP2={tempLine.p2}
                initialColor={currentColor}
                initialWidth={currentLineWidth}
                initialLineDash={currentLineDash}
                zoomScale={zoomScale}
                onConfirm={handleConfirmLine}
                onCancel={handleCancelLine}
              />
            )}

            {isEditingArrow && tempArrow && (
              <ArrowEditor
                ref={arrowEditorRef}
                initialP1={tempArrow.p1}
                initialP2={tempArrow.p2}
                initialColor={currentColor}
                initialWidth={currentLineWidth}
                initialArrowType={currentArrowType}
                zoomScale={zoomScale}
                onConfirm={handleConfirmArrow}
                onCancel={handleCancelArrow}
              />
            )}
            
            {isDrawing && selectedTool === 'rectangle' && tempRect && (
                 <div style={{
                    position: 'absolute',
                    left: tempRect.x,
                    top: tempRect.y,
                    width: tempRect.width,
                    height: tempRect.height,
                    border: `${currentLineWidth}px solid ${currentColor}`,
                    pointerEvents: 'none',
                    boxSizing: 'border-box'
                 }} />
            )}

            {isDrawing && selectedTool === 'circle' && tempRect && (
                 <div style={{
                    position: 'absolute',
                    left: tempRect.x,
                    top: tempRect.y,
                    width: tempRect.width,
                    height: tempRect.height,
                    border: `${currentLineWidth}px solid ${currentColor}`,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    boxSizing: 'border-box'
                 }} />
            )}

            {lineStartPoint && selectedTool === 'line' && tempLine && (
              <svg 
                width={canvasSize.width}
                height={canvasSize.height}
                style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none', left: 0, top: 0 }}
              >
                <line 
                  x1={tempLine.p1.x} 
                  y1={tempLine.p1.y} 
                  x2={tempLine.p2.x} 
                  y2={tempLine.p2.y} 
                  stroke={currentColor} 
                  strokeWidth={currentLineWidth} 
                  strokeLinecap="round"
                  strokeDasharray={currentLineDash ? currentLineDash.join(',') : undefined}
                  opacity={0.5}
                />
              </svg>
            )}

            {arrowStartPoint && selectedTool === 'arrow' && tempArrow && (
              <svg 
                width={canvasSize.width}
                height={canvasSize.height}
                style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none', left: 0, top: 0, opacity: 0.5 }}
              >
                {(() => {
                  const p1 = tempArrow.p1;
                  const p2 = tempArrow.p2;
                  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                  const width = currentLineWidth;
                  const headLen = Math.max(10, width * 3);
                  const color = currentColor;
                  
                  const drawHead = (x: number, y: number, angle: number, isSolid: boolean) => {
                     const actualHeadLen = isSolid ? headLen * 1.8 : headLen;
                     if (isSolid) {
                         const pTip = { x: x, y: y };
                         const pBack = { x: x - actualHeadLen * Math.cos(angle), y: y - actualHeadLen * Math.sin(angle) };
                         const pLeft = { 
                             x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle - Math.PI/2),
                             y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle - Math.PI/2)
                         };
                         const pRight = { 
                             x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle + Math.PI/2),
                             y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle + Math.PI/2)
                         };
                         return <polygon points={`${pTip.x},${pTip.y} ${pLeft.x},${pLeft.y} ${pRight.x},${pRight.y}`} fill={color} />;
                     } else {
                         const xLeft = x - headLen * Math.cos(angle - Math.PI / 6);
                         const yLeft = y - headLen * Math.sin(angle - Math.PI / 6);
                         const xRight = x - headLen * Math.cos(angle + Math.PI / 6);
                         const yRight = y - headLen * Math.sin(angle + Math.PI / 6);
                         return <polyline points={`${xLeft},${yLeft} ${x},${y} ${xRight},${yRight}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />;
                     }
                  };

                  return (
                    <>
                      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
                      {currentArrowType === 'standard' && drawHead(p2.x, p2.y, angle, false)}
                      {currentArrowType === 'double' && (
                        <>
                          {drawHead(p1.x, p1.y, angle + Math.PI, false)}
                          {drawHead(p2.x, p2.y, angle, false)}
                        </>
                      )}
                      {currentArrowType === 'solid' && drawHead(p2.x, p2.y, angle, true)}
                      {currentArrowType === 'solid-double' && (
                        <>
                          {drawHead(p1.x, p1.y, angle + Math.PI, true)}
                          {drawHead(p2.x, p2.y, angle, true)}
                        </>
                      )}
                    </>
                  );
                })()}
              </svg>
            )}
         </div>
      </div>
    </div>
  )
}
)
export default CanvasMain;
