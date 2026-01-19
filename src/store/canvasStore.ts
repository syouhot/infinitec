import { create } from 'zustand'

interface CanvasState {
  currentColor: string
  currentLineWidth: number
  eraserSize: number
  setColor: (color: string) => void
  setLineWidth: (width: number) => void
  setEraserSize: (size: number) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  currentColor: '#ffffff',
  currentLineWidth: 2,
  eraserSize: 20,
  setColor: (color) => set({ currentColor: color }),
  setLineWidth: (width) => set({ currentLineWidth: width }),
  setEraserSize: (size) => set({ eraserSize: size })
}))
