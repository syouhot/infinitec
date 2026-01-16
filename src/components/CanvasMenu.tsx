import { useEffect, useState } from 'react'
import '../styles/CanvasMenu.css'
import { LuSlack } from "react-icons/lu";
function CanvasIndex({ onBack }: { onBack: () => void }) {
  const [showBackButton, setShowBackButton] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBackButton(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showBackButton && (
        <div 
          className="menu-container"
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <div className="menu-icon">
            <LuSlack size={30} />
          </div>
          <div className={`menu-dropdown ${isMenuOpen ? 'open' : ''}`}>
            <button className="back-button" onClick={onBack}>
              ← 退出
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default CanvasIndex