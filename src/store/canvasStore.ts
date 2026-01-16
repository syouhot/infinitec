import { create } from 'zustand'

interface CanvasState {
  currentColor: string
  currentLineWidth: number
  setColor: (color: string) => void
  setLineWidth: (width: number) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  currentColor: '#ffffff',
  currentLineWidth: 2,
  setColor: (color) => set({ currentColor: color }),
  setLineWidth: (width) => set({ currentLineWidth: width })
}))
