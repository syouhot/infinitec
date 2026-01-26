import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { FaCheck, FaXmark, FaArrowsUpDownLeftRight } from 'react-icons/fa6';
import '../styles/RectangleEditor.css'; // Reusing RectangleEditor styles for handles and toolbar

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

  // Normalize rect to always have positive width/height
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
      // Resize logic
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

      // Proportional scaling for corners
      if (isCorner) {
         const absNewW = Math.abs(newW);
         const absNewH = Math.abs(newH);
         
         const wFromH = absNewH * aspectRatioRef.current;
         const hFromW = absNewW / aspectRatioRef.current;
         
         // Use the dimension that implies a larger size (dominant axis)
         if (wFromH > absNewW) {
             // Drive by Height
             newW = wFromH * (newW < 0 ? -1 : 1); 
         } else {
             // Drive by Width
             newH = hFromW * (newH < 0 ? -1 : 1);
         }
         
         // Recalculate position based on anchored edges
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

  // Inverse scaling for UI elements to keep constant size
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
      {/* Image Preview */}
      <img 
        src={image.src}
        alt="Editing"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'fill', // or contain, but fill allows stretching if user wants non-proportional via side handles
          pointerEvents: 'none',
          userSelect: 'none'
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
          }}
        />
      ))}

      {/* Toolbar */}
      <div className="rectangle-toolbar" style={uiStyle}>
        <button className="toolbar-btn primary" onClick={handleConfirm} title="确定">
          <FaCheck />
        </button>

        <button className="toolbar-btn danger" onClick={onCancel} title="取消">
          <FaXmark />
        </button>
        
        <div className="toolbar-separator" />
        
        {/* Move Handle in Toolbar */}
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
