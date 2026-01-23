import { create } from 'zustand'
import { colors } from '../constants'

interface CanvasState {
  currentColor: string
  currentLineWidth: number
  currentLineDash: number[]
  eraserSize: number
  setColor: (data: number|string) => void
  setLineWidth: (width: number) => void
  setLineDash: (dash: number[]) => void
  setEraserSize: (size: number) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  currentColor: '#ffffff',
  currentLineWidth: 2,
  currentLineDash: [],
  eraserSize: 50,
  setColor: (data: number|string) => set({ currentColor: typeof data === 'number' ? colors[data] : data }),
  setLineWidth: (width) => set({ currentLineWidth: width }),
  setLineDash: (dash) => set({ currentLineDash: dash }),
  setEraserSize: (size) => set({ eraserSize: size })
}))
