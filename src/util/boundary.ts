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
