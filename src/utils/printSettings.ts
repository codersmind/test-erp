import { get, set } from 'idb-keyval'

export type PrintPaperSize = 'pos' | 'a4' | 'custom'

export interface PrintSettings {
  defaultPaperSize: PrintPaperSize
  customWidth: number // in mm
  customHeight: number // in mm
  fontSize: 'small' | 'medium' | 'large'
  showLogo: boolean
  logoUrl?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  footerText?: string
}

const PRINT_SETTINGS_KEY = 'erp_print_settings'

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  defaultPaperSize: 'a4',
  customWidth: 80, // 80mm for thermal printers
  customHeight: 200, // 200mm
  fontSize: 'medium',
  showLogo: false,
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  footerText: 'Thank you for your business!',
}

export const getPrintSettings = async (): Promise<PrintSettings> => {
  const settings = await get<PrintSettings>(PRINT_SETTINGS_KEY)
  return settings ?? DEFAULT_PRINT_SETTINGS
}

export const setPrintSettings = async (settings: PrintSettings): Promise<void> => {
  await set(PRINT_SETTINGS_KEY, settings)
}

/**
 * Get CSS for print based on paper size
 */
export const getPrintStyles = (paperSize: PrintPaperSize, customWidth?: number, customHeight?: number): string => {
  const baseStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #000; }
    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none !important; }
      @page { margin: 0; }
    }
  `

  if (paperSize === 'pos') {
    // POS/Receipt printer - typically 80mm wide
    return baseStyles + `
      body { 
        width: 80mm; 
        max-width: 80mm; 
        padding: 5mm; 
        font-size: 10px; 
      }
      .header { text-align: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #000; }
      .header h1 { font-size: 16px; margin-bottom: 5px; }
      .info { margin-bottom: 15px; font-size: 9px; }
      .info-section { margin-bottom: 8px; }
      .info-section h3 { font-size: 9px; margin-bottom: 3px; font-weight: bold; }
      .info-section p { font-size: 9px; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
      table th, table td { padding: 4px 2px; text-align: left; border-bottom: 1px dashed #ccc; }
      table th { font-weight: bold; font-size: 8px; }
      .text-right { text-align: right; }
      .totals { margin-top: 10px; width: 100%; }
      .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 9px; border-bottom: 1px dashed #ccc; }
      .totals-row.total { font-weight: bold; font-size: 11px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; margin-top: 5px; }
      .footer { margin-top: 15px; text-align: center; font-size: 8px; color: #666; }
    `
  } else if (paperSize === 'a4') {
    // A4 paper - standard invoice
    return baseStyles + `
      body { 
        width: 210mm; 
        max-width: 210mm; 
        padding: 20mm; 
        font-size: 12px; 
      }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
      .header h1 { font-size: 24px; margin-bottom: 10px; }
      .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .info-section { flex: 1; }
      .info-section h3 { font-size: 14px; margin-bottom: 10px; text-transform: uppercase; font-weight: bold; }
      .info-section p { font-size: 12px; margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      table th, table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
      table th { background-color: #f5f5f5; font-weight: bold; text-transform: uppercase; font-size: 12px; }
      table td { font-size: 12px; }
      .text-right { text-align: right; }
      .totals { margin-top: 20px; margin-left: auto; width: 300px; }
      .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; font-size: 12px; }
      .totals-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; margin-top: 10px; }
      .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; }
    `
  } else {
    // Custom paper size
    const width = customWidth || 80
    const height = customHeight || 200
    return baseStyles + `
      body { 
        width: ${width}mm; 
        max-width: ${width}mm; 
        min-height: ${height}mm;
        padding: 5mm; 
        font-size: 11px; 
      }
      .header { text-align: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #000; }
      .header h1 { font-size: 18px; margin-bottom: 8px; }
      .info { margin-bottom: 20px; }
      .info-section { margin-bottom: 10px; }
      .info-section h3 { font-size: 11px; margin-bottom: 5px; font-weight: bold; }
      .info-section p { font-size: 10px; margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      table th, table td { padding: 6px 4px; text-align: left; border-bottom: 1px solid #ddd; }
      table th { font-weight: bold; font-size: 10px; }
      table td { font-size: 10px; }
      .text-right { text-align: right; }
      .totals { margin-top: 15px; width: 100%; }
      .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #ddd; font-size: 11px; }
      .totals-row.total { font-weight: bold; font-size: 13px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 0; margin-top: 8px; }
      .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
    `
  }
}

