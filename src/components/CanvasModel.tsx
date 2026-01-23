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

  const handleModelDisplayClick = () => {
    if (selectedTool === 'eraser') {
      setSelectedTool('pencil')
    }
  }

  const topColors = colors

  const handleTopColorClick = (index: number) => {
    setColor(colors[index])
    setShowColorPicker(false)
    setSelectedBottomIndex(null)
    setSelectedTool('pencil') // Switch to pencil when color is selected
  }

  const handleBottomColorClick = (color: string, index: number) => {
    setColor(color)
    setPickerColor(color)
    setShowColorPicker(true)
    setSelectedBottomIndex(index)
    setSelectedTool('pencil') // Switch to pencil when color is selected
  }

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setPickerColor(newColor)
    setColor(newColor)
    setSelectedTool('pencil') // Switch to pencil when color is selected
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
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <div 
        className={`model-display ${selectedTool !== 'eraser' ? 'active' : ''}`}
        onClick={handleModelDisplayClick}
      >
        {React.createElement(selectedToolIcon, { size: 24 })}
      </div>
      <div className={`model-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-section">
          <div className="menu-header">
            <FaPalette size={16} />
            <span>颜色</span>
          </div>
          <div className="color-grid color-grid-top">
            {topColors.map((color,index) => (
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
                onClick={() => {
                  setLineWidth(size)
                  setSelectedTool('pencil') // Switch to pencil when size is selected
                }}
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
