import { get, set } from 'idb-keyval'

const INTEGRATION_SETTINGS_KEY = 'integration_settings'

export interface WhatsAppSettings {
  enabled: boolean
  sessionPath?: string
  isConnected: boolean
  qrCode?: string
  phoneNumber?: string
  messageTemplate?: string
}

export interface IntegrationSettings {
  whatsapp: WhatsAppSettings
}

const defaultSettings: IntegrationSettings = {
  whatsapp: {
    enabled: false,
    isConnected: false,
    messageTemplate: 'Hello {{customerName}},\n\nYour invoice #{{invoiceNumber}} for ₹{{total}} is ready.\n\nThank you for your business!',
  },
}

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

export const updateWhatsAppSettings = async (updates: Partial<WhatsAppSettings>): Promise<void> => {
  const settings = await getIntegrationSettings()
  settings.whatsapp = { ...settings.whatsapp, ...updates }
  await setIntegrationSettings(settings)
}


