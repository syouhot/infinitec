import './App.css'
import Home from './components/Home'
import CanvasMenu from './components/CanvasMenu'
import Toolbar from './components/Toolbar'
import CanvasMain from './components/CanvasMain'
import CanvasModel from './components/CanvasModel'
import Eraser from './components/Eraser'
import { useAppStore, useToolStore, useCanvasStore } from './store'
import { DatabaseProvider } from './contexts/DatabaseContext'
import { AuthProvider } from './contexts/AuthContext'
import { websocketService } from './services/websocketService'

function App() {
  const isDrawingMode = useAppStore((state) => state.isDrawingMode)
  const setIsDrawingMode = useAppStore((state) => state.setIsDrawingMode)
  const setRoomId = useAppStore((state) => state.setRoomId)
  const setIsRoomOwner = useAppStore((state) => state.setIsRoomOwner)
  const selectedTool = useToolStore((state) => state.selectedTool)
  const currentColor = useCanvasStore((state) => state.currentColor)
  const currentLineWidth = useCanvasStore((state) => state.currentLineWidth)
  const eraserSize = useCanvasStore((state) => state.eraserSize)

  const handleDoubleClick = () => {
    setIsDrawingMode(true)
  }

  const handleExitDrawingMode = () => {
    setIsDrawingMode(false)
    setRoomId(null)
    setIsRoomOwner(false)
    websocketService.disconnect()
  }

  return (
    <AuthProvider>
      <DatabaseProvider>
        <div className={`app ${isDrawingMode ? 'drawing-mode' : ''}`}>
          <Home onDoubleClick={handleDoubleClick} isHidden={isDrawingMode} />
          {isDrawingMode && (
            <>
              <CanvasMain 
                selectedTool={selectedTool} 
                currentColor={currentColor}
                currentLineWidth={currentLineWidth}
                eraserSize={eraserSize}
              />
              <CanvasMenu onBack={handleExitDrawingMode} />
              <Toolbar />
              <CanvasModel />
              <Eraser />
            </>
          )}
        </div>
      </DatabaseProvider>
    </AuthProvider>
  )
}

export default App
