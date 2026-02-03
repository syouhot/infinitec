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
  FaImage,
  FaRotateLeft,
  FaRotateRight
} from 'react-icons/fa6'
import { useTranslation } from 'react-i18next'
import { message } from 'antd'
import { useToolStore, useCanvasStore } from '../store'
import { buildApiUrl } from '../services/apiConfig'
import '../styles/Toolbar.css'

interface ToolbarProps {
  onUndo?: () => void
  onRedo?: () => void
}

function Toolbar({ onUndo, onRedo }: ToolbarProps) {
    const { t } = useTranslation()
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
          message.error(t('toolbar.uploadFailed'))
        }
      }
      e.target.value = ''
    }

    const tools = [
    { id: 'pencil', icon: FaPencil, label: t('toolbar.pencil') },
    { id: 'rectangle', icon: FaRegSquare, label: t('toolbar.rectangle') },
    { id: 'circle', icon: FaRegCircle, label: t('toolbar.circle') },
    { id: 'line', icon: FaMinus, label: t('toolbar.line') },
    { id: 'arrow', icon: FaArrowRight, label: t('toolbar.arrow') },
    { id: 'polygon', icon: FaDrawPolygon, label: t('toolbar.polygon') },
    { id: 'text', icon: FaFont, label: t('toolbar.text') },
    { id: 'eraser', icon: FaEraser, label: t('toolbar.eraser') },
    { id: 'image', icon: FaImage, label: t('toolbar.image') }
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
        <div className="undo-redo-group">
          <button
            className="tool-button"
            onClick={onUndo}
            title={t('toolbar.undo')}
          >
            <FaRotateLeft size={20} />
            <span className="tool-tooltip">{t('toolbar.undo')}</span>
          </button>
          <button
            className="tool-button"
            onClick={onRedo}
            title={t('toolbar.redo')}
          >
            <FaRotateRight size={20} />
            <span className="tool-tooltip">{t('toolbar.redo')}</span>
          </button>
        </div>
        <div className="toolbar-divider"></div>
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
