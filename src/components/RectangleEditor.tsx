import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FaCheck, FaArrowsUpDownLeftRight, FaPalette, FaRegSquare, FaSquare, FaGripLines, FaXmark } from 'react-icons/fa6';
import '../styles/RectangleEditor.css';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RectangleEditorProps {
  initialRect: Rect;
  initialColor: string;
  initialWidth: number;
  zoomScale: number;
  onConfirm: (rect: Rect, style: { color: string; width: number; isFilled: boolean }) => void;
  onCancel?: () => void;
}

export interface RectangleEditorRef {
  confirm: () => void;
}

const DEFAULT_COLORS = ['#FFFFFF', '#000000', '#0000FF', '#FF0000'];

const RectangleEditor = forwardRef<RectangleEditorRef, RectangleEditorProps>(({
  initialRect,
  initialColor,
  initialWidth,
  zoomScale,
  onConfirm,
  onCancel
}, ref) => {
  const [rect, setRect] = useState<Rect>(initialRect);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [width, setWidth] = useState(initialWidth);
  const [isFilled, setIsFilled] = useState(false);
  
  // 如果需要，与外部 initialColor 更改同步（例如来自 CanvasModel）
  // 这允许按照请求"链接"颜色值。
  // 当 CanvasModel 颜色更改时，initialColor prop 更新，所以我们应该更新本地状态。
  useEffect(() => {
    // 只有在不同时才更新，以避免循环或覆盖（如果我们想要本地独立性）。
    // 然而，请求意味着链接。
    if (initialColor && initialColor !== color) {
       setColor(initialColor);
    }
  }, [initialColor]);
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showWidthSlider, setShowWidthSlider] = useState(false);
  const [customColor, setCustomColor] = useState('#FFFFFF');

  useImperativeHandle(ref, () => ({
    confirm: handleConfirm
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const rectStartRef = useRef<Rect | null>(null);
  const activeHandleRef = useRef<string | null>(null);

  // 规范化矩形以始终具有正的宽度/高度
  const normalizedRect = {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };

  const handleMouseDown = (e: React.MouseEvent, handleType: string) => {
    e.stopPropagation();
    e.preventDefault(); // 防止文本选择
    activeHandleRef.current = handleType;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    rectStartRef.current = { ...rect };
    
    // 关闭弹出框
    setShowColorPicker(false);
    setShowWidthSlider(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !rectStartRef.current || !activeHandleRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoomScale;
    const dy = (e.clientY - dragStartRef.current.y) / zoomScale;
    const startRect = rectStartRef.current;

    if (activeHandleRef.current === 'move') {
      setRect({
        ...startRect,
        x: startRect.x + dx,
        y: startRect.y + dy
      });
    } else {
      // 调整大小逻辑
      let newX = startRect.x;
      let newY = startRect.y;
      let newW = startRect.width;
      let newH = startRect.height;

      if (activeHandleRef.current.includes('w')) {
        newX = startRect.x + dx;
        newW = startRect.width - dx;
      }
      if (activeHandleRef.current.includes('e')) {
        newW = startRect.width + dx;
      }
      if (activeHandleRef.current.includes('n')) {
        newY = startRect.y + dy;
        newH = startRect.height - dy;
      }
      if (activeHandleRef.current.includes('s')) {
        newH = startRect.height + dy;
      }

      setRect({ x: newX, y: newY, width: newW, height: newH });
    }
  }, [zoomScale]);

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    activeHandleRef.current = null;
    dragStartRef.current = null;
    rectStartRef.current = null;
  };

  const handleConfirm = () => {
    onConfirm(normalizedRect, { color, width, isFilled });
  };

  // UI 元素的逆缩放以保持恒定大小
  const uiStyle = {
    transform: `scale(${1 / zoomScale})`,
    transformOrigin: 'center bottom'
  };

  const handleStyle = {
    transform: `scale(${1 / zoomScale}) translate(-50%, -50%)`,
    transformOrigin: 'center'
  };
  
  // 自定义句柄定位逻辑，以便在视觉上将句柄居中在角/边上
  // 但如果句柄居中，我们可以只使用简单的缩放。
  // CSS 处理平移。

  return (
    <div 
      className="rectangle-editor-container"
      style={{
        left: normalizedRect.x,
        top: normalizedRect.y,
        width: normalizedRect.width,
        height: normalizedRect.height,
      }}
      ref={containerRef}
    >
      {/* Shape Preview */}
      <div 
        className="rectangle-shape"
        style={{
          border: isFilled ? 'none' : `${width}px solid ${color}`,
          backgroundColor: isFilled ? color : 'transparent',
        }}
      />

      {/* Resize Handles */}
      {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map(dir => (
        <div
          key={dir}
          className={`resize-handle handle-${dir}`}
          onMouseDown={(e) => handleMouseDown(e, dir)}
          style={{
            transform: `translate(${dir.includes('w') ? '-50%' : '50%'}, ${dir.includes('n') ? '-50%' : '50%'}) scale(${1/zoomScale})`,
            // 为特定句柄覆盖 CSS 变换
          }}
        />
      ))}

      {/* 工具栏 */}
      <div className="rectangle-toolbar" style={uiStyle}>
        {/* 1. 确认 */}
        <button className="toolbar-btn primary" onClick={handleConfirm} title="确定绘制">
          <FaCheck />
        </button>

        {/* 取消 */}
        <button className="toolbar-btn danger" onClick={onCancel} title="取消">
          <FaXmark />
        </button>

        <div className="toolbar-separator" />

        {/* 2. Move (Drag Handle) */}
        <button 
          className="toolbar-btn move-btn" 
          onMouseDown={(e) => handleMouseDown(e, 'move')}
          title="按住拖拽"
          style={{ cursor: 'move' }}
        >
          <FaArrowsUpDownLeftRight />
        </button>

        {/* 3. Color */}
        <div 
          className="toolbar-btn-wrapper" 
          onMouseEnter={() => setShowColorPicker(true)}
          onMouseLeave={() => setShowColorPicker(false)}
          style={{ position: 'relative' }}
        >
          <button className="toolbar-btn" title="选择颜色">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                 <input 
                   type="color" 
                   value={customColor} 
                   onChange={(e) => {
                     setCustomColor(e.target.value);
                     setColor(e.target.value);
                   }}
                   style={{ width: '100%', height: '30px', cursor: 'pointer' }}
                 />
              </div>
            </div>
          )}
        </div>

        {/* 4. Width */}
        <div 
          className="toolbar-btn-wrapper"
          onMouseEnter={() => setShowWidthSlider(true)}
          onMouseLeave={() => setShowWidthSlider(false)}
          style={{ position: 'relative' }}
        >
          <button className="toolbar-btn" title="边框粗细">
            <FaGripLines />
          </button>

          {showWidthSlider && (
            <div className="width-slider-popover">
              <div className="width-slider-container">
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
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

        {/* 5. Fill/Stroke Toggle */}
        <button 
          className="toolbar-btn" 
          onClick={() => setIsFilled(!isFilled)}
          title={isFilled ? "切换为边框" : "切换为实体"}
        >
          {isFilled ? <FaRegSquare /> : <FaSquare />}
        </button>
      </div>
    </div>
  );
});

export default RectangleEditor;
