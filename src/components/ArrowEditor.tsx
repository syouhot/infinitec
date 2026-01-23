import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FaCheck, FaArrowsUpDownLeftRight, FaPalette, FaGripLines, FaXmark,FaArrowRight } from 'react-icons/fa6';
import '../styles/LineEditor.css'; // Reuse LineEditor styles

interface Point {
  x: number;
  y: number;
}

export type ArrowType = 'standard' | 'double' | 'solid' | 'solid-double';

interface ArrowEditorProps {
  initialP1: Point;
  initialP2: Point;
  initialColor: string;
  initialWidth: number;
  initialArrowType?: ArrowType;
  zoomScale: number;
  onConfirm: (p1: Point, p2: Point, style: { color: string; width: number; arrowType: ArrowType }) => void;
  onCancel?: () => void;
}

export interface ArrowEditorRef {
  confirm: () => void;
}

const DEFAULT_COLORS = ['#FFFFFF', '#000000', '#0000FF', '#FF0000'];

const ArrowEditor = forwardRef<ArrowEditorRef, ArrowEditorProps>(({
  initialP1,
  initialP2,
  initialColor,
  initialWidth,
  initialArrowType = 'standard',
  zoomScale,
  onConfirm,
  onCancel
}, ref) => {
  const [p1, setP1] = useState<Point>(initialP1);
  const [p2, setP2] = useState<Point>(initialP2);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [width, setWidth] = useState(initialWidth);
  const [arrowType, setArrowType] = useState<ArrowType>(initialArrowType);
  const [showStylePicker, setShowStylePicker] = useState(false);
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
    onConfirm(p1, p2, { color, width, arrowType });
  };

  // Calculate center for toolbar position
  const centerX = (p1.x + p2.x) / 2;
  const centerY = (p1.y + p2.y) / 2;
  
  const uiStyle = {
    transform: `scale(${1 / zoomScale})`,
    transformOrigin: 'center bottom',
    left: '50%',
    bottom: '100%',
    marginBottom: '10px'
  };

  // Arrow Rendering Logic
  const renderArrow = () => {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    // Head size scaling: at least 10px, scales with width
    const headLen = Math.max(10, width * 3); 
    const elements = [];

    // Main line
    elements.push(
      <line 
        key="main-line"
        x1={p1.x} 
        y1={p1.y} 
        x2={p2.x} 
        y2={p2.y} 
        stroke={color} 
        strokeWidth={width} 
        strokeLinecap="round"
      />
    );

    const drawHead = (x: number, y: number, angle: number, isSolid: boolean, keyPrefix: string) => {
        const actualHeadLen = isSolid ? headLen * 1.8 : headLen;
        if (isSolid) {
             // Filled Triangle
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
             return (
                 <polygon 
                    key={keyPrefix}
                    points={`${pTip.x},${pTip.y} ${pLeft.x},${pLeft.y} ${pRight.x},${pRight.y}`}
                    fill={color}
                 />
             );
        } else {
             // Open Line Arrow
             const xLeft = x - headLen * Math.cos(angle - Math.PI / 6);
             const yLeft = y - headLen * Math.sin(angle - Math.PI / 6);
             const xRight = x - headLen * Math.cos(angle + Math.PI / 6);
             const yRight = y - headLen * Math.sin(angle + Math.PI / 6);
             return (
                <polyline 
                    key={keyPrefix}
                    points={`${xLeft},${yLeft} ${x},${y} ${xRight},${yRight}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
             );
        }
    }

    if (arrowType === 'standard') {
        elements.push(drawHead(p2.x, p2.y, angle, false, 'head-end'));
    } else if (arrowType === 'double') {
        elements.push(drawHead(p1.x, p1.y, angle + Math.PI, false, 'head-start'));
        elements.push(drawHead(p2.x, p2.y, angle, false, 'head-end'));
    } else if (arrowType === 'solid') {
        elements.push(drawHead(p2.x, p2.y, angle, true, 'head-end'));
    } else if (arrowType === 'solid-double') {
        elements.push(drawHead(p1.x, p1.y, angle + Math.PI, true, 'head-start'));
        elements.push(drawHead(p2.x, p2.y, angle, true, 'head-end'));
    }
    
    return elements;
  };

  return (
    <div className="line-editor-overlay" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' }}>
      {/* The Arrow Itself */}
      <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}>
        {renderArrow()}
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

            {/* Arrow Style */}
            <div 
              className="toolbar-btn-wrapper"
              onMouseEnter={() => setShowStylePicker(true)}
              onMouseLeave={() => setShowStylePicker(false)}
              style={{ position: 'relative' }}
            >
              <button className="toolbar-btn" title="箭头样式">
                <FaArrowRight />
              </button>
              
              {showStylePicker && (
                <div className="style-picker-popover" style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    padding: '8px',
                    display: 'flex',
                    gap: '8px',
                    zIndex: 1000,
                    width: 'max-content'
                }}>
                   {[
                        { id: 'standard', label: '标准' },
                        { id: 'double', label: '双向' },
                        { id: 'solid', label: '实心' },
                        { id: 'solid-double', label: '实心双向' },
                   ].map(style => (
                       <div 
                           key={style.id}
                           onClick={() => setArrowType(style.id as ArrowType)}
                           title={style.label}
                           style={{
                               width: '32px',
                               height: '32px',
                               border: arrowType === style.id ? '2px solid #1a73e8' : '1px solid #ddd',
                               borderRadius: '4px',
                               cursor: 'pointer',
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center'
                           }}
                       >
                            <svg width="24" height="24" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                                <line x1="2" y1="12" x2="22" y2="12" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                                {(style.id === 'standard' || style.id === 'double') && <polyline points="17,7 22,12 17,17" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                                {(style.id === 'double') && <polyline points="7,7 2,12 7,17" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                                {(style.id === 'solid' || style.id === 'solid-double') && <polygon points="22,12 16,8 16,16" fill="#333" />}
                                {(style.id === 'solid-double') && <polygon points="2,12 8,8 8,16" fill="#333" />}
                            </svg>
                       </div>
                   ))}
                </div>
              )}
            </div>

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

export default ArrowEditor;
