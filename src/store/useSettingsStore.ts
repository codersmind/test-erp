import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import type { TaxSettings } from '../utils/taxSettings'
import { getTaxSettings, setTaxSettings } from '../utils/taxSettings'
import type { UnitSettings } from '../utils/unitSettings'
import { getUnitSettings, setUnitSettings } from '../utils/unitSettings'

interface SettingsState {
  taxSettings: TaxSettings | null
  unitSettings: UnitSettings | null
  isLoading: boolean
  loadSettings: () => Promise<void>
  updateTaxSettings: (settings: TaxSettings) => Promise<void>
  updateUnitSettings: (settings: UnitSettings) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  subscribeWithSelector((set) => ({
    taxSettings: null,
    unitSettings: null,
    isLoading: false,

    loadSettings: async () => {
      set({ isLoading: true })
      try {
        const [taxSettings, unitSettings] = await Promise.all([
          getTaxSettings(),
          getUnitSettings(),
        ])
        set({ taxSettings, unitSettings, isLoading: false })
      } catch (error) {
        console.error('Failed to load settings', error)
        set({ isLoading: false })
      }
    },

    updateTaxSettings: async (settings: TaxSettings) => {
      await setTaxSettings(settings)
      set({ taxSettings: settings })
    },

    updateUnitSettings: async (settings: UnitSettings) => {
      await setUnitSettings(settings)
      set({ unitSettings: settings })
    },
  })),
)

