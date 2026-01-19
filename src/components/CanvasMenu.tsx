import { useEffect, useState } from 'react'
import '../styles/CanvasMenu.css'
import { LuSlack } from "react-icons/lu";
import ZoomControls from './ZoomControls';

function CanvasIndex({ onBack, onZoomChange }: { onBack: () => void, onZoomChange?: (scale: number) => void }) {
  const [showBackButton, setShowBackButton] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBackButton(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  const [theme, setTheme] = useState<'default' | 'dark' | 'light'>('default');

  const handleThemeChange = (newTheme: 'default' | 'dark' | 'light') => {
    setTheme(newTheme);
    
    // 移除之前的主题类
    document.body.classList.remove('canvas-bg-dark', 'canvas-bg-light');
    
    // 如果不是默认主题，添加对应的主题类
    if (newTheme !== 'default') {
      document.body.classList.add(`canvas-bg-${newTheme}`);
    }
  };

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
            <ZoomControls onZoomChange={onZoomChange} />
            <div className="theme-options">
              <span>主题:</span>
              <div className="theme-buttons">
                <button 
                  className={`theme-btn ${theme === 'default' ? 'active' : ''}`} 
                  data-theme="default"
                  onClick={() => handleThemeChange('default')}
                >
                  默认
                </button>
                <button 
                  className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} 
                  data-theme="dark"
                  onClick={() => handleThemeChange('dark')}
                >
                  黑色
                </button>
                <button 
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`} 
                  data-theme="light"
                  onClick={() => handleThemeChange('light')}
                >
                  白色
                </button>
              </div>
            </div>
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