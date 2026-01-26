import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FaCheck, FaArrowsUpDownLeftRight, FaPalette, FaGripLines, FaXmark } from 'react-icons/fa6';
import '../styles/LineEditor.css';

interface Point {
  x: number;
  y: number;
}

interface LineEditorProps {
  initialP1: Point;
  initialP2: Point;
  initialColor: string;
  initialWidth: number;
  initialLineDash?: number[];
  zoomScale: number;
  onConfirm: (p1: Point, p2: Point, style: { color: string; width: number; lineDash?: number[] }) => void;
  onCancel?: () => void;
}

export interface LineEditorRef {
  confirm: () => void;
}

const DEFAULT_COLORS = ['#FFFFFF', '#000000', '#0000FF', '#FF0000'];

const LineEditor = forwardRef<LineEditorRef, LineEditorProps>(({
  initialP1,
  initialP2,
  initialColor,
  initialWidth,
  initialLineDash = [],
  zoomScale,
  onConfirm,
  onCancel
}, ref) => {
  const [p1, setP1] = useState<Point>(initialP1);
  const [p2, setP2] = useState<Point>(initialP2);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [width, setWidth] = useState(initialWidth);
  const [lineDash] = useState(initialLineDash);
  
  useEffect(() => {
    if (initialColor && initialColor !== color) {
       setColor(initialColor);
    }
  }, [initialColor]);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWidthSlider, setShowWidthSlider] = useState(false);

  useImperativeHandle(ref, () => ({
    confirm: handleConfirm
  }));

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPosRef = useRef<{ p1: Point, p2: Point } | null>(null);
  const activeHandleRef = useRef<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent, handleType: string) => {
    e.stopPropagation();
    e.preventDefault();
    activeHandleRef.current = handleType;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { p1: { ...p1 }, p2: { ...p2 } };
    
    setShowColorPicker(false);
    setShowWidthSlider(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !initialPosRef.current || !activeHandleRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoomScale;
    const dy = (e.clientY - dragStartRef.current.y) / zoomScale;
    const startPos = initialPosRef.current;

    if (activeHandleRef.current === 'move') {
      setP1({ x: startPos.p1.x + dx, y: startPos.p1.y + dy });
      setP2({ x: startPos.p2.x + dx, y: startPos.p2.y + dy });
    } else if (activeHandleRef.current === 'p1') {
      setP1({ x: startPos.p1.x + dx, y: startPos.p1.y + dy });
    } else if (activeHandleRef.current === 'p2') {
      setP2({ x: startPos.p2.x + dx, y: startPos.p2.y + dy });
    }
  }, [zoomScale]);

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    activeHandleRef.current = null;
    dragStartRef.current = null;
    initialPosRef.current = null;
  };

  const handleConfirm = () => {
    onConfirm(p1, p2, { color, width, lineDash });
  };

  // 计算工具栏位置的中心点
  const centerX = (p1.x + p2.x) / 2;
  const centerY = (p1.y + p2.y) / 2;
  
  // 计算容器的边界框（只是为了包含UI，尽管句柄是绝对定位的）
  // 实际上，我们可以将所有内容相对于位于0,0或类似位置的容器进行绝对定位渲染。
  // 但为了匹配 RectangleEditor，我们可能需要一个容器。
  // 然而，线条可以是对角线的。边界框容器可以工作。
  const minX = Math.min(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxX = Math.max(p1.x, p2.x);
  const maxY = Math.max(p1.y, p2.y);
  
  const uiStyle = {
    transform: `scale(${1 / zoomScale})`,
    transformOrigin: 'center bottom',
    left: '50%',
    bottom: '100%',
    marginBottom: '10px'
  };

  return (
    <div className="line-editor-overlay" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' }}>
      {/* The Line Itself */}
      <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}>
        <line 
          x1={p1.x} 
          y1={p1.y} 
          x2={p2.x} 
          y2={p2.y} 
          stroke={color} 
          strokeWidth={width} 
          strokeLinecap="round"
          strokeDasharray={lineDash.join(',')}
        />
        {/* Invisible wider line for easier grabbing if we wanted, but we have a move button */}
      </svg>

      {/* Handles */}
      <div 
        className="resize-handle handle-p1"
        onMouseDown={(e) => handleMouseDown(e, 'p1')}
        style={{
          left: p1.x,
          top: p1.y,
          transform: `translate(-50%, -50%) scale(${1/zoomScale})`
        }}
      />
      <div 
        className="resize-handle handle-p2"
        onMouseDown={(e) => handleMouseDown(e, 'p2')}
        style={{
          left: p2.x,
          top: p2.y,
          transform: `translate(-50%, -50%) scale(${1/zoomScale})`
        }}
      />

      {/* Toolbar - Positioned at Center */}
      <div 
        className="line-toolbar-wrapper"
        style={{
            position: 'absolute',
            left: centerX,
            top: centerY,
            width: 0, 
            height: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end'
        }}
      >
          <div className="line-toolbar" style={uiStyle}>
            {/* Confirm */}
            <button className="toolbar-btn primary" onClick={handleConfirm} title="确定绘制">
              <FaCheck />
            </button>

            {/* Cancel */}
            <button className="toolbar-btn danger" onClick={onCancel} title="取消">
              <FaXmark />
            </button>

            <div className="toolbar-separator" />

            {/* Move */}
            <button 
              className="toolbar-btn move-btn" 
              onMouseDown={(e) => handleMouseDown(e, 'move')}
              title="按住拖拽"
              style={{ cursor: 'move' }}
            >
              <FaArrowsUpDownLeftRight />
            </button>

            <div className="toolbar-separator" />

            {/* Color */}
            <div 
              className="toolbar-btn-wrapper"
              onMouseEnter={() => setShowColorPicker(true)}
              onMouseLeave={() => setShowColorPicker(false)}
              style={{ position: 'relative' }}
            >
              <button className="toolbar-btn" title="颜色">
                <FaPalette style={{ color: color }} />
              </button>
              
              {showColorPicker && (
                <div className="color-picker-popover">
                  <div className="color-options">
                    {DEFAULT_COLORS.map(c => (
                      <div 
                        key={c}
                        className={`color-circle ${color === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                  <div className="custom-color-input">
                     <input 
                        type="color" 
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ width: '100%', height: '30px', cursor: 'pointer' }}
                     />
                  </div>
                </div>
              )}
            </div>

            {/* Width */}
            <div 
              className="toolbar-btn-wrapper"
              onMouseEnter={() => setShowWidthSlider(true)}
              onMouseLeave={() => setShowWidthSlider(false)}
              style={{ position: 'relative' }}
            >
              <button className="toolbar-btn" title="线条粗细">
                <FaGripLines />
              </button>

              {showWidthSlider && (
                <div className="width-slider-popover">
                  <div className="width-slider-container">
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      step="1" 
                      value={width} 
                      onChange={(e) => setWidth(parseInt(e.target.value))}
                      className="width-slider"
                    />
                    <span className="width-value">{width}px</span>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
});

export default LineEditor;
