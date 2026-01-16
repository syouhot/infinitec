import { create } from 'zustand'

interface AppState {
  isDrawingMode: boolean
  setIsDrawingMode: (mode: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isDrawingMode: false,
  setIsDrawingMode: (mode) => set({ isDrawingMode: mode })
}))
