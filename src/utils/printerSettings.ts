import { get, set } from 'idb-keyval'

export interface PrinterSettings {
  defaultPrinterName: string | null
  defaultPrinterDescription: string | null
}

const PRINTER_SETTINGS_KEY = 'printerSettings'

const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  defaultPrinterName: null,
  defaultPrinterDescription: null,
}

export const getPrinterSettings = async (): Promise<PrinterSettings> => {
  try {
    const settings = await get<PrinterSettings>(PRINTER_SETTINGS_KEY)
    return settings || DEFAULT_PRINTER_SETTINGS
  } catch (error) {
    console.error('Failed to get printer settings:', error)
    return DEFAULT_PRINTER_SETTINGS
  }
}

export const setPrinterSettings = async (settings: Partial<PrinterSettings>): Promise<void> => {
  try {
    const current = await getPrinterSettings()
    const updated = { ...current, ...settings }
    await set(PRINTER_SETTINGS_KEY, updated)
  } catch (error) {
    console.error('Failed to set printer settings:', error)
    throw error
  }
}

