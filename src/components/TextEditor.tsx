import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  FaCheck, FaXmark, FaArrowsUpDownLeftRight, FaPalette, FaBold, FaItalic,
  FaUnderline, FaStrikethrough, FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaFont, FaTextHeight, FaFill
} from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES } from '../constants';
import '../styles/TextEditor.css';

export interface TextStyle {
  color: string;
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  textAlign: 'left' | 'center' | 'right';
  backgroundColor: string;
}

interface TextEditorProps {
  initialPosition: { x: number, y: number };
  initialColor?: string;
  initialFontSize?: number;
  zoomScale: number;
  onConfirm: (
    rect: { x: number, y: number, width: number, height: number },
    text: string,
    style: TextStyle
  ) => void;
  onCancel: () => void;
}

export interface TextEditorRef {
  confirm: () => void;
}

const DEFAULT_COLORS = ['#ffffff', '#FF0000', '#0000FF', '#008000'];
const DEFAULT_BG_COLORS = ['transparent', '#FFFFFF', '#FFFF00', '#ADD8E6'];
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'FangSong'];

const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(({
  initialPosition,
  initialColor,
  initialFontSize,
  zoomScale,
  onConfirm,
  onCancel
}, ref) => {
  const { t } = useTranslation()
  const [rect, setRect] = useState({ x: initialPosition.x, y: initialPosition.y, width: 200, height: 100 });
  const [content, setContent] = useState('');

  // Style State
  const [color, setColor] = useState(initialColor || '#000000');

  useEffect(() => {
    if (initialColor) {
      setColor(initialColor);
    }
  }, [initialColor]);

  const [fontSize, setFontSize] = useState(initialFontSize || 20);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [backgroundColor, setBackgroundColor] = useState('transparent');

  // Popover States
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizeSlider, setShowSizeSlider] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const rectStartRef = useRef<{ x: number, y: number, width: number, height: number } | null>(null);
  const activeHandleRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    confirm: handleConfirm
  }));

  // Focus textarea on mount
  useEffect(() => {
    if (textAreaRef.current) {
      // Use setTimeout to ensure the DOM is fully ready and other events have settled
      const timer = setTimeout(() => {
        textAreaRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConfirm = () => {
    if (!content.trim()) {
      onCancel();
      return;
    }
    onConfirm(
      {
        x: rect.width < 0 ? rect.x + rect.width : rect.x,
        y: rect.height < 0 ? rect.y + rect.height : rect.y,
        width: Math.abs(rect.width),
        height: Math.abs(rect.height)
      },
      content,
      {
        color,
        fontSize,
        fontFamily,
        isBold,
        isItalic,
        isUnderline,
        isStrikethrough,
        textAlign,
        backgroundColor
      }
    );
  };

  const handleMouseDown = (e: React.MouseEvent, handleType: string) => {
    e.stopPropagation();
    // e.preventDefault(); // Don't prevent default on textarea click, but here we are clicking handles/toolbar

    activeHandleRef.current = handleType;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    rectStartRef.current = { ...rect };

    // Close popovers on drag start
    setShowColorPicker(false);
    setShowBgColorPicker(false);
    setShowFontPicker(false);
    setShowSizeSlider(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Close all popovers
  const closeAllPopovers = useCallback(() => {
    setShowColorPicker(false);
    setShowBgColorPicker(false);
    setShowFontPicker(false);
    setShowSizeSlider(false);
  }, []);

  // Handle click outside to close popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // The toolbar stops propagation on mousedown, so this will only trigger 
      // if clicked outside the toolbar (e.g. on the canvas)
      closeAllPopovers();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeAllPopovers]);

  // Handle toggling popovers (click based instead of hover)
  const togglePopover = (setter: React.Dispatch<React.SetStateAction<boolean>>, currentState: boolean) => {
    closeAllPopovers();
    if (!currentState) {
      setter(true);
    }
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

  const uiStyle = {
    transform: `scale(${1 / zoomScale})`,
    transformOrigin: 'center bottom'
  };

  const normalizedRect = {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };

  return (
    <div
      className="text-editor-container"
      style={{
        left: normalizedRect.x,
        top: normalizedRect.y,
        width: normalizedRect.width,
        height: normalizedRect.height,
        backgroundColor: backgroundColor,
        border: '1px dashed #1a73e8' // Always show border while editing
      }}
      ref={containerRef}
      onMouseDown={(e) => {
        e.stopPropagation();
        // Ensure textarea gets focus when clicking the container (e.g. padding area)
        if (e.target === containerRef.current) {
          textAreaRef.current?.focus();
        }
      }}
    >
      <textarea
        ref={textAreaRef}
        autoFocus
        className={`text-editor-input ${isItalic ? 'is-italic' : ''}`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{
          backgroundColor: 'transparent',
          color: color,
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: isBold ? 'bold' : 'normal',
          fontStyle: isItalic ? 'italic' : 'normal',
          textDecoration: [
            isUnderline ? 'underline' : '',
            isStrikethrough ? 'line-through' : ''
          ].filter(Boolean).join(' ') || 'none',
          textAlign: textAlign,
          lineHeight: 1.2
        }}
        placeholder="输入文本..."
      />

      {/* Resize Handles */}
      {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map(dir => (
        <div
          key={dir}
          className={`resize-handle handle-${dir}`}
          onMouseDown={(e) => handleMouseDown(e, dir)}
          style={{
            transform: `translate(${dir.includes('w') ? '-50%' : '50%'}, ${dir.includes('n') ? '-50%' : '50%'}) scale(${1 / zoomScale})`
          }}
        />
      ))}

      {/* Toolbar */}
      <div className="text-toolbar" style={uiStyle} onMouseDown={(e) => e.stopPropagation()}>
        <button className="toolbar-btn primary" onClick={handleConfirm} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.confirm')}>
          <FaCheck />
        </button>
        <button className="toolbar-btn danger" onClick={onCancel} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.cancel')}>
          <FaXmark />
        </button>

        <div className="toolbar-separator" />

        <button
          className="toolbar-btn"
          onMouseDown={(e) => handleMouseDown(e, 'move')}
          title={t('textEditor.move')}
          style={{ cursor: 'move' }}
        >
          <FaArrowsUpDownLeftRight />
        </button>


        {/* Color */}
        <div className="toolbar-btn-wrapper">
          <button
            className={`toolbar-btn ${showColorPicker ? 'active' : ''}`}
            title={t('textEditor.textColor')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => togglePopover(setShowColorPicker, showColorPicker)}
          >
            <FaPalette style={{ color: color }} />
          </button>
          {showColorPicker && (
            <div className="popover">
              <div className="color-options">
                {DEFAULT_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-circle ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => { setColor(c); }}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                ))}
              </div>
              <div className="custom-color-row">
                <input
                  type="color"
                  className="color-picker-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  title={t('textEditor.customColor')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bg Color */}
        <div className="toolbar-btn-wrapper">
          <button
            className={`toolbar-btn ${showBgColorPicker ? 'active' : ''}`}
            title={t('textEditor.bgColor')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => togglePopover(setShowBgColorPicker, showBgColorPicker)}
          >
            <FaFill style={{ color: backgroundColor === 'transparent' ? '#fff' : backgroundColor }} />
          </button>
          {showBgColorPicker && (
            <div className="popover">
              <div className="color-options">
                {DEFAULT_BG_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-circle ${backgroundColor === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c, border: c === 'transparent' ? '1px solid #ccc' : 'none' }}
                    onClick={() => { setBackgroundColor(c); }}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                ))}
              </div>
              <div className="custom-color-row">
                <input
                  type="color"
                  className="color-picker-input"
                  value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  title={t('textEditor.customBgColor')}
                />
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-separator" />

        {/* Font Family */}
        <div className="toolbar-btn-wrapper">
          <button
            className={`toolbar-btn ${showFontPicker ? 'active' : ''}`}
            title={t('textEditor.fontFamily')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => togglePopover(setShowFontPicker, showFontPicker)}
          >
            <FaFont />
          </button>
          {showFontPicker && (
            <div className="popover" onWheel={(e) => e.stopPropagation()}>
              <div className="font-list">
                {FONTS.map(f => (
                  <div
                    key={f}
                    className={`font-item ${fontFamily === f ? 'selected' : ''}`}
                    style={{ fontFamily: f }}
                    onClick={() => { setFontFamily(f); }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Font Size */}
        <div className="toolbar-btn-wrapper">
          <button
            className={`toolbar-btn ${showSizeSlider ? 'active' : ''}`}
            title={t('textEditor.fontSize')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => togglePopover(setShowSizeSlider, showSizeSlider)}
          >
            <FaTextHeight />
          </button>
          {showSizeSlider && (
            <div className="popover" onWheel={(e) => e.stopPropagation()}>
              <div className="font-list">
                {FONT_SIZES.map(s => (
                  <div
                    key={s}
                    className={`font-item ${fontSize === s ? 'selected' : ''}`}
                    onClick={() => { setFontSize(s); }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {s}px
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-separator" />

        {/* Styles */}
        <button className={`toolbar-btn ${isBold ? 'active' : ''}`} onClick={() => setIsBold(!isBold)} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.bold')}><FaBold /></button>
        <button className={`toolbar-btn ${isItalic ? 'active' : ''}`} onClick={() => setIsItalic(!isItalic)} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.italic')}><FaItalic /></button>
        <button className={`toolbar-btn ${isUnderline ? 'active' : ''}`} onClick={() => setIsUnderline(!isUnderline)} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.underline')}><FaUnderline /></button>
        <button className={`toolbar-btn ${isStrikethrough ? 'active' : ''}`} onClick={() => setIsStrikethrough(!isStrikethrough)} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.strikethrough')}><FaStrikethrough /></button>

        <div className="toolbar-separator" />

        {/* Align */}
        <button className={`toolbar-btn ${textAlign === 'left' ? 'active' : ''}`} onClick={() => setTextAlign('left')} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.alignLeft')}><FaAlignLeft /></button>
        <button className={`toolbar-btn ${textAlign === 'center' ? 'active' : ''}`} onClick={() => setTextAlign('center')} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.alignCenter')}><FaAlignCenter /></button>
        <button className={`toolbar-btn ${textAlign === 'right' ? 'active' : ''}`} onClick={() => setTextAlign('right')} onMouseDown={(e) => e.preventDefault()} title={t('textEditor.alignRight')}><FaAlignRight /></button>
      </div>
    </div>
  );
});

export default TextEditor;
