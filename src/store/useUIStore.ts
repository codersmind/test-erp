import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  modals: {
    productEdit: boolean
    productQuickCreate: boolean
    customerQuickCreate: boolean
  }
  setModal: (modal: keyof UIState['modals'], open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  modals: {
    productEdit: false,
    productQuickCreate: false,
    customerQuickCreate: false,
  },
  setModal: (modal, open) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: open },
    })),
}))

