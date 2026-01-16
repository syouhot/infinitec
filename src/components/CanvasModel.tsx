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

function CanvasModel() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const selectedTool = useToolStore((state) => state.selectedTool)
  const currentColor = useCanvasStore((state) => state.currentColor)
  const currentLineWidth = useCanvasStore((state) => state.currentLineWidth)
  const setColor = useCanvasStore((state) => state.setColor)
  const setLineWidth = useCanvasStore((state) => state.setLineWidth)

  const tools = [
    { id: 'pencil', icon: FaPencil },
    { id: 'rectangle', icon: FaRegSquare },
    { id: 'circle', icon: FaRegCircle },
    { id: 'line', icon: FaMinus },
    { id: 'arrow', icon: FaArrowRight },
    { id: 'polygon', icon: FaDrawPolygon },
    { id: 'text', icon: FaFont }
  ]

  const selectedToolIcon = tools.find(tool => tool.id === selectedTool)?.icon || FaPencil

  const colors = [
    '#ffffff',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
    '#ffa500',
    '#800080',
    '#808080'
  ]

  const lineSizes = [1, 2, 3, 4, 5, 6, 8, 10]

  return (
    <div 
      className="canvas-model-container"
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <div className="model-display">
        {React.createElement(selectedToolIcon, { size: 24 })}
      </div>
      <div className={`model-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-section">
          <div className="menu-header">
            <FaPalette size={16} />
            <span>颜色</span>
          </div>
          <div className="color-grid">
            {colors.map(color => (
              <button
                key={color}
                className={`color-button ${currentColor === color ? 'active' : ''}`}
                onClick={() => setColor(color)}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="menu-section">
          <div className="menu-header">
            <FaLineSize size={16} />
            <span>粗细</span>
          </div>
          <div className="size-grid">
            {lineSizes.map(size => (
              <button
                key={size}
                className={`size-button ${currentLineWidth === size ? 'active' : ''}`}
                onClick={() => setLineWidth(size)}
              >
                <div 
                  className="size-preview" 
                  style={{ height: `${size}px` }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CanvasModel
