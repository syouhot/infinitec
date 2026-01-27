export const HEARTBEAT_INTERVAL = 10

export const MAX_FAILED_HEARTBEATS = 3
export const AUTO_SAVE_INTERVAL_MINUTES = 1

export const colors = [
  '#ffffff',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00'
]
export const diyColors = [
  '#ff00ff',
  '#00ffff',
  '#ffa500',
  '#800080',
  '#808080'
]
export const CANVAS_CONFIG = {
  // 建议保持在 3 左右。设置为 6 或更大会导致 Chrome 下显存占用过高（约 200MB+），
  // 触发 GPU 纹理交换或降级为软件渲染，导致明显卡顿。
  CANVAS_SCALE_MULTIPLIER: 2,
  GRID_SIZE: 50,
  ERASER_MIN_SIZE: 10,
  ERASER_MAX_SIZE: 100,
  MAX_ZOOM_SCALE: 3,
  MIN_ZOOM_SCALE: 1 / 3,
  DEFAULT_ZOOM_SCALE: 2,
  ZOOM_STEP: 0.1
} as const

export const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 48, 50];
