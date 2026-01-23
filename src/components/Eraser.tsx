import React from 'react'
import { FaEraser } from 'react-icons/fa6'
import { useToolStore, useCanvasStore } from '../store'
import { CANVAS_CONFIG } from '../constants'
import '../styles/Eraser.css'

function Eraser() {
  const selectedTool = useToolStore((state) => state.selectedTool)
  const setSelectedTool = useToolStore((state) => state.setSelectedTool)
  const eraserSize = useCanvasStore((state) => state.eraserSize)
  const setEraserSize = useCanvasStore((state) => state.setEraserSize)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const handleEraserClick = () => {
    setSelectedTool('eraser')
  }

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value)
    setEraserSize(newSize)
  }

  return (
    <div 
      className="eraser-container"
      onMouseEnter={() => setIsMenuOpen(true)}
      onMouseLeave={() => setIsMenuOpen(false)}
    >
      <div 
        className={`eraser-display ${selectedTool === 'eraser' ? 'active' : ''}`}
        onClick={handleEraserClick}
      >
        <FaEraser size={24} />
      </div>
      <div className={`eraser-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-section">
          <div className="menu-header">
            <span>大小</span>
            <span className="size-value">{eraserSize}px</span>
          </div>
          <div className="slider-container">
            <input
              type="range"
              min={CANVAS_CONFIG.ERASER_MIN_SIZE}
              max={CANVAS_CONFIG.ERASER_MAX_SIZE}
              value={eraserSize}
              onChange={handleSizeChange}
              className="eraser-slider"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Eraser
