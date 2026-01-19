import { useState } from 'react';
import '../styles/CanvasMenu.css';

interface ZoomControlsProps {
  onZoomChange?: (scale: number) => void;
  defaultValue?: number;
}

function ZoomControls({ onZoomChange, defaultValue = 1 }: ZoomControlsProps) {
  const [currentZoom, setCurrentZoom] = useState<number>(defaultValue);

  const handleZoomChange = (scale: number) => {
    setCurrentZoom(scale);
    if (onZoomChange) {
      onZoomChange(scale);
    }
  };

  return (
    <div className="zoom-options">
      <span>缩放:</span>
      <div className="zoom-buttons">
        <button 
          className={`zoom-btn ${currentZoom === 0.25 ? 'active' : ''}`} 
          onClick={() => handleZoomChange(0.25)}
        >
          0.25x
        </button>
        <button 
          className={`zoom-btn ${currentZoom === 0.5 ? 'active' : ''}`} 
          onClick={() => handleZoomChange(0.5)}
        >
          0.5x
        </button>
        <button 
          className={`zoom-btn ${currentZoom === 1 ? 'active' : ''}`} 
          onClick={() => handleZoomChange(1)}
        >
          1x
        </button>
        <button 
          className={`zoom-btn ${currentZoom === 1.5 ? 'active' : ''}`} 
          onClick={() => handleZoomChange(1.5)}
        >
          1.5x
        </button>
        <button 
          className={`zoom-btn ${currentZoom === 2 ? 'active' : ''}`} 
          onClick={() => handleZoomChange(2)}
        >
          2x
        </button>
      </div>
    </div>
  );
}

export default ZoomControls;