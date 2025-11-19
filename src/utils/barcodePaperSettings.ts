import { get, set } from 'idb-keyval'

export interface BarcodePaperSize {
  id: string
  name: string
  width: number // in mm
  height: number // in mm
  cols: number // number of columns in grid
  rows: number // number of rows in grid
  labelWidth: number // individual label width in mm
  labelHeight: number // individual label height in mm
}

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF14' | 'MSI' | 'pharmacode' | 'codabar'

export interface BarcodePaperSettings {
  paperSizes: BarcodePaperSize[]
  defaultFormat: BarcodeFormat
}

const BARCODE_PAPER_SETTINGS_KEY = 'erp_barcode_paper_settings'

const DEFAULT_PAPER_SIZES: BarcodePaperSize[] = [
  {
    id: 'a4',
    name: 'A4 Sheet (3x8)',
    width: 210,
    height: 297,
    cols: 3,
    rows: 8,
    labelWidth: 63,
    labelHeight: 33,
  },
  {
    id: 'label-50x30',
    name: 'Single Label 50mm x 30mm',
    width: 50,
    height: 30,
    cols: 1,
    rows: 1,
    labelWidth: 50,
    labelHeight: 30,
  },
  {
    id: 'label-40x20',
    name: 'Single Label 40mm x 20mm',
    width: 40,
    height: 20,
    cols: 1,
    rows: 1,
    labelWidth: 40,
    labelHeight: 20,
  },
  {
    id: 'label-30x20',
    name: 'Single Label 30mm x 20mm',
    width: 30,
    height: 20,
    cols: 1,
    rows: 1,
    labelWidth: 30,
    labelHeight: 20,
  },
]

const DEFAULT_SETTINGS: BarcodePaperSettings = {
  paperSizes: DEFAULT_PAPER_SIZES,
  defaultFormat: 'CODE128',
}

export const getBarcodePaperSettings = async (): Promise<BarcodePaperSettings> => {
  const settings = await get<BarcodePaperSettings>(BARCODE_PAPER_SETTINGS_KEY)
  if (!settings) {
    // Initialize with defaults
    await set(BARCODE_PAPER_SETTINGS_KEY, DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  // Merge with defaults to ensure all default sizes are present
  const mergedSizes = [...DEFAULT_PAPER_SIZES]
  settings.paperSizes.forEach((customSize) => {
    const defaultIndex = mergedSizes.findIndex((s) => s.id === customSize.id)
    if (defaultIndex >= 0) {
      mergedSizes[defaultIndex] = customSize
    } else {
      mergedSizes.push(customSize)
    }
  })
  return { 
    paperSizes: mergedSizes,
    defaultFormat: settings.defaultFormat || 'CODE128',
  }
}

export const setBarcodePaperSettings = async (settings: BarcodePaperSettings): Promise<void> => {
  await set(BARCODE_PAPER_SETTINGS_KEY, settings)
}

export const addBarcodePaperSize = async (paperSize: Omit<BarcodePaperSize, 'id'>): Promise<BarcodePaperSize> => {
  const settings = await getBarcodePaperSettings()
  const { nanoid } = await import('nanoid')
  const newPaperSize: BarcodePaperSize = {
    ...paperSize,
    id: nanoid(),
  }
  const updatedSettings: BarcodePaperSettings = {
    ...settings,
    paperSizes: [...settings.paperSizes, newPaperSize],
  }
  await setBarcodePaperSettings(updatedSettings)
  return newPaperSize
}

export const updateBarcodePaperSize = async (id: string, paperSize: Partial<Omit<BarcodePaperSize, 'id'>>): Promise<void> => {
  const settings = await getBarcodePaperSettings()
  const updatedSizes = settings.paperSizes.map((s) => (s.id === id ? { ...s, ...paperSize } : s))
  const updatedSettings: BarcodePaperSettings = {
    ...settings,
    paperSizes: updatedSizes,
  }
  await setBarcodePaperSettings(updatedSettings)
}

export const deleteBarcodePaperSize = async (id: string): Promise<void> => {
  const settings = await getBarcodePaperSettings()
  // Don't allow deleting default sizes
  const defaultIds = DEFAULT_PAPER_SIZES.map((s) => s.id)
  if (defaultIds.includes(id)) {
    throw new Error('Cannot delete default paper sizes')
  }
  const updatedSizes = settings.paperSizes.filter((s) => s.id !== id)
  const updatedSettings: BarcodePaperSettings = {
    ...settings,
    paperSizes: updatedSizes,
  }
  await setBarcodePaperSettings(updatedSettings)
}

export const getBarcodePaperSize = async (id: string): Promise<BarcodePaperSize | null> => {
  const settings = await getBarcodePaperSettings()
  return settings.paperSizes.find((s) => s.id === id) || null
}

export const setBarcodeFormat = async (format: BarcodeFormat): Promise<void> => {
  const settings = await getBarcodePaperSettings()
  const updatedSettings: BarcodePaperSettings = {
    ...settings,
    defaultFormat: format,
  }
  await setBarcodePaperSettings(updatedSettings)
}

