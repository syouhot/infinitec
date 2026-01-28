import { create } from 'zustand'
import { colors } from '../constants'

interface CanvasState {
  currentColor: string
  currentLineWidth: number
  currentLineDash: number[]
  currentArrowType: 'standard' | 'double' | 'solid' | 'solid-double'
  currentFontSize: number
  eraserSize: number
  currentImage: HTMLImageElement | null
  broadcastLocationTrigger: number
  layerOrder: string[]
  hiddenLayerIds: string[]
  activeUserIds: string[]
  onlineUsers: { userId: string, userName: string }[]
  theme: 'default' | 'dark' | 'light'
  setColor: (data: number|string) => void
  setTheme: (theme: 'default' | 'dark' | 'light') => void
  setLineWidth: (width: number) => void
  setLineDash: (dash: number[]) => void
  setArrowType: (type: 'standard' | 'double' | 'solid' | 'solid-double') => void
  setFontSize: (size: number) => void
  setEraserSize: (size: number) => void
  setCurrentImage: (image: HTMLImageElement | null) => void
  triggerLocationBroadcast: () => void
  setLayerOrder: (order: string[]) => void
  toggleLayerVisibility: (id: string) => void
  setActiveUserIds: (ids: string[]) => void
  setOnlineUsers: (users: { userId: string, userName: string }[]) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  currentColor: '#ffffff',
  currentLineWidth: 2,
  currentLineDash: [],
  currentArrowType: 'standard',
  currentFontSize: 20,
  eraserSize: 50,
  currentImage: null,
  broadcastLocationTrigger: 0,
  layerOrder: [],
  hiddenLayerIds: [],
  activeUserIds: ['local'],
  onlineUsers: [],
  theme: 'default',
  setColor: (data: number|string) => set({ currentColor: typeof data === 'number' ? colors[data] : data }),
  setTheme: (theme) => set({ theme }),
  setLineWidth: (width) => set({ currentLineWidth: width }),
  setLineDash: (dash) => set({ currentLineDash: dash }),
  setArrowType: (type) => set({ currentArrowType: type }),
  setFontSize: (size) => set({ currentFontSize: size }),
  setEraserSize: (size) => set({ eraserSize: size }),
  setCurrentImage: (image) => set({ currentImage: image }),
  triggerLocationBroadcast: () => set({ broadcastLocationTrigger: Date.now() }),
  setLayerOrder: (order) => set({ layerOrder: order }),
  toggleLayerVisibility: (id) => set((state) => {
    const isHidden = state.hiddenLayerIds.includes(id);
    return {
      hiddenLayerIds: isHidden
        ? state.hiddenLayerIds.filter(hid => hid !== id)
        : [...state.hiddenLayerIds, id]
    };
  }),
  setActiveUserIds: (ids) => set({ activeUserIds: ids }),
  setOnlineUsers: (users) => set({ onlineUsers: users })
}))
