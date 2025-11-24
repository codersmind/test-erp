import { get, set } from 'idb-keyval'

const INTEGRATION_SETTINGS_KEY = 'integration_settings'

export interface IntegrationSettings {
  // Reserved for future integrations
}

const defaultSettings: IntegrationSettings = {}

export const getIntegrationSettings = async (): Promise<IntegrationSettings> => {
  try {
    const settings = await get<IntegrationSettings>(INTEGRATION_SETTINGS_KEY)
    return settings || defaultSettings
  } catch (error) {
    console.error('Error loading integration settings:', error)
    return defaultSettings
  }
}

export const setIntegrationSettings = async (settings: IntegrationSettings): Promise<void> => {
  try {
    await set(INTEGRATION_SETTINGS_KEY, settings)
  } catch (error) {
    console.error('Error saving integration settings:', error)
    throw error
  }
}


