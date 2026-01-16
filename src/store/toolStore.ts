import { create } from 'zustand'

interface ToolState {
  selectedTool: string
  setSelectedTool: (tool: string) => void
}

export const useToolStore = create<ToolState>((set) => ({
  selectedTool: 'pencil',
  setSelectedTool: (tool) => set({ selectedTool: tool })
}))
