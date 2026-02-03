import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { FaCheck, FaXmark, FaArrowsUpDownLeftRight } from 'react-icons/fa6';
import '../styles/RectangleEditor.css'; // 复用 RectangleEditor 的样式用于手柄和工具栏

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageEditorProps {
  initialRect: Rect;
  image: HTMLImageElement;
  zoomScale: number;
  onConfirm: (rect: Rect) => void;
  onCancel?: () => void;
}

export interface ImageEditorRef {
  confirm: () => void;
}

const ImageEditor = forwardRef<ImageEditorRef, ImageEditorProps>(({
  initialRect,
  image,
  zoomScale,
  onConfirm,
  onCancel
}, ref) => {
  const [rect, setRect] = useState<Rect>(initialRect);
  
  useImperativeHandle(ref, () => ({
    confirm: handleConfirm
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const rectStartRef = useRef<Rect | null>(null);
  const activeHandleRef = useRef<string | null>(null);
  const aspectRatioRef = useRef<number>(initialRect.width / initialRect.height);

  // 规范化矩形，始终保持宽高为正值
  const normalizedRect = {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };

  const handleMouseDown = (e: React.MouseEvent, handleType: string) => {
    e.stopPropagation();
    e.preventDefault();
    activeHandleRef.current = handleType;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    rectStartRef.current = { ...rect };
    aspectRatioRef.current = rect.width / rect.height;

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
      
      const isCorner = ['nw', 'ne', 'sw', 'se'].includes(activeHandleRef.current);

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

      // 角落调整时保持比例
      if (isCorner) {
         const absNewW = Math.abs(newW);
         const absNewH = Math.abs(newH);
         
         const wFromH = absNewH * aspectRatioRef.current;
         const hFromW = absNewW / aspectRatioRef.current;
         
         // 使用意味着更大尺寸的维度（主轴）
         if (wFromH > absNewW) {
             // 由高度驱动
             newW = wFromH * (newW < 0 ? -1 : 1); 
         } else {
             // 由宽度驱动
             newH = hFromW * (newH < 0 ? -1 : 1);
         }
         
         // 根据锚定边缘重新计算位置
         if (activeHandleRef.current.includes('w')) {
             newX = startRect.x + (startRect.width - newW);
         }
         if (activeHandleRef.current.includes('n')) {
             newY = startRect.y + (startRect.height - newH);
         }
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
    onConfirm(normalizedRect);
  };

  // 反向缩放 UI 元素以保持固定大小
  const uiStyle = {
    transform: `scale(${1 / zoomScale})`,
    transformOrigin: 'center bottom'
  };

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
      {/* 图片预览 */}
      <img 
        src={image.src}
        alt="Editing"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'fill', // 或者 contain，但 fill 允许用户通过侧边手柄进行非比例拉伸
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      />

      {/* 调整大小手柄 */}
      {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map(dir => (
        <div
          key={dir}
          className={`resize-handle handle-${dir}`}
          onMouseDown={(e) => handleMouseDown(e, dir)}
          style={{
            transform: `translate(${dir.includes('w') ? '-50%' : '50%'}, ${dir.includes('n') ? '-50%' : '50%'}) scale(${1/zoomScale})`,
          }}
        />
      ))}

      {/* 工具栏 */}
      <div className="rectangle-toolbar" style={uiStyle}>
        <button className="toolbar-btn primary" onClick={handleConfirm} title="确定">
          <FaCheck />
        </button>

        <button className="toolbar-btn danger" onClick={onCancel} title="取消">
          <FaXmark />
        </button>
        
        <div className="toolbar-separator" />
        
        {/* 工具栏中的移动手柄 */}
        <button 
          className="toolbar-btn move-btn"
          onMouseDown={(e) => handleMouseDown(e, 'move')}
          style={{ cursor: 'move' }}
          title="移动"
        >
          <FaArrowsUpDownLeftRight />
        </button>
      </div>
    </div>
  );
});

export default ImageEditor;
