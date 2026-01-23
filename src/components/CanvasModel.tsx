import { useState } from 'react'
import React from 'react'
import {
  FaPencil,
  FaRegSquare,
  FaRegCircle,
  FaMinus,
  FaArrowRight,
  FaDrawPolygon,
  FaFont
} from 'react-icons/fa6'
import {
  FaPalette,
  FaMinus as FaLineSize
} from 'react-icons/fa6'
import { useToolStore, useCanvasStore } from '../store'
import '../styles/CanvasModel.css'
import { colors, diyColors } from '../constants'

function CanvasModel() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedBottomIndex, setSelectedBottomIndex] = useState<number | null>(null)
  const [bottomColors, setBottomColors] = useState(diyColors)
  const currentColor = useCanvasStore((state) => state.currentColor)
  const [pickerColor, setPickerColor] = useState(currentColor)
  const selectedTool = useToolStore((state) => state.selectedTool)
  const setSelectedTool = useToolStore((state) => state.setSelectedTool)
  const currentLineWidth = useCanvasStore((state) => state.currentLineWidth)
  const setColor = useCanvasStore((state) => state.setColor)
  const setLineWidth = useCanvasStore((state) => state.setLineWidth)
  const currentLineDash = useCanvasStore((state) => state.currentLineDash)
  const setLineDash = useCanvasStore((state) => state.setLineDash)
  const currentArrowType = useCanvasStore((state) => state.currentArrowType)
  const setArrowType = useCanvasStore((state) => state.setArrowType)

  const tools = [
    { id: 'pencil', icon: FaPencil, label: '画笔' },
    { id: 'rectangle', icon: FaRegSquare, label: '矩形' },
    { id: 'circle', icon: FaRegCircle, label: '圆形' },
    { id: 'line', icon: FaMinus, label: '直线' },
    { id: 'arrow', icon: FaArrowRight, label: '箭头' },
    { id: 'polygon', icon: FaDrawPolygon, label: '多边形' },
    { id: 'text', icon: FaFont, label: '文本' }
  ]

  const selectedToolIcon = tools.find(tool => tool.id === selectedTool)?.icon || FaPencil

  const handleModelDisplayClick = () => {
    if (selectedTool !== 'pencil') {
      setSelectedTool('pencil')
    }
  }

  const lineStyles = [
    { id: 'solid', dash: [], label: '实线' },
    { id: 'dashed1', dash: [8, 8], label: '虚线1' },
    { id: 'dashed2', dash: [20, 20], label: '虚线2' },
    { id: 'dashed3', dash: [2, 6], label: '虚线3' }
  ]

  const topColors = colors

  const handleTopColorClick = (index: number) => {
    setColor(colors[index])
    setShowColorPicker(false)
    setSelectedBottomIndex(null)
    // Only switch to pencil if we are in pencil mode or if we want to force switch.
    // User wants rectangle color selection.
    // If selectedTool is rectangle, we should NOT switch to pencil.
    if (selectedTool !== 'rectangle' && selectedTool !== 'circle' && selectedTool !== 'line' && selectedTool !== 'arrow') {
      setSelectedTool('pencil')
    }
  }

  const handleBottomColorClick = (color: string, index: number) => {
    setColor(color)
    setPickerColor(color)
    setShowColorPicker(true)
    setSelectedBottomIndex(index)
    // Same here
    if (selectedTool !== 'rectangle' && selectedTool !== 'circle' && selectedTool !== 'line' && selectedTool !== 'arrow') {
      setSelectedTool('pencil')
    }
  }

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setPickerColor(newColor)
    setColor(newColor)
    // Same here
    if (selectedTool !== 'rectangle' && selectedTool !== 'circle' && selectedTool !== 'line' && selectedTool !== 'arrow') {
      setSelectedTool('pencil')
    }
    if (selectedBottomIndex !== null) {
      const newBottomColors = [...bottomColors]
      newBottomColors[selectedBottomIndex] = newColor
      setBottomColors(newBottomColors)
    }
  }

  const lineSizes = [0.5, 1, 2, 3, 4, 5, 6, 10]

  return (
    <div
      className="canvas-model-container"
      onMouseEnter={() => (selectedTool === 'pencil' || selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line' || selectedTool === 'arrow') && setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <div
        className={`model-display ${selectedTool !== 'pencil' ? 'switch-to-pencil' : ''}`}
        onClick={handleModelDisplayClick}
        title={selectedTool !== 'pencil' ? "点击切换回画笔" : "画笔设置"}
      >
        {React.createElement(selectedToolIcon, { size: 24 })}
      </div>
      <div className={`model-menu ${isMenuOpen && (selectedTool === 'pencil' || selectedTool === 'rectangle' || selectedTool === 'circle' || selectedTool === 'line' || selectedTool === 'arrow') ? 'open' : ''}`}>
        <div className="menu-section">
          <div className="menu-header">
            <FaPalette size={16} />
            <span>颜色</span>
          </div>
          <div className="color-grid color-grid-top">
            {topColors.map((color, index) => (
              <button
                key={index}
                className={`color-button color-button-circle ${currentColor === color ? 'active' : ''}`}
                onClick={() => handleTopColorClick(index)}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="color-grid color-grid-bottom">
            {bottomColors.map((color, index) => (
              <button
                key={index}
                className={`color-button color-button-square ${currentColor === color ? 'active' : ''}`}
                onClick={() => handleBottomColorClick(color, index)}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          {showColorPicker && (
            <div className="color-picker-container">
              <input
                type="color"
                value={pickerColor}
                onChange={handlePickerChange}
                className="color-picker"
              />
            </div>
          )}
        </div>

        {/* Line Style Section */}
        {selectedTool === 'line' && (
          <div className="menu-section">
            <div className="menu-header">
              <FaMinus size={16} />
              <span>样式</span>
            </div>
            <div className="style-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {lineStyles.map((style) => {
                const isSelected = JSON.stringify(currentLineDash) === JSON.stringify(style.dash);
                return (
                  <button
                    key={style.id}
                    className={`style-button ${isSelected ? 'active' : ''}`}
                    onClick={() => setLineDash(style.dash)}
                    title={style.label}
                    style={{
                      height: '32px',
                      border: isSelected ? '2px solid #1a73e8' : '1px solid #ddd',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px'
                    }}
                  >
                    <svg width="100%" height="4">
                      <line
                        x1="0" y1="2" x2="100%" y2="2"
                        stroke="#333"
                        strokeWidth="2"
                        strokeDasharray={style.dash.map(d => d / 2).join(',')} // Scale down for small button
                      />
                    </svg>

                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Arrow Style Section */}
        {selectedTool === 'arrow' && (
          <div className="menu-section">
            <div className="menu-header">
              <FaArrowRight size={16} />
              <span>样式</span>
            </div>
            <div className="style-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { id: 'standard', type: 'standard', label: '标准' },
                { id: 'double', type: 'double', label: '双向' },
                { id: 'solid', type: 'solid', label: '实心' },
                { id: 'solid-double', type: 'solid-double', label: '实心双向' },
              ].map((style) => {
                const isSelected = currentArrowType === style.type;
                return (
                  <button
                    key={style.id}
                    className={`style-button ${isSelected ? 'active' : ''}`}
                    onClick={() => setArrowType(style.type as any)}
                    title={style.label}
                    style={{
                      height: '32px',
                      border: isSelected ? '2px solid #1a73e8' : '1px solid #ddd',
                      borderRadius: '6px',
                      background: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px'
                    }}
                  >
                     <svg width="24" height="24" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
                        <line x1="4" y1="12" x2="20" y2="12" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                        {style.type === 'standard' && (
                           <polyline points="15,7 20,12 15,17" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {style.type === 'double' && (
                           <>
                             <polyline points="15,7 20,12 15,17" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                             <polyline points="9,7 4,12 9,17" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                           </>
                        )}
                        {style.type === 'solid' && (
                           <polygon points="20,12 14,8 14,16" fill="#333" />
                        )}
                        {style.type === 'solid-double' && (
                           <>
                             <polygon points="20,12 14,8 14,16" fill="#333" />
                             <polygon points="4,12 10,8 10,16" fill="#333" />
                           </>
                        )}
                     </svg>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Only show line width for pencil, not rectangle (Rectangle has its own width in editor, or maybe we want to set initial width?)
            The user only asked for "Add a menu... to select color". 
            I will hide width for rectangle for now to strictly follow "select color". 
            But typically initial width is also useful. 
            However, RectangleEditor has its own width control. 
            Let's keep it simple: Color only as requested.
        */}

        <div className="menu-section">
          <div className="menu-header">
            <FaLineSize size={16} />
            <span>粗细</span>
          </div>
          <div className="width-slider-container">
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={currentLineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="width-slider"
            />
            <span className="width-value">{currentLineWidth}px</span>
          </div>
        </div>

        <div className="menu-separator" />

        <div className="menu-section">
          <div className="mode-grid">
            {tools.filter(t => t.id !== selectedTool).map(tool => (
              <button
                key={tool.id}
                className={`mode-button ${selectedTool === tool.id ? 'active' : ''}`}
                onClick={() => setSelectedTool(tool.id)}
                title={tool.label}
              >
                <tool.icon size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CanvasModel
