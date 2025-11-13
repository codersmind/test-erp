import { useEffect } from 'react'

import { useSettingsStore } from '../store/useSettingsStore'
import { initializeOrderNumbers } from '../utils/orderIdSettings'

export const SettingsInitializer = () => {
  const loadSettings = useSettingsStore((state) => state.loadSettings)

  useEffect(() => {
    loadSettings()
    // Initialize order numbers from existing orders on app startup
    initializeOrderNumbers().catch(console.error)
  }, [loadSettings])

  return null
}

