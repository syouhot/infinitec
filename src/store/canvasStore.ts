import { create } from 'zustand'
import { colors } from '../constants'

interface CanvasState {
  currentColor: string
  currentLineWidth: number
  currentLineDash: number[]
  currentArrowType: 'standard' | 'double' | 'solid' | 'solid-double'
  currentFontSize: number
  eraserSize: number
  setColor: (data: number|string) => void
  setLineWidth: (width: number) => void
  setLineDash: (dash: number[]) => void
  setArrowType: (type: 'standard' | 'double' | 'solid' | 'solid-double') => void
  setFontSize: (size: number) => void
  setEraserSize: (size: number) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  currentColor: '#ffffff',
  currentLineWidth: 2,
  currentLineDash: [],
  currentArrowType: 'standard',
  currentFontSize: 20,
  eraserSize: 50,
  setColor: (data: number|string) => set({ currentColor: typeof data === 'number' ? colors[data] : data }),
  setLineWidth: (width) => set({ currentLineWidth: width }),
  setLineDash: (dash) => set({ currentLineDash: dash }),
  setArrowType: (type) => set({ currentArrowType: type }),
  setFontSize: (size) => set({ currentFontSize: size }),
  setEraserSize: (size) => set({ eraserSize: size })
}))
