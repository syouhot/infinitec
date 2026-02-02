import React, { useEffect, useState } from 'react'
import { useAppStore, useCanvasStore } from '../store'
import '../styles/ScreenshotOverlay.css'
import { message } from 'antd'
import { THEME_BACKGROUND_COLOR } from '../constants'
const ScreenshotOverlay: React.FC = () => {
  const isScreenshotMode = useAppStore((state) => state.isScreenshotMode)
  const setIsScreenshotMode = useAppStore((state) => state.setIsScreenshotMode)
  const [flash, setFlash] = useState(false)
  const theme = useCanvasStore((state) => state.theme)
  useEffect(() => {
    if (isScreenshotMode) {
      // 1. Wait for UI to fade out (0.5s)
      const captureTimer = setTimeout(async () => {
        // 2. Trigger Flash
        setFlash(true)
        
        // 3. Capture Screenshot
        try {
            // We use the browser's native capabilities to capture the canvas.
            // Since our canvas is the main content, we can just grab the data URL from the canvas element.
            // However, React structure separates CanvasMain. We need a way to access it.
            // A simple way is to use document.querySelector since there is only one main canvas.
            // Or better, expose a capture method from CanvasMain via store or ref.
            // Given the current architecture, querying the canvas element is the most direct way without major refactoring.
            // We need to target all canvases (layers) and composite them? 
            // Or just the visible ones. CanvasMain renders multiple canvases for layers.
            // Actually, CanvasMain renders a container with multiple canvases absolutely positioned.
            // We need to draw them all onto a temporary canvas.
            
            await captureAndSave()
            
        } catch (e) {
            console.error("Screenshot failed", e)
        }

        // 4. Reset Flash after short duration
        setTimeout(() => {
            setFlash(false)
            // 5. Restore UI (fade in)
            setIsScreenshotMode(false)
        }, 100) // Flash duration

      }, 500) // Wait for UI fade out

      return () => clearTimeout(captureTimer)
    }
  }, [isScreenshotMode, setIsScreenshotMode])

  const captureAndSave = async () => {
      try {
          const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
          if (!canvasContainer) {
              throw new Error('未找到画布容器');
          }

          const tempCanvas = document.createElement('canvas');
          const width = window.innerWidth;
          const height = window.innerHeight;
          // Set high resolution for retina displays
          const dpr = window.devicePixelRatio || 1;
          tempCanvas.width = width * dpr;
          tempCanvas.height = height * dpr;
          
          const ctx = tempCanvas.getContext('2d');
          if (!ctx) {
              throw new Error('无法创建画布上下文');
          }
          
          // Scale context to match dpr
          ctx.scale(dpr, dpr);

          // 1. Draw Background
          let bgColor = '#ffffff';
          let gridElement = document.querySelector('.grid-background') as HTMLElement | null;
          
          // Try to get actual background color from DOM
          if (gridElement) {
              const style = window.getComputedStyle(gridElement);
              // Check if color is not transparent (rgba(0,0,0,0) or transparent)
              if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
                  bgColor = style.backgroundColor;
              } else {
                  // Fallback to body background
                   const bodyStyle = window.getComputedStyle(document.body);
                   if (bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && bodyStyle.backgroundColor !== 'transparent') {
                       bgColor = bodyStyle.backgroundColor;
                   } else {
                       // Fallback based on theme
                       if (theme === 'default') bgColor = THEME_BACKGROUND_COLOR;
                       else if (theme === 'dark') bgColor = '#000000';
                       else bgColor = '#ffffff';
                   }
              }
          } else {
               // Fallback based on theme if grid not found
               if (theme === 'default') bgColor = THEME_BACKGROUND_COLOR;
               else if (theme === 'dark') bgColor = '#000000';
               else bgColor = '#ffffff';
          }
          
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, width, height);

          // 1.5 Draw Grid Lines (Only for Default Theme)
          if (theme === 'default' && gridElement) {
              const gridRect = gridElement.getBoundingClientRect();
              
              // Extract scale from transform matrix
              const computedStyle = window.getComputedStyle(gridElement);
              const matrix = new DOMMatrix(computedStyle.transform);
              const scale = matrix.a; // Scale X
              
              const gridSize = 25 * scale;
              let gridColor = 'rgba(128, 128, 128, 0.3)';

              // Try to parse color from computed style to match current grid color
              const bgImage = window.getComputedStyle(gridElement).backgroundImage;
              if (bgImage && bgImage !== 'none') {
                  // Extract the first color occurrence (rgba, rgb, or hex)
                  // The background-image is typically: linear-gradient(color 1px, transparent 1px), ...
                  const match = bgImage.match(/rgba?\([^)]+\)|#[a-fA-F0-9]{3,8}/);
                  if (match) {
                      gridColor = match[0];
                  }
              }
              
              ctx.strokeStyle = gridColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              
              // Calculate start positions to ensure lines align with the visual grid
              // gridRect.left is the visual start of the grid element container
              // The pattern repeats from (0,0) of the element.
              
              // Vertical Lines
              const startX = gridRect.left;
              // We need to draw lines from 0 to width, aligned with startX + N * gridSize
              // Find first line index that is visible (>= 0)
              // startX + N * gridSize >= 0  =>  N * gridSize >= -startX  =>  N >= -startX / gridSize
              const startN_X = Math.floor(-startX / gridSize);
              // Ensure we cover the whole screen, start slightly before 0 just in case
              for (let x = startX + startN_X * gridSize; x < width; x += gridSize) {
                  if (x >= 0) { // Only draw if within viewport
                       // Move to half-pixel to keep lines crisp? Canvas usually handles this.
                       ctx.moveTo(x, 0);
                       ctx.lineTo(x, height);
                  }
              }
              
              // Horizontal Lines
              const startY = gridRect.top;
              const startN_Y = Math.floor(-startY / gridSize);
              for (let y = startY + startN_Y * gridSize; y < height; y += gridSize) {
                  if (y >= 0) {
                      ctx.moveTo(0, y);
                      ctx.lineTo(width, y);
                  }
              }
              
              ctx.stroke();
          }

          // 2. Draw Canvases (Layers)
          // Query all canvas elements in the container
          const canvases = Array.from(canvasContainer.querySelectorAll('canvas'));
          
          if (canvases.length === 0) {
              console.warn('Screenshot: No canvas elements found inside .canvas-container');
          }

          // Sort by z-index to ensure correct stacking order
          // We use computed style because z-index might be inline or from class
          canvases.sort((a, b) => {
              const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
              const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;
              return zA - zB;
          });

          let drawnCount = 0;
          canvases.forEach(canvas => {
              const rect = canvas.getBoundingClientRect();
              
              // Only draw if it's visible in viewport
              if (
                  rect.right > 0 &&
                  rect.bottom > 0 &&
                  rect.left < width &&
                  rect.top < height
              ) {
                  // Draw using the screen coordinates
                  // getBoundingClientRect returns coordinates relative to viewport
                  // which matches our tempCanvas coordinate system (0,0 is top-left of screen)
                  ctx.drawImage(
                      canvas, 
                      rect.left, 
                      rect.top, 
                      rect.width, 
                      rect.height
                  );
                  drawnCount++;
              }
          });
          
          console.log(`Screenshot: Composited ${drawnCount} canvas layers.`);

          // 3. Convert and Download
          const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
          
          const link = document.createElement('a');
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
          link.download = `screenshot-${dateStr}.jpg`;
          link.href = dataUrl;
          link.click();
          
          message.success('截屏已保存');
      } catch (error) {
          console.error('Screenshot capture error:', error);
          throw error; // Re-throw to be caught by the effect
      }
  }

  if (!isScreenshotMode && !flash) return null

  return (
    <div className={`screenshot-flash ${flash ? 'active' : ''}`} />
  )
}

export default ScreenshotOverlay
