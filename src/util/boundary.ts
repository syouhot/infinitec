interface Boundary {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface Position {
  x: number
  y: number
}

export const createBoundary = (canvasWidth: number, canvasHeight: number, windowWidth: number, windowHeight: number): Boundary => {
  const paddingX = (canvasWidth - windowWidth) / 2
  const paddingY = (canvasHeight - windowHeight) / 2
  
  return {
    minX: -paddingX,
    maxX: paddingX,
    minY: -paddingY,
    maxY: paddingY
  }
}

export const clampOffset = (
  currentOffset: Position,
  delta: Position,
  boundary: Boundary
): Position => {
  const newX = currentOffset.x + delta.x
  const newY = currentOffset.y + delta.y
  
  return {
    x: Math.max(boundary.minX, Math.min(boundary.maxX, newX)),
    y: Math.max(boundary.minY, Math.min(boundary.maxY, newY))
  }
}

export const clampZoomScale = (
  currentScale: number,
  delta: number,
  maxScale: number,
  minScale: number,
  boundary: Boundary
): number => {
  const newScale = currentScale + delta
  
  if (newScale > maxScale) {
    return maxScale
  }
  
  if (newScale < minScale) {
    return minScale
  }
  
  return newScale
}

export const calculateClampedOffset = (
  currentOffset: Position,
  scale: number,
  canvasWidth: number,
  canvasHeight: number,
  windowWidth: number,
  windowHeight: number
): Position => {
  const scaledCanvasWidth = canvasWidth * scale
  const scaledCanvasHeight = canvasHeight * scale
  
  const maxOffsetX = (scaledCanvasWidth - windowWidth) / 2
  const maxOffsetY = (scaledCanvasHeight - windowHeight) / 2
  
  const minX = Math.min(0, -maxOffsetX)
  const maxX = Math.max(0, maxOffsetX)
  const minY = Math.min(0, -maxOffsetY)
  const maxY = Math.max(0, maxOffsetY)
  
  return {
    x: Math.max(minX, Math.min(maxX, currentOffset.x)),
    y: Math.max(minY, Math.min(maxY, currentOffset.y))
  }
}
