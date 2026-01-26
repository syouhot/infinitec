import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FaCheck, FaArrowsUpDownLeftRight, FaPalette, FaGripLines, FaXmark, FaRegSquare, FaSquare } from 'react-icons/fa6';
import '../styles/LineEditor.css'; // Reuse LineEditor styles

interface Point {
  x: number;
  y: number;
}

interface PolygonEditorProps {
  initialPoints: Point[];
  initialColor: string;
  initialWidth: number;
  zoomScale: number;
  onConfirm: (points: Point[], style: { color: string; width: number; isFilled: boolean }) => void;
  onCancel?: () => void;
}

export interface PolygonEditorRef {
  confirm: () => void;
}

const DEFAULT_COLORS = ['#FFFFFF', '#000000', '#0000FF', '#FF0000'];

const PolygonEditor = forwardRef<PolygonEditorRef, PolygonEditorProps>(({
  initialPoints,
  initialColor,
  initialWidth,
  zoomScale,
  onConfirm,
  onCancel
}, ref) => {
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [width, setWidth] = useState(initialWidth);
  const [isFilled, setIsFilled] = useState(false);
  
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
  const initialPointsRef = useRef<Point[] | null>(null);
  const activeHandleRef = useRef<number | 'move' | null>(null);

  const handleMouseDown = (e: React.MouseEvent, handleIndex: number | 'move') => {
    e.stopPropagation();
    e.preventDefault();
    activeHandleRef.current = handleIndex;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPointsRef.current = JSON.parse(JSON.stringify(points));
    
    setShowColorPicker(false);
    setShowWidthSlider(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !initialPointsRef.current || activeHandleRef.current === null) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoomScale;
    const dy = (e.clientY - dragStartRef.current.y) / zoomScale;
    const startPoints = initialPointsRef.current;

    if (activeHandleRef.current === 'move') {
      const newPoints = startPoints.map(p => ({
        x: p.x + dx,
        y: p.y + dy
      }));
      setPoints(newPoints);
    } else if (typeof activeHandleRef.current === 'number') {
      const index = activeHandleRef.current;
      const newPoints = [...points];
      newPoints[index] = {
        x: startPoints[index].x + dx,
        y: startPoints[index].y + dy
      };
      setPoints(newPoints);
    }
  }, [zoomScale, points]);

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    activeHandleRef.current = null;
    dragStartRef.current = null;
    initialPointsRef.current = null;
  };

  const handleConfirm = () => {
    onConfirm(points, { color, width, isFilled });
  };

  // Calculate center for toolbar position
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  
  const uiStyle = {
    transform: `scale(${1 / zoomScale})`,
    transformOrigin: 'center bottom',
    left: '50%',
    bottom: '100%',
    marginBottom: '10px'
  };

  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="line-editor-overlay" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' }}>
      {/* The Polygon Itself */}
      <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}>
        <polygon 
          points={pointsString}
          fill={isFilled ? color : "none"}
          stroke={!isFilled ? color : "none"}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Handles */}
      {points.map((p, index) => (
        <div 
          key={index}
          className="resize-handle"
          onMouseDown={(e) => handleMouseDown(e, index)}
          style={{
            left: p.x,
            top: p.y,
            transform: `translate(-50%, -50%) scale(${1/zoomScale})`,
            cursor: 'move'
          }}
        />
      ))}

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

            {/* Fill Toggle */}
            <button
              className={`toolbar-btn ${isFilled ? 'active' : ''}`}
              onClick={(e) => {
                 e.stopPropagation();
                 setIsFilled(!isFilled);
              }}
              title={isFilled ? "填充" : "描边"}
            >
              {isFilled ? <FaSquare /> : <FaRegSquare />}
            </button>
          </div>
      </div>
    </div>
  );
});

export default PolygonEditor;