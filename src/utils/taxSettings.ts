import { get, set } from 'idb-keyval'

export type TaxType = 'gst' | 'cgst_sgst'

export interface StateTaxConfig {
  state: string
  type: TaxType
  gstRate: number
  cgstRate: number
  sgstRate: number
}

export interface TaxSettings {
  type: TaxType
  gstRate: number // For single GST (e.g., 5%, 12%, 18%)
  cgstRate: number // For CGST (half of total GST when split)
  sgstRate: number // For SGST (half of total GST when split)
  defaultState?: string // Default state for new orders
  stateRates: Record<string, StateTaxConfig> // State-wise tax configurations
}

const TAX_SETTINGS_KEY = 'erp_tax_settings'

// Common Indian states (can be customized)
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
] as const

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  type: 'gst',
  gstRate: 5, // Default 5% GST
  cgstRate: 2.5, // Default 2.5% CGST (half of 5%)
  sgstRate: 2.5, // Default 2.5% SGST (half of 5%)
  defaultState: 'Maharashtra',
  stateRates: {},
}

export const getTaxSettings = async (): Promise<TaxSettings> => {
  const settings = await get<TaxSettings>(TAX_SETTINGS_KEY)
  return settings ?? DEFAULT_TAX_SETTINGS
}

export const setTaxSettings = async (settings: TaxSettings): Promise<void> => {
  await set(TAX_SETTINGS_KEY, settings)
}

// Legacy support - get single tax rate (GST or combined CGST+SGST)
export const getTaxRate = async (): Promise<number> => {
  const settings = await getTaxSettings()
  if (settings.type === 'gst') {
    return settings.gstRate
  }
  return settings.cgstRate + settings.sgstRate
}

// Legacy support - set single tax rate (converts to GST)
export const setTaxRate = async (rate: number): Promise<void> => {
  const current = await getTaxSettings()
  await setTaxSettings({
    ...current,
    type: 'gst',
    gstRate: rate,
  })
}

export const calculateTax = (
  subtotal: number,
  settings: TaxSettings,
  state?: string,
): { tax: number; cgst?: number; sgst?: number; state?: string } => {
  // Use state-specific rates if state is provided and exists
  let taxConfig: StateTaxConfig | TaxSettings = settings
  if (state && settings.stateRates[state]) {
    taxConfig = settings.stateRates[state]
  }

  if (taxConfig.type === 'gst') {
    const tax = subtotal * (taxConfig.gstRate / 100)
    return { tax, state: state || settings.defaultState }
  } else {
    const cgst = subtotal * (taxConfig.cgstRate / 100)
    const sgst = subtotal * (taxConfig.sgstRate / 100)
    const tax = cgst + sgst
    return { tax, cgst, sgst, state: state || settings.defaultState }
  }
}

// Get tax settings for a specific state
export const getStateTaxConfig = async (state: string): Promise<StateTaxConfig | null> => {
  const settings = await getTaxSettings()
  return settings.stateRates[state] || null
}

// Set tax configuration for a specific state
export const setStateTaxConfig = async (state: string, config: StateTaxConfig): Promise<void> => {
  const settings = await getTaxSettings()
  settings.stateRates[state] = config
  await setTaxSettings(settings)
}

// Remove state tax configuration
export const removeStateTaxConfig = async (state: string): Promise<void> => {
  const settings = await getTaxSettings()
  delete settings.stateRates[state]
  await setTaxSettings(settings)
}

// Helper to get common GST rates
export const COMMON_GST_RATES = [0, 2, 5, 12, 18, 28] as const

