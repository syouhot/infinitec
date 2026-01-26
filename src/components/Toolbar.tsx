import { useState, useRef } from 'react'
import React from 'react'
import { 
  FaPencil, 
  FaRegSquare, 
  FaRegCircle, 
  FaMinus, 
  FaArrowRight, 
  FaDrawPolygon, 
  FaFont,
  FaEraser,
  FaImage
} from 'react-icons/fa6'
import { useToolStore, useCanvasStore } from '../store'
import '../styles/Toolbar.css'

function Toolbar() {
    const [isOpen, setIsOpen] = useState(false)
    const selectedTool = useToolStore((state) => state.selectedTool)
    const setSelectedTool = useToolStore((state) => state.setSelectedTool)
    const setCurrentImage = useCanvasStore((state) => state.setCurrentImage)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            setCurrentImage(img)
            setSelectedTool('image')
          }
          img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
      }
      e.target.value = ''
    }

    const tools = [
    { id: 'pencil', icon: FaPencil, label: '画笔' },
    { id: 'rectangle', icon: FaRegSquare, label: '矩形' },
    { id: 'circle', icon: FaRegCircle, label: '圆形' },
    { id: 'line', icon: FaMinus, label: '直线' },
    { id: 'arrow', icon: FaArrowRight, label: '箭头' },
    { id: 'polygon', icon: FaDrawPolygon, label: '多边形' },
    { id: 'text', icon: FaFont, label: '文本' },
    { id: 'eraser', icon: FaEraser, label: '橡皮擦' },
    { id: 'image', icon: FaImage, label: '图片' }
  ]

  return (
    <div className="toolbar-container">
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
            onClick={() => {
              if (tool.id === 'image') {
                fileInputRef.current?.click()
              } else {
                setSelectedTool(tool.id)
              }
            }}
            title={tool.label}
          >
            <tool.icon size={20} />
            <span className="tool-tooltip">{tool.label}</span>
          </button>
        ))}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/jpg"
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default Toolbar
