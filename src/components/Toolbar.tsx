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
import { message } from 'antd'
import { useToolStore, useCanvasStore } from '../store'
import { buildApiUrl } from '../services/apiConfig'
import '../styles/Toolbar.css'

function Toolbar() {
    const [isOpen, setIsOpen] = useState(false)
    const selectedTool = useToolStore((state) => state.selectedTool)
    const setSelectedTool = useToolStore((state) => state.setSelectedTool)
    const setCurrentImage = useCanvasStore((state) => state.setCurrentImage)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const formData = new FormData()
        formData.append('image', file)

        try {
          const response = await fetch(buildApiUrl('/api/upload'), {
            method: 'POST',
            body: formData
          })

          if (!response.ok) {
            throw new Error('Upload failed')
          }

          const data = await response.json()
          const img = new Image()
          img.crossOrigin = "Anonymous"
          img.onload = () => {
            setCurrentImage(img)
            setSelectedTool('image')
          }
          img.src = data.url
        } catch (error) {
          console.error('Image upload failed:', error)
          message.error('图片上传失败，请重试')
        }
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
        style={{ display: 'none' }}
        accept="image/*"
      />
    </div>
  )
}

export default Toolbar
