import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { CANVAS_CONFIG, AUTO_SAVE_INTERVAL_MINUTES } from '../constants'
import { createBoundary, clampOffset, calculateClampedOffset } from '../util/boundary'
import { websocketService } from '../services/websocketService'
import { useAuth } from '../contexts/AuthContext'
import { useAppStore, useToolStore, useCanvasStore } from '../store/index' // 假设 store 存在用于 userId
import '../styles/CanvasMain.css'

import RectangleEditor from './RectangleEditor'
import CircleEditor from './CircleEditor'
import LineEditor from './LineEditor'
import ArrowEditor from './ArrowEditor'
import PolygonEditor from './PolygonEditor'
import TextEditor from './TextEditor'
import ImageEditor from './ImageEditor'
import LocationNotification from './LocationNotification'
import type { RectangleEditorRef } from './RectangleEditor'
import type { LineEditorRef } from './LineEditor'
import type { CircleEditorRef } from './CircleEditor'
import type { ArrowEditorRef } from './ArrowEditor'
import type { PolygonEditorRef } from './PolygonEditor'
import type { TextEditorRef, TextStyle } from './TextEditor'
import type { ImageEditorRef } from './ImageEditor'
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
  tool: 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'polygon' | 'text' | 'image'
  isFilled?: boolean
  lineDash?: number[]
  arrowType?: 'standard' | 'double' | 'solid' | 'solid-double'
  // Text Properties
  text?: string
  fontSize?: number
  fontFamily?: string
  isBold?: boolean
  isItalic?: boolean
  isUnderline?: boolean
  isStrikethrough?: boolean
  textAlign?: 'left' | 'center' | 'right'
  backgroundColor?: string
  textWidth?: number
  textHeight?: number
  // Image Properties
  imageSrc?: string
  imageWidth?: number
  imageHeight?: number
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
  const currentFontSize = useCanvasStore((state) => state.currentFontSize)
  const currentImage = useCanvasStore((state) => state.currentImage)
  const setCurrentImage = useCanvasStore((state) => state.setCurrentImage)
  const broadcastLocationTrigger = useCanvasStore((state) => state.broadcastLocationTrigger)
  const { user } = useAuth()
  const [locationNotification, setLocationNotification] = useState<{ senderName: string, x: number, y: number } | null>(null)
  
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
  const [isEditingPolygon, setIsEditingPolygon] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [tempRect, setTempRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [tempImageRect, setTempImageRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [editingImageElement, setEditingImageElement] = useState<HTMLImageElement | null>(null);
  const [tempLine, setTempLine] = useState<{ p1: Point, p2: Point } | null>(null);
  const [tempArrow, setTempArrow] = useState<{ p1: Point, p2: Point } | null>(null);
  const [tempPolygonPoints, setTempPolygonPoints] = useState<Point[] | null>(null);
  const [lineStartPoint, setLineStartPoint] = useState<Point | null>(null);
  const [arrowStartPoint, setArrowStartPoint] = useState<Point | null>(null);
  const [tempTextPosition, setTempTextPosition] = useState<Point | null>(null);

  // Refs for stable access in effects
  const canvasOffsetRef = useRef(canvasOffset)
  const zoomScaleRef = useRef(zoomScale)

  useEffect(() => {
    canvasOffsetRef.current = canvasOffset
  }, [canvasOffset])

  useEffect(() => {
    zoomScaleRef.current = zoomScale
  }, [zoomScale])

  // Broadcast Location Effect
  useEffect(() => {
    if (broadcastLocationTrigger > 0 && user) {
      const centerX = (window.innerWidth / 2 - canvasOffsetRef.current.x) / zoomScaleRef.current
      const centerY = (window.innerHeight / 2 - canvasOffsetRef.current.y) / zoomScaleRef.current
      websocketService.sendLocation(user.name, centerX, centerY)
    }
  }, [broadcastLocationTrigger, user])

  // Receive Location Effect
  useEffect(() => {
    websocketService.setLocationCallback((data) => {
      if (data.userId !== user?.id) {
        setLocationNotification({ senderName: data.userName, x: data.x, y: data.y })
      }
    })
  }, [user?.id])

  // Polygon Drawing State
  const [drawingPolygonPoints, setDrawingPolygonPoints] = useState<Point[]>([]);
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null);
  const [isSnappedToStart, setIsSnappedToStart] = useState(false);

  const strokesRef = useRef<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const historyRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);

  const rectangleEditorRef = useRef<RectangleEditorRef>(null);
  const circleEditorRef = useRef<CircleEditorRef>(null);
  const lineEditorRef = useRef<LineEditorRef>(null);
  const arrowEditorRef = useRef<ArrowEditorRef>(null);
  const polygonEditorRef = useRef<PolygonEditorRef>(null);
  const textEditorRef = useRef<TextEditorRef>(null);
  const imageEditorRef = useRef<ImageEditorRef>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Image Tool Initialization
  useEffect(() => {
    if (selectedTool === 'image' && currentImage) {
      // Initialize image editing
      const imageWidth = currentImage.width;
      const imageHeight = currentImage.height;
      
      // Default to a reasonable size if too large, maintaining aspect ratio
      // Or just center it on screen
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Initial scale calculation to fit in screen if needed
      let displayWidth = imageWidth;
      let displayHeight = imageHeight;
      const maxDimension = Math.min(windowWidth, windowHeight) * 0.5; // 50% of screen
      
      if (displayWidth > maxDimension || displayHeight > maxDimension) {
        const scale = Math.min(maxDimension / displayWidth, maxDimension / displayHeight);
        displayWidth *= scale;
        displayHeight *= scale;
      }

      // Ensure canvas size is initialized
      if (canvasSize.width === 0 || canvasSize.height === 0) return;

      // Calculate viewport center in canvas coordinates
      // Screen Center corresponds to: WindowCenter - (CanvasOffset / ZoomScale)
      // Note: We use window dimensions because the editor container has an inner offset 
      // that compensates for the canvas padding.
      const viewportCenterX = window.innerWidth / 2 - canvasOffset.x / zoomScale;
      const viewportCenterY = window.innerHeight / 2 - canvasOffset.y / zoomScale;
      
      const x = viewportCenterX - displayWidth / 2;
      const y = viewportCenterY - displayHeight / 2;
      
      setTempImageRect({
        x,
        y,
        width: displayWidth,
        height: displayHeight
      });
      setEditingImageElement(currentImage);
      setIsEditingImage(true);
      
      // Clear current image from store so we don't re-trigger
      // setCurrentImage(null); // Actually better to keep it until confirmed or cancelled?
      // If we clear it, we might lose it if component re-renders.
      // But we set local state `editingImageElement`.
      setCurrentImage(null);
    }
  }, [selectedTool, currentImage, canvasOffset, zoomScale, canvasSize, setCurrentImage]);

  // 工具更改时自动确认
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
    if (isEditingPolygon && selectedTool !== 'polygon') {
      polygonEditorRef.current?.confirm();
    }
    if (isEditingText && selectedTool !== 'text') {
      textEditorRef.current?.confirm();
    }
    if (isEditingImage && selectedTool !== 'image') {
      imageEditorRef.current?.confirm();
    }
  }, [selectedTool, isEditingRectangle, isEditingCircle, isEditingLine, isEditingArrow, isEditingPolygon, isEditingText, isEditingImage]);

  // 多画布架构状态
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set(['local']));
  const [snapshotLoaded, setSnapshotLoaded] = useState(0);
  const isRoomOwner = useAppStore(state => state.isRoomOwner);

  // Auto-save Logic
  useEffect(() => {
    if (!isRoomOwner) return

    const interval = setInterval(() => {
      const data = JSON.stringify(strokesRef.current)
      websocketService.sendSnapshot(data)
    }, AUTO_SAVE_INTERVAL_MINUTES * 10 * 1000)

    return () => clearInterval(interval)
  }, [isRoomOwner])

  // Snapshot Load Logic
  useEffect(() => {
    websocketService.setSnapshotCallback((data) => {
      try {
         const strokes = JSON.parse(data)
         strokesRef.current = strokes
         
         const uids = new Set(strokes.map((s: any) => s.userId))
         uids.add('local')
         
         setActiveUserIds(prev => {
            const next = new Set(prev)
            uids.forEach((id: string) => next.add(id))
            return next
         })
         
         setSnapshotLoaded(Date.now())
      } catch (e) {
         console.error("Failed to load snapshot", e)
      }
    })
  }, [])

  const layerRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // 辅助函数确保跟踪用户ID
  const ensureUserLayer = useCallback((uid: string) => {
    setActiveUserIds(prev => {
      if (prev.has(uid)) return prev;
      return new Set(prev).add(uid);
    });
  }, []);

  // 辅助函数绘制单个线段（增量更新）
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
    const dpr = window.devicePixelRatio || 1;

    // 清除此用户的画布
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 为此用户重绘所有笔画
    // 注意：我们需要重新应用变换进行绘制吗？
    // 画布通过 updateSizes (ctx.setTransform) 应用了变换。
    // 但 clearRect 需要单位矩阵或完全清除。
    // 清除后，我们应该恢复变换。
    // `updateSizes` 设置默认变换。
    // 但在这里，如果我们没有正确保存/恢复或设置了单位矩阵，可能会丢失它。
    // 实际上，`updateSizes` 在上下文状态上设置变换。
    // `ctx.clearRect` 清除像素但不重置变换。
    // 然而，如果我们执行 `ctx.setTransform(1,0,0,1,0,0)` 来清除，我们会丢失填充变换。
    // 所以我们必须在清除后将其重置为填充变换。

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const paddingX = (canvas.width / dpr - windowWidth) / 2;
    const paddingY = (canvas.height / dpr - windowHeight) / 2;

    ctx.setTransform(dpr, 0, 0, dpr, paddingX * dpr, paddingY * dpr);

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
        // 绘制椭圆/圆形
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);

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
      } else if (stroke.tool === 'polygon') {
        if (stroke.points.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.closePath();

        if (stroke.isFilled) {
          ctx.fillStyle = stroke.color;
          ctx.fill();
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.globalCompositeOperation = 'source-over';
          ctx.stroke();
        }
      } else if (stroke.tool === 'text') {
        if (!stroke.text || !stroke.points[0]) return;

        const containerX = stroke.points[0].x;
        const containerY = stroke.points[0].y;
        const containerWidth = stroke.textWidth || 0;
        const containerHeight = stroke.textHeight || 0;
        const fontSize = stroke.fontSize || 20;

        // Background
        if (stroke.backgroundColor && stroke.backgroundColor !== 'transparent') {
          ctx.fillStyle = stroke.backgroundColor;
          ctx.fillRect(containerX, containerY, containerWidth, containerHeight);
        }

        // Calculate offsets to match TextEditor visual appearance
        // TextEditor has 1px border and 1.2 lineHeight
        const borderOffset = 1;
        const lineHeight = fontSize * 1.2;
        
        // Revert to 'top' baseline but adjust vertical offset carefully
        // Canvas 'top' baseline aligns to the em-square top
        // We add a small adjustment factor to match DOM rendering better
        const verticalAdjustment = fontSize * 0.1; // Empirical adjustment
        const verticalOffset = (lineHeight - fontSize) / 2 + verticalAdjustment;

        const x = containerX + borderOffset;
        const y = containerY + borderOffset + verticalOffset;
        
        // Use container width for text wrapping, minus border padding
        const width = containerWidth - (borderOffset * 2);

        ctx.fillStyle = stroke.color;
        // Use standard CSS font syntax: font-style font-weight font-size font-family
        // Example: "italic bold 20px Arial"
        const fontStyle = stroke.isItalic ? 'italic' : 'normal';
        const fontWeight = stroke.isBold ? 'bold' : 'normal';
        // Quote the font family to handle names with spaces safely
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${stroke.fontFamily}"`;
        ctx.textBaseline = 'top';

        const wrappedLines: string[] = [];

        // Auto-wrap text based on width
        stroke.text.split('\n').forEach(paragraph => {
          let currentLine = '';
          for (let i = 0; i < paragraph.length; i++) {
            const char = paragraph[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > width && i > 0) {
              wrappedLines.push(currentLine);
              currentLine = char;
            } else {
              currentLine = testLine;
            }
          }
          wrappedLines.push(currentLine);
        });

        wrappedLines.forEach((line, index) => {
          drawTextLine(
            ctx,
            line,
            x,
            y + index * lineHeight,
            width,
            stroke.textAlign,
            stroke.isUnderline,
            stroke.isStrikethrough,
            fontSize
          );
        });
      } else if (stroke.tool === 'image') {
        if (!stroke.imageSrc || stroke.points.length < 1) return;

        let img = imageCacheRef.current.get(stroke.imageSrc);
        if (!img) {
          img = new Image();
          img.src = stroke.imageSrc;
          img.onload = () => {
            redrawLayer(stroke.userId);
          };
          imageCacheRef.current.set(stroke.imageSrc, img);
        }

        if (img.complete) {
          const p1 = stroke.points[0];
          const w = stroke.imageWidth || 0;
          const h = stroke.imageHeight || 0;
          if (w > 0 && h > 0) {
            ctx.drawImage(img, p1.x, p1.y, w, h);
          }
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
    });
  }, []);
  const redrawAllLayers = useCallback(() => {
    activeUserIds.forEach(uid => redrawLayer(uid));
  }, [activeUserIds, redrawLayer]);
  // renderCanvas is now an alias for redrawAllLayers
  const renderCanvas = useCallback(() => {
    redrawAllLayers();
  }, [redrawAllLayers]);

  // Trigger redraw after snapshot load
  useEffect(() => {
    if (snapshotLoaded > 0) {
      renderCanvas()
    }
  }, [snapshotLoaded, renderCanvas])

  const handleConfirmPolygon = useCallback((points: Point[], style: { color: string; width: number; isFilled: boolean }) => {
    if (points.length < 3) {
      setIsEditingPolygon(false);
      setTempPolygonPoints(null);
      setDrawingPolygonPoints([]);
      return;
    }

    const newStroke: Stroke = {
      id: Date.now().toString(),
      userId: 'local',
      points: points,
      color: style.color,
      width: style.width,
      isErased: false,
      tool: 'polygon',
      isFilled: style.isFilled,
    }

    strokesRef.current.push(newStroke)
    historyRef.current.push({
      type: 'draw',
      strokeIds: [newStroke.id]
    })

    setIsEditingPolygon(false);
    setTempPolygonPoints(null);
    setDrawingPolygonPoints([]);

    websocketService.sendDrawEvent(newStroke)
    renderCanvas()
  }, [renderCanvas])

  const handleCancelPolygon = useCallback(() => {
    setIsEditingPolygon(false);
    setTempPolygonPoints(null);
    setDrawingPolygonPoints([]);
    renderCanvas();
  }, [renderCanvas]);

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

      // 对于橡皮擦，我们需要单独绘制线段以匹配本地行为（基于区域）
      // 而不是单个路径，这可能与 destination-out 表现不同
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
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);

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

      // 绘制主线
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // 绘制箭头
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLen = Math.max(10, width * 3);

      const drawHead = (x: number, y: number, angle: number, isSolid: boolean) => {
        const actualHeadLen = isSolid ? headLen * 1.8 : headLen;
        if (isSolid) {
          const pBack = { x: x - actualHeadLen * Math.cos(angle), y: y - actualHeadLen * Math.sin(angle) };
          const pLeft = {
            x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle - Math.PI / 2),
            y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle - Math.PI / 2)
          };
          const pRight = {
            x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle + Math.PI / 2),
            y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle + Math.PI / 2)
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
    } else if (stroke.tool === 'polygon') {
      if (stroke.points.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.closePath();

      if (stroke.isFilled) {
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalCompositeOperation = 'source-over';
        ctx.stroke();
      }
    } else if (stroke.tool === 'text') {
      if (!stroke.text || !stroke.points[0]) return;

      const containerX = stroke.points[0].x;
      const containerY = stroke.points[0].y;
      const containerWidth = stroke.textWidth || 0;
      const containerHeight = stroke.textHeight || 0;
      const fontSize = stroke.fontSize || 20;

      // Background
      if (stroke.backgroundColor && stroke.backgroundColor !== 'transparent') {
        ctx.fillStyle = stroke.backgroundColor;
        ctx.fillRect(containerX, containerY, containerWidth, containerHeight);
      }

      // Calculate offsets to match TextEditor visual appearance
      const borderOffset = 1;
      const lineHeight = fontSize * 1.2;
      // Adjust vertical offset to match DOM rendering
      // CSS line-height centers text, while Canvas 'top' baseline aligns to em-square top
      // Adding a small manual adjustment (3px) to align perfectly
      const verticalOffset = (lineHeight - fontSize) / 2 + 3;

      const x = containerX + borderOffset;
      const y = containerY + borderOffset + verticalOffset;
      // Use container width for text wrapping, minus border padding
      const width = containerWidth - (borderOffset * 2);

      ctx.fillStyle = stroke.color;
      // Use standard CSS font syntax: font-style font-weight font-size font-family
      // Example: "italic bold 20px Arial"
      const fontStyle = stroke.isItalic ? 'italic' : 'normal';
      const fontWeight = stroke.isBold ? 'bold' : 'normal';
      // Quote the font family to handle names with spaces safely
      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${stroke.fontFamily}"`;
      ctx.textBaseline = 'top';

      const wrappedLines: string[] = [];

      // Auto-wrap text based on width
      stroke.text.split('\n').forEach(paragraph => {
        let currentLine = '';
        for (let i = 0; i < paragraph.length; i++) {
          const char = paragraph[i];
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > width && i > 0) {
            wrappedLines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        wrappedLines.push(currentLine);
      });

      wrappedLines.forEach((line, index) => {
        drawTextLine(
          ctx,
          line,
          x,
          y + index * lineHeight,
          width,
          stroke.textAlign,
          stroke.isUnderline,
          stroke.isStrikethrough,
          fontSize
        );
      });
    } else if (stroke.tool === 'image') {
      if (!stroke.imageSrc || stroke.points.length < 1) return;

      let img = imageCacheRef.current.get(stroke.imageSrc);
      if (!img) {
        img = new Image();
        img.src = stroke.imageSrc;
        img.onload = () => {
          redrawLayer(stroke.userId);
        };
        imageCacheRef.current.set(stroke.imageSrc, img);
      }

      if (img.complete) {
        const p1 = stroke.points[0];
        const w = stroke.imageWidth || 0;
        const h = stroke.imageHeight || 0;
        if (w > 0 && h > 0) {
          ctx.drawImage(img, p1.x, p1.y, w, h);
        }
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
  }, [redrawLayer]);
  const handleConfirmText = useCallback((rect: { x: number, y: number, width: number, height: number }, text: string, style: TextStyle) => {
    const uid = websocketService.getUserId() || 'local';
    ensureUserLayer(uid);

    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      userId: uid,
      points: [{ x: rect.x, y: rect.y }],
      color: style.color,
      width: 1, // Not used for text stroke
      isErased: false,
      tool: 'text',
      text: text,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      isBold: style.isBold,
      isItalic: style.isItalic,
      isUnderline: style.isUnderline,
      isStrikethrough: style.isStrikethrough,
      textAlign: style.textAlign,
      backgroundColor: style.backgroundColor,
      textWidth: rect.width,
      textHeight: rect.height
    }

    strokesRef.current.push(newStroke);
    drawStroke(newStroke);

    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    websocketService.sendDrawEvent({
      type: 'stroke',
      stroke: newStroke
    });

    setIsEditingText(false);
    setTempTextPosition(null);
  }, [drawStroke, ensureUserLayer]);

  const handleCancelText = useCallback(() => {
    setIsEditingText(false);
    setTempTextPosition(null);
  }, []);

  const handleConfirmImage = useCallback((rect: { x: number, y: number, width: number, height: number }) => {
    if (!editingImageElement) return;

    const uid = websocketService.getUserId() || 'local';
    ensureUserLayer(uid);

    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      userId: uid,
      points: [{ x: rect.x, y: rect.y }],
      color: '#000000', // Not used
      width: 0, // Not used
      isErased: false,
      tool: 'image',
      imageSrc: editingImageElement.src,
      imageWidth: rect.width,
      imageHeight: rect.height
    };

    strokesRef.current.push(newStroke);
    drawStroke(newStroke);

    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    websocketService.sendDrawEvent({
      type: 'stroke',
      stroke: newStroke
    });

    setIsEditingImage(false);
    setTempImageRect(null);
    setEditingImageElement(null);
    useToolStore.getState().setSelectedTool('pencil');
  }, [drawStroke, ensureUserLayer, editingImageElement]);

  const handleCancelImage = useCallback(() => {
    setIsEditingImage(false);
    setTempImageRect(null);
    setEditingImageElement(null);
    useToolStore.getState().setSelectedTool('pencil');
  }, []);







  useEffect(() => {
    websocketService.setDrawEventCallback((data: any) => {
      if (data.type === 'stroke') {
        const stroke = data.stroke;
        ensureUserLayer(stroke.userId);

        // 检查笔画是否已存在（不太可能但安全）
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
      websocketService.setDrawEventCallback(() => { });
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
    // 组件卸载时重置工具
    return () => {
      // 我们需要在组件内导入 store 设置器或使用 store hooks
      // 由于我们在组件内，可以使用 props 或访问 store（如果需要）。
      // 但 props 是只读的。我们应该直接使用 store actions 或让父组件处理。
      // 然而，需求是"退出画布"，这意味着卸载。
      // 我们可以在这里使用 store hooks。
      useToolStore.getState().setSelectedTool('pencil');
      useCanvasStore.getState().setLineWidth(2); // 假设 2 是默认值
      useCanvasStore.getState().setColor(0); // 假设黑色是默认值
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
      const dpr = window.devicePixelRatio || 1;
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const padding = Math.max(windowWidth, windowHeight) * CANVAS_CONFIG.CANVAS_SCALE_MULTIPLIER

      const newCanvasSize = {
        width: windowWidth + padding,
        height: windowHeight + padding
      }

      setCanvasSize(newCanvasSize)
      setGridSize(newCanvasSize)

      // 更新所有图层
      layerRefs.current.forEach(canvas => {
        canvas.width = newCanvasSize.width * dpr
        canvas.height = newCanvasSize.height * dpr
        canvas.style.width = `${newCanvasSize.width}px`
        canvas.style.height = `${newCanvasSize.height}px`
        const ctx = canvas.getContext('2d')
        const offsetX = padding / 2
        const offsetY = padding / 2
        ctx?.setTransform(dpr, 0, 0, dpr, offsetX * dpr, offsetY * dpr)
      })

      redrawAllLayers(); // 调整大小后重绘内容

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
    if (e.button === 2) {
      if (selectedTool === 'polygon') {
        setDrawingPolygonPoints([]);
        setCurrentMousePos(null);
        setIsDrawing(false);
      }
      return
    }

    // 开始新的绘制交互时自动确认编辑形状
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
    if (isEditingPolygon) {
      polygonEditorRef.current?.confirm();
    }
    // Text editor requires explicit confirmation
    if (isEditingText) {
      return;
    }

    if (selectedTool !== 'pencil' && selectedTool !== 'eraser' && selectedTool !== 'rectangle' && selectedTool !== 'circle' && selectedTool !== 'line' && selectedTool !== 'arrow' && selectedTool !== 'polygon' && selectedTool !== 'text') return
    setIsDrawing(true)

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    const screenCenterX = windowWidth / 2 + canvasOffset.x
    const screenCenterY = windowHeight / 2 + canvasOffset.y

    const startPoint = {
      x: windowWidth / 2 + (e.clientX - screenCenterX) / zoomScale,
      y: windowHeight / 2 + (e.clientY - screenCenterY) / zoomScale
    }

    if (selectedTool === 'text') {
      if (!isEditingText) {
        setTempTextPosition(startPoint);
        setIsEditingText(true);
      }
      return;
    }

    if (selectedTool === 'polygon') {
      if (isSnappedToStart && drawingPolygonPoints.length >= 2) {
        setTempPolygonPoints([...drawingPolygonPoints]);
        setIsEditingPolygon(true);
        setDrawingPolygonPoints([]);
        setCurrentMousePos(null);
        setIsSnappedToStart(false);
        setIsDrawing(false);
      } else {
        setDrawingPolygonPoints([...drawingPolygonPoints, startPoint]);
      }
      return;
    }

    lastPositionRef.current = startPoint

    if (selectedTool === 'rectangle' || selectedTool === 'circle') {
      setTempRect({ x: startPoint.x, y: startPoint.y, width: 0, height: 0 });
      return;
    }

    if (selectedTool === 'line') {
      if (lineStartPoint) {
        // 第二次点击 - 完成线条并进入编辑模式
        let p2 = startPoint;
        if (e.ctrlKey) {
          const dx = startPoint.x - lineStartPoint.x;
          const dy = startPoint.y - lineStartPoint.y;
          const angle = Math.atan2(dy, dx);
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 吸附到15度（PI/12弧度）
          const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);

          const snappedX = lineStartPoint.x + distance * Math.cos(snapAngle);
          const snappedY = lineStartPoint.y + distance * Math.sin(snapAngle);
          p2 = { x: snappedX, y: snappedY };
        }

        setTempLine({ p1: lineStartPoint, p2: p2 });
        setIsEditingLine(true);
        setLineStartPoint(null);
      } else {
        // 第一次点击 - 开始线条
        setLineStartPoint(startPoint);
        setTempLine({ p1: startPoint, p2: startPoint });
        setIsEditingLine(false);
      }
      return;
    }

    if (selectedTool === 'arrow') {
      if (arrowStartPoint) {
        // 第二次点击 - 完成箭头并进入编辑模式
        let p2 = startPoint;
        if (e.ctrlKey) {
          const dx = startPoint.x - arrowStartPoint.x;
          const dy = startPoint.y - arrowStartPoint.y;
          const angle = Math.atan2(dy, dx);
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 吸附到15度（PI/12弧度）
          const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);

          const snappedX = arrowStartPoint.x + distance * Math.cos(snapAngle);
          const snappedY = arrowStartPoint.y + distance * Math.sin(snapAngle);
          p2 = { x: snappedX, y: snappedY };
        }

        setTempArrow({ p1: arrowStartPoint, p2: p2 });
        setIsEditingArrow(true);
        setArrowStartPoint(null);
      } else {
        // 第一次点击 - 开始箭头
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

    // 绘制初始点
    drawSegment(uid, startPoint, startPoint, currentColor, selectedTool === 'eraser' ? eraserSize : currentLineWidth, selectedTool);

    // 历史记录
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
    // 如果需要，保留事件合成属性，但对于 rAF 我们通常需要立即获取数据。
    // 在旧版本的 React 中事件是池化的，但在新版本中不是。
    // 然而，为了安全和高效，我们提取所需的值。
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

          // 吸附到15度（PI/12弧度）
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

          // 吸附到15度（PI/12弧度）
          const snapAngle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);

          const snappedX = arrowStartPoint.x + distance * Math.cos(snapAngle);
          const snappedY = arrowStartPoint.y + distance * Math.sin(snapAngle);

          setTempArrow({ p1: arrowStartPoint, p2: { x: snappedX, y: snappedY } });
        } else {
          setTempArrow({ p1: arrowStartPoint, p2: currentPoint });
        }
        return;
      }

      if (selectedTool === 'polygon' && drawingPolygonPoints.length > 0) {
        let targetPoint = currentPoint;
        if (drawingPolygonPoints.length > 2) {
          const startPoint = drawingPolygonPoints[0];
          const dist = Math.sqrt(Math.pow(currentPoint.x - startPoint.x, 2) + Math.pow(currentPoint.y - startPoint.y, 2));
          const threshold = 20 / zoomScale;
          if (dist < threshold) {
            setIsSnappedToStart(true);
            targetPoint = startPoint;
          } else {
            setIsSnappedToStart(false);
          }
        }
        setCurrentMousePos(targetPoint);
        return;
      }

      if (!isDrawing || !lastPositionRef.current) return

      if (selectedTool !== 'pencil' && selectedTool !== 'eraser' && selectedTool !== 'rectangle' && selectedTool !== 'circle' && selectedTool !== 'line' && selectedTool !== 'arrow') return

      if (selectedTool === 'rectangle' || selectedTool === 'circle') {
        const start = lastPositionRef.current;
        const deltaX = currentPoint.x - start.x;
        const deltaY = currentPoint.y - start.y;

        if (isCtrlPressed) {
          // 基于中心的绘制
          // 从中心到当前鼠标点的距离决定半宽/半高
          const halfWidth = Math.abs(deltaX);
          const halfHeight = Math.abs(deltaY);

          // 由于之前 Ctrl 的逻辑是正方形，我们保持它：从中心绘制正方形
          // 要使其只是"从中心"而没有正方形，我们会直接使用 halfWidth 和 halfHeight。
          // 但通常修饰键会添加约束。
          // 用户要求"按住 Ctrl... 以中心点为中心绘制"。
          // 之前的请求是"Ctrl... 绘制正方形"。
          // 最安全的假设是他们想要"从中心绘制正方形"。
          // 让我们使用最大维度作为正方形。
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

      // 增量绘制
      drawSegment(uid, lastPositionRef.current, currentPoint, currentColor, selectedTool === 'eraser' ? eraserSize : currentLineWidth, selectedTool);

      // 更新数据
      currentStrokeRef.current.points.push(currentPoint);

      lastPositionRef.current = currentPoint
    });
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const clientX = e.clientX;
    const clientY = e.clientY;

    // 使用 requestAnimationFrame 进行光标移动
    // 注意：如果我们重构，可以将其与上面的 rAF 合并，但现在单独的 rAF 也可以，或者我们可以假设 handleMouseMove 调用两者。
    // 实际上，每次鼠标移动调用两次 rAF 可能是多余的。
    // 让我们通过尽可能不在这里使用 rAF 来优化，或者使用直接变换。
    // 直接变换非常快。问题可能来自 top/left 的布局抖动。

    if (selectedTool === 'eraser' && eraserCursorRef.current) {
      const size = eraserSize * zoomScale;
      // 使用变换进行 GPU 加速
      eraserCursorRef.current.style.display = 'block';
      eraserCursorRef.current.style.transform = `translate3d(${clientX - size / 2}px, ${clientY - size / 2}px, 0)`;
      eraserCursorRef.current.style.width = `${size}px`;
      eraserCursorRef.current.style.height = `${size}px`;
      // 重置 top/left 为 0，因为我们使用变换
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

    // 调整笔画宽度以匹配视觉预览（border-box）
    // Canvas 在路径上居中绘制笔画，所以我们将路径向内移动 width/2
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

    // 历史记录
    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    // WebSocket
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

    // 调整笔画宽度以匹配视觉预览（border-box）
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

    // 历史记录
    historyRef.current.push({ type: 'draw', strokeIds: [newStroke.id] });
    redoStackRef.current = [];

    // WebSocket
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
      lineDash: style.lineDash || currentLineDash // 使用样式虚线或当前属性
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
              const dpr = window.devicePixelRatio || 1;
              const targetWidth = canvasSize.width * dpr;
              const targetHeight = canvasSize.height * dpr;
              
              // Only update if dimensions mismatch to avoid clearing canvas unnecessarily
              if (el.width !== targetWidth || el.height !== targetHeight) {
                el.width = targetWidth;
                el.height = targetHeight;
                // Style is handled by React prop below
                
                // Redraw to restore content and apply correct transform
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
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
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

          {isEditingPolygon && tempPolygonPoints && (
            <PolygonEditor
              ref={polygonEditorRef}
              initialPoints={tempPolygonPoints}
              initialColor={currentColor}
              initialWidth={currentLineWidth}
              zoomScale={zoomScale}
              onConfirm={handleConfirmPolygon}
              onCancel={handleCancelPolygon}
            />
          )}

          {isEditingText && tempTextPosition && (
            <TextEditor
              ref={textEditorRef}
              initialPosition={tempTextPosition}
              initialColor={currentColor}
              initialFontSize={currentFontSize}
              zoomScale={zoomScale}
              onConfirm={handleConfirmText}
              onCancel={handleCancelText}
            />
          )}

          {isEditingImage && tempImageRect && editingImageElement && (
            <ImageEditor
              ref={imageEditorRef}
              initialRect={tempImageRect}
              image={editingImageElement}
              zoomScale={zoomScale}
              onConfirm={handleConfirmImage}
              onCancel={handleCancelImage}
            />
          )}

          {selectedTool === 'polygon' && drawingPolygonPoints.length > 0 && (
            <svg
              width={canvasSize.width}
              height={canvasSize.height}
              style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none', left: 0, top: 0 }}
            >
              <polyline
                points={drawingPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={currentColor}
                strokeWidth={currentLineWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {currentMousePos && (
                <line
                  x1={drawingPolygonPoints[drawingPolygonPoints.length - 1].x}
                  y1={drawingPolygonPoints[drawingPolygonPoints.length - 1].y}
                  x2={currentMousePos.x}
                  y2={currentMousePos.y}
                  stroke={currentColor}
                  strokeWidth={currentLineWidth}
                  strokeLinecap="round"
                  strokeDasharray="5,5"
                />
              )}
              {isSnappedToStart && drawingPolygonPoints.length > 0 && (
                <circle
                  cx={drawingPolygonPoints[0].x}
                  cy={drawingPolygonPoints[0].y}
                  r={10 / zoomScale}
                  fill="rgba(255, 255, 0, 0.5)"
                  stroke="black"
                  strokeWidth={1 / zoomScale}
                />
              )}
            </svg>
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
                      x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle - Math.PI / 2),
                      y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle - Math.PI / 2)
                    };
                    const pRight = {
                      x: pBack.x + (actualHeadLen * 0.4) * Math.cos(angle + Math.PI / 2),
                      y: pBack.y + (actualHeadLen * 0.4) * Math.sin(angle + Math.PI / 2)
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

      {locationNotification && (
        <LocationNotification
          senderName={locationNotification.senderName}
          onTrack={() => {
            const { x, y } = locationNotification
            const newOffsetX = window.innerWidth / 2 - x * zoomScale
            const newOffsetY = window.innerHeight / 2 - y * zoomScale
            setCanvasOffset({ x: newOffsetX, y: newOffsetY })
            setLocationNotification(null)
          }}
          onClose={() => setLocationNotification(null)}
        />
      )}
    </div>
  )
}
)
export default CanvasMain;

const drawTextLine = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, align: string = 'left', underline: boolean | undefined, strike: boolean | undefined, fontSize: number) => {
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  let drawX = x;

  if (align === 'center') {
    drawX = x + (maxWidth - textWidth) / 2;
  } else if (align === 'right') {
    drawX = x + maxWidth - textWidth;
  }

  ctx.fillText(text, drawX, y);

  if (underline) {
    ctx.beginPath();
    ctx.moveTo(drawX, y + fontSize);
    ctx.lineTo(drawX + textWidth, y + fontSize);
    ctx.stroke();
  }

  if (strike) {
    ctx.beginPath();
    ctx.moveTo(drawX, y + fontSize / 2);
    ctx.lineTo(drawX + textWidth, y + fontSize / 2);
    ctx.stroke();
  }
};

