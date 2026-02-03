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
      // 1. 等待 UI 淡出 (0.5秒)
      const captureTimer = setTimeout(async () => {
        // 2. 触发闪光效果
        setFlash(true)
        
        // 3. 截取屏幕
        try {
            await captureAndSave()
            
        } catch (e) {
            console.error("Screenshot failed", e)
        }

        // 4. 短暂停留后重置闪光
        setTimeout(() => {
            setFlash(false)
            // 5. 恢复 UI (淡入)
            setIsScreenshotMode(false)
        }, 100) // 闪光持续时间

      }, 500) // 等待 UI 淡出

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
          // 为视网膜显示器设置高分辨率
          const dpr = window.devicePixelRatio || 1;
          tempCanvas.width = width * dpr;
          tempCanvas.height = height * dpr;
          
          const ctx = tempCanvas.getContext('2d');
          if (!ctx) {
              throw new Error('无法创建画布上下文');
          }
          
          // 缩放上下文以匹配 DPR
          ctx.scale(dpr, dpr);

          // 1. 绘制背景
          let bgColor = '#ffffff';
          let gridElement = document.querySelector('.grid-background') as HTMLElement | null;
          
          // 尝试从 DOM 获取实际背景颜色
          if (gridElement) {
              const style = window.getComputedStyle(gridElement);
              // 检查颜色是否不透明 (rgba(0,0,0,0) 或 transparent)
              if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
                  bgColor = style.backgroundColor;
              } else {
                  // 回退到 body 背景
                   const bodyStyle = window.getComputedStyle(document.body);
                   if (bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && bodyStyle.backgroundColor !== 'transparent') {
                       bgColor = bodyStyle.backgroundColor;
                   } else {
                       // 根据主题回退
                       if (theme === 'default') bgColor = THEME_BACKGROUND_COLOR;
                       else if (theme === 'dark') bgColor = '#000000';
                       else bgColor = '#ffffff';
                   }
              }
          } else {
               // 如果找不到网格，根据主题回退
               if (theme === 'default') bgColor = THEME_BACKGROUND_COLOR;
               else if (theme === 'dark') bgColor = '#000000';
               else bgColor = '#ffffff';
          }
          
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, width, height);

          // 1.5 绘制网格线 (仅限默认主题)
          if (theme === 'default' && gridElement) {
              const gridRect = gridElement.getBoundingClientRect();
              
              // 从变换矩阵中提取缩放比例
              const computedStyle = window.getComputedStyle(gridElement);
              const matrix = new DOMMatrix(computedStyle.transform);
              const scale = matrix.a; // X轴缩放
              
              const gridSize = 25 * scale;
              let gridColor = 'rgba(128, 128, 128, 0.3)';

              // 尝试从计算样式中解析颜色以匹配当前网格颜色
              const bgImage = window.getComputedStyle(gridElement).backgroundImage;
              if (bgImage && bgImage !== 'none') {
                  // 提取第一个出现的颜色 (rgba, rgb 或 hex)
                  // 背景图像通常是: linear-gradient(color 1px, transparent 1px), ...
                  const match = bgImage.match(/rgba?\([^)]+\)|#[a-fA-F0-9]{3,8}/);
                  if (match) {
                      gridColor = match[0];
                  }
              }
              
              ctx.strokeStyle = gridColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              
              // 计算起始位置以确保线条与视觉网格对齐
              // gridRect.left 是网格元素容器的视觉起始点
              // 图案从元素的 (0,0) 开始重复
              
              // 垂直线
              const startX = gridRect.left;
              // 我们需要从 0 到 width 绘制线条，与 startX + N * gridSize 对齐
              // 找到第一个可见的线条索引 (>= 0)
              // startX + N * gridSize >= 0  =>  N * gridSize >= -startX  =>  N >= -startX / gridSize
              const startN_X = Math.floor(-startX / gridSize);
              // 确保覆盖整个屏幕，以防万一从稍早于 0 的位置开始
              for (let x = startX + startN_X * gridSize; x < width; x += gridSize) {
                  if (x >= 0) { // 仅在视口内绘制
                       // 移动到半像素以保持线条清晰？Canvas 通常会自动处理。
                       ctx.moveTo(x, 0);
                       ctx.lineTo(x, height);
                  }
              }
              
              // 水平线
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

          // 2. 绘制画布 (图层)
          // 查询容器内的所有 canvas 元素
          const canvases = Array.from(canvasContainer.querySelectorAll('canvas'));
          
          if (canvases.length === 0) {
              console.warn('Screenshot: No canvas elements found inside .canvas-container');
          }

          // 按 z-index 排序以确保正确的堆叠顺序
          // 我们使用计算样式，因为 z-index 可能来自内联样式或类
          canvases.sort((a, b) => {
              const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
              const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;
              return zA - zB;
          });

          let drawnCount = 0;
          canvases.forEach(canvas => {
              const rect = canvas.getBoundingClientRect();
              
              // 仅绘制视口中可见的部分
              if (
                  rect.right > 0 &&
                  rect.bottom > 0 &&
                  rect.left < width &&
                  rect.top < height
              ) {
                  // 使用屏幕坐标绘制
                  // getBoundingClientRect 返回相对于视口的坐标
                  // 这与我们的 tempCanvas 坐标系匹配 (0,0 是屏幕左上角)
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

          // 3. 转换并下载
          const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
          
          const link = document.createElement('a');
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
          link.download = `screenshot-${dateStr}.jpg`;
          link.href = dataUrl;
          link.click();
          
          message.success('截屏已保存');
      } catch (error) {
          console.error('Screenshot capture error:', error);
          throw error; // 重新抛出以被效果捕获
      }
  }

  if (!isScreenshotMode && !flash) return null

  return (
    <div className={`screenshot-flash ${flash ? 'active' : ''}`} />
  )
}

export default ScreenshotOverlay
