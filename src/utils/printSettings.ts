import { get, set } from 'idb-keyval'

export type PrintPaperSize = 'pos' | 'a4' | 'custom' | 'saved'

export interface CustomPrintFormat {
  id: string
  name: string
  width: number // in mm
  height: number // in mm
  fontSize: 'small' | 'medium' | 'large'
  showLogo: boolean
  logoUrl?: string
  companyName?: string
  companyGst?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  footerText?: string
}

export interface PrintSettings {
  defaultPaperSize: PrintPaperSize
  defaultFormatId?: string // ID of saved format if defaultPaperSize is 'saved'
  customWidth: number // in mm (legacy, for backward compatibility)
  customHeight: number // in mm (legacy, for backward compatibility)
  fontSize: 'small' | 'medium' | 'large'
  showLogo: boolean
  logoUrl?: string
  companyName?: string
  companyGst?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  footerText?: string
  savedFormats: CustomPrintFormat[] // Array of saved custom formats
}

const PRINT_SETTINGS_KEY = 'erp_print_settings'

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  defaultPaperSize: 'a4',
  customWidth: 80, // 80mm for thermal printers
  customHeight: 200, // 200mm
  fontSize: 'medium',
  showLogo: false,
  companyName: '',
  companyGst: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  footerText: 'Thank you for your business!',
  savedFormats: [],
}

export const getPrintSettings = async (): Promise<PrintSettings> => {
  const settings = await get<PrintSettings>(PRINT_SETTINGS_KEY)
  return settings ?? DEFAULT_PRINT_SETTINGS
}

export const setPrintSettings = async (settings: PrintSettings): Promise<void> => {
  await set(PRINT_SETTINGS_KEY, settings)
}

/**
 * Add a new custom print format
 */
export const addCustomFormat = async (format: Omit<CustomPrintFormat, 'id'>): Promise<CustomPrintFormat> => {
  const settings = await getPrintSettings()
  const { nanoid } = await import('nanoid')
  const newFormat: CustomPrintFormat = {
    ...format,
    id: nanoid(),
  }
  const updatedSettings: PrintSettings = {
    ...settings,
    savedFormats: [...(settings.savedFormats || []), newFormat],
  }
  await setPrintSettings(updatedSettings)
  return newFormat
}

/**
 * Update an existing custom print format
 */
export const updateCustomFormat = async (id: string, format: Partial<Omit<CustomPrintFormat, 'id'>>): Promise<void> => {
  const settings = await getPrintSettings()
  const updatedFormats = (settings.savedFormats || []).map((f) => (f.id === id ? { ...f, ...format } : f))
  const updatedSettings: PrintSettings = {
    ...settings,
    savedFormats: updatedFormats,
  }
  await setPrintSettings(updatedSettings)
}

/**
 * Delete a custom print format
 */
export const deleteCustomFormat = async (id: string): Promise<void> => {
  const settings = await getPrintSettings()
  const updatedFormats = (settings.savedFormats || []).filter((f) => f.id !== id)
  const updatedSettings: PrintSettings = {
    ...settings,
    savedFormats: updatedFormats,
    // If deleted format was the default, reset to a4
    defaultPaperSize: settings.defaultFormatId === id ? 'a4' : settings.defaultPaperSize,
    defaultFormatId: settings.defaultFormatId === id ? undefined : settings.defaultFormatId,
  }
  await setPrintSettings(updatedSettings)
}

/**
 * Get a custom format by ID
 */
export const getCustomFormat = async (id: string): Promise<CustomPrintFormat | null> => {
  const settings = await getPrintSettings()
  return (settings.savedFormats || []).find((f) => f.id === id) || null
}

/**
 * Get CSS for print based on paper size or saved format
 */
export const getPrintStyles = async (
  paperSize: PrintPaperSize,
  customWidth?: number,
  customHeight?: number,
  formatId?: string,
): Promise<string> => {
  // If using a saved format, get its dimensions
  if (paperSize === 'saved' && formatId) {
    const format = await getCustomFormat(formatId)
    if (format) {
      return getPrintStylesForDimensions(format.width, format.height, format.fontSize)
    }
  }
  
  // Use provided dimensions or fallback
  const width = customWidth || 80
  const height = customHeight || 200
  const fontSize = 'medium' // Default, can be enhanced later
  
  if (paperSize === 'pos') {
    return getPrintStylesForDimensions(80, 200, 'small')
  } else if (paperSize === 'a4') {
    return getPrintStylesForDimensions(210, 297, 'medium')
  } else {
    return getPrintStylesForDimensions(width, height, fontSize)
  }
}

/**
 * Get CSS for print based on dimensions
 */
const getPrintStylesForDimensions = (width: number, height: number, fontSize: 'small' | 'medium' | 'large'): string => {
  const fontSizes = {
    small: { base: '9px', header: '14px', table: '8px', totals: '10px', footer: '7px' },
    medium: { base: '11px', header: '18px', table: '10px', totals: '13px', footer: '10px' },
    large: { base: '12px', header: '24px', table: '12px', totals: '16px', footer: '11px' },
  }
  const sizes = fontSizes[fontSize]
  
  const baseStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #000; }
    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 0; size: ${width}mm ${height}mm; }
    }
  `
  
  // Adjust padding and font sizes based on paper width
  const isNarrow = width <= 100
  const padding = isNarrow ? '5mm' : width <= 150 ? '10mm' : '20mm'
  
  return baseStyles + `
    body { 
      width: ${width}mm; 
      max-width: ${width}mm; 
      min-height: ${height}mm;
      padding: ${padding}; 
      font-size: ${sizes.base}; 
    }
    .header { text-align: center; margin-bottom: ${isNarrow ? '10px' : '20px'}; padding-bottom: ${isNarrow ? '10px' : '15px'}; border-bottom: ${isNarrow ? '1px' : '2px'} solid #000; }
    .header .logo, .header img[alt*="Logo"], .header img[alt*="logo"] { max-height: ${isNarrow ? '40px' : '80px'}; max-width: ${isNarrow ? '120px' : '200px'}; margin-bottom: ${isNarrow ? '8px' : '15px'}; object-fit: contain; display: block; margin-left: auto; margin-right: auto; }
    .header h1 { font-size: ${sizes.header}; margin-bottom: ${isNarrow ? '5px' : '8px'}; }
    .info { ${isNarrow ? 'margin-bottom: 15px;' : 'display: flex; justify-content: space-between; margin-bottom: 20px;'} }
    .info-section { ${isNarrow ? 'margin-bottom: 8px;' : 'flex: 1;'} }
    .info-section h3 { font-size: ${sizes.base}; margin-bottom: ${isNarrow ? '3px' : '5px'}; font-weight: bold; ${!isNarrow ? 'text-transform: uppercase;' : ''} }
    .info-section p { font-size: ${sizes.base}; margin: ${isNarrow ? '2px' : '3px'} 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: ${isNarrow ? '10px' : '15px'}; }
    table th, table td { padding: ${isNarrow ? '4px 2px' : '6px 4px'}; text-align: left; border-bottom: ${isNarrow ? '1px dashed #ccc' : '1px solid #ddd'}; }
    table th { font-weight: bold; font-size: ${sizes.table}; ${!isNarrow ? 'background-color: #f5f5f5; text-transform: uppercase;' : ''} }
    table td { font-size: ${sizes.table}; }
    .text-right { text-align: right; }
    .totals { margin-top: ${isNarrow ? '10px' : '15px'}; ${isNarrow ? 'width: 100%;' : 'margin-left: auto; width: 300px;'} }
    .totals-row { display: flex; justify-content: space-between; padding: ${isNarrow ? '3px' : '5px'} 0; border-bottom: ${isNarrow ? '1px dashed #ccc' : '1px solid #ddd'}; font-size: ${sizes.base}; }
    .totals-row.total { font-weight: bold; font-size: ${sizes.totals}; border-top: ${isNarrow ? '2px' : '2px'} solid #000; border-bottom: ${isNarrow ? '2px' : '2px'} solid #000; padding: ${isNarrow ? '5px' : '8px'} 0; margin-top: ${isNarrow ? '5px' : '8px'}; }
    .footer { margin-top: ${isNarrow ? '15px' : '20px'}; text-align: center; font-size: ${sizes.footer}; color: #666; }
  `
}

