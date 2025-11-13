import { get, set } from 'idb-keyval'

const TAX_RATE_KEY = 'erp_tax_rate'

export const getTaxRate = async (): Promise<number> => {
  const rate = await get<number>(TAX_RATE_KEY)
  return rate ?? 0
}

export const setTaxRate = async (rate: number): Promise<void> => {
  await set(TAX_RATE_KEY, rate)
}

export const calculateTax = (subtotal: number, taxRate: number): number => {
  return subtotal * (taxRate / 100)
}

