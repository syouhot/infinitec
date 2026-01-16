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
import '../styles/Toolbar.css'

interface ToolbarProps {
    onToolSelect: (tool: string) => void
    selectedTool: string
}

function Toolbar({ onToolSelect, selectedTool }: ToolbarProps) {
    const [isOpen, setIsOpen] = useState(false)

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

  return (
    <div className="toolbar-container">
      <div className="selected-tool-display">
        {React.createElement(selectedToolIcon, { size: 24 })}
      </div>
      <div 
        className="toolbar-indicator"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`indicator-line ${isOpen ? 'open' : ''}`}></div>
      </div>
      <div className={`toolbar-panel ${isOpen ? 'open' : ''}`}>
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`tool-button ${selectedTool === tool.id ? 'active' : ''}`}
            onClick={() => onToolSelect(tool.id)}
            title={tool.label}
          >
            <tool.icon size={20} />
            <span className="tool-tooltip">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Toolbar
