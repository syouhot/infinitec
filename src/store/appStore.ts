import { create } from 'zustand'

interface AppState {
  isDrawingMode: boolean
  setIsDrawingMode: (mode: boolean) => void
  roomId: string | null
  setRoomId: (roomId: string | null) => void
  isRoomOwner: boolean
  setIsRoomOwner: (isOwner: boolean) => void
  isScreenshotMode: boolean
  setIsScreenshotMode: (mode: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isDrawingMode: false,
  setIsDrawingMode: (mode) => set({ isDrawingMode: mode }),
  roomId: null,
  setRoomId: (roomId) => set({ roomId }),
  isRoomOwner: false,
  setIsRoomOwner: (isOwner) => set({ isRoomOwner: isOwner }),
  isScreenshotMode: false,
  setIsScreenshotMode: (mode) => set({ isScreenshotMode: mode })
}))
