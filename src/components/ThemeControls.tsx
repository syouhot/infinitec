import { useState } from 'react';
import '../styles/CanvasMenu.css';

interface ThemeControlsProps {
  onThemeChange?: (theme: 'default' | 'dark' | 'light') => void;
  defaultValue?: 'default' | 'dark' | 'light';
  style?: React.CSSProperties;
}

function ThemeControls({ onThemeChange, defaultValue = 'default', style = {} }: ThemeControlsProps) {
  const [currentTheme, setCurrentTheme] = useState<'default' | 'dark' | 'light'>(defaultValue);

  const handleThemeChange = (theme: 'default' | 'dark' | 'light') => {
    setCurrentTheme(theme);
    
    // 移除之前的主题类
    document.body.classList.remove('canvas-bg-dark', 'canvas-bg-light');
    
    // 如果不是默认主题，添加对应的主题类
    if (theme !== 'default') {
      document.body.classList.add(`canvas-bg-${theme}`);
    }
    
    // 如果提供了回调，通知主题变化
    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  return (
    <div className="theme-options" style={style}>
      <span>主题:</span>
      <div className="theme-buttons">
        <button 
          className={`theme-btn ${currentTheme === 'default' ? 'active' : ''}`} 
          data-theme="default"
          onClick={() => handleThemeChange('default')}
        >
          默认
        </button>
        <button 
          className={`theme-btn ${currentTheme === 'dark' ? 'active' : ''}`} 
          data-theme="dark"
          onClick={() => handleThemeChange('dark')}
        >
          黑色
        </button>
        <button 
          className={`theme-btn ${currentTheme === 'light' ? 'active' : ''}`} 
          data-theme="light"
          onClick={() => handleThemeChange('light')}
        >
          白色
        </button>
      </div>
    </div>
  );
}

export default ThemeControls;