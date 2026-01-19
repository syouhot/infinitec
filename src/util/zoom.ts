interface ZoomState {
  scale: number
  offset: { x: number, y: number }
}

interface ZoomConfig {
  maxScale: number
  minScale: number
  zoomStep: number
}

interface ZoomResult {
  newScale: number
  newOffset: { x: number, y: number }
}

export const handleZoom = (
  currentState: ZoomState,
  deltaY: number,
  mouseX: number,
  mouseY: number,
  screenWidth: number,
  screenHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  config: ZoomConfig,
  boundary: { minX: number, maxX: number, minY: number, maxY: number }
): ZoomResult => {
  const delta = deltaY > 0 ? -config.zoomStep : config.zoomStep
  const newScale = Math.max(config.minScale, Math.min(config.maxScale, currentState.scale + delta))
  
  const scaleRatio = newScale / currentState.scale
  
  const newOffset = {
    x: (mouseX - screenWidth / 2) * (1 - scaleRatio) + currentState.offset.x * scaleRatio,
    y: (mouseY - screenHeight / 2) * (1 - scaleRatio) + currentState.offset.y * scaleRatio
  }
  
  const scaledCanvasWidth = canvasWidth * newScale
  const scaledCanvasHeight = canvasHeight * newScale
  
  const maxOffsetX = (scaledCanvasWidth - screenWidth) / 2
  const maxOffsetY = (scaledCanvasHeight - screenHeight) / 2
  
  const minX = Math.min(0, -maxOffsetX)
  const maxX = Math.max(0, maxOffsetX)
  const minY = Math.min(0, -maxOffsetY)
  const maxY = Math.max(0, maxOffsetY)
  
  const clampedOffset = {
    x: Math.max(minX, Math.min(maxX, newOffset.x)),
    y: Math.max(minY, Math.min(maxY, newOffset.y))
  }
  
  return {
    newScale,
    newOffset: clampedOffset
  }
}
