import { useEffect } from 'react'

import { useSettingsStore } from '../store/useSettingsStore'

export const SettingsInitializer = () => {
  const loadSettings = useSettingsStore((state) => state.loadSettings)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return null
}

