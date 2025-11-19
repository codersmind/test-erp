/**
 * Generates a unique barcode for a product
 * Uses EAN-13 format (13 digits) or falls back to a numeric code based on product ID
 */
export const generateBarcode = (productId: string, sku?: string): string => {
  // If SKU is provided and is numeric, use it as base
  if (sku && /^\d+$/.test(sku)) {
    // Ensure it's 12 digits for EAN-13 (we'll add check digit)
    let base = sku.padStart(12, '0').slice(0, 12)
    // Calculate EAN-13 check digit
    const checkDigit = calculateEAN13CheckDigit(base)
    return base + checkDigit
  }
  
  // Otherwise, generate from product ID hash
  // Convert product ID to a numeric string
  let numericId = ''
  for (let i = 0; i < productId.length; i++) {
    const charCode = productId.charCodeAt(i)
    numericId += charCode.toString().slice(-1) // Use last digit of char code
  }
  
  // Ensure 12 digits
  let base = numericId.padStart(12, '0').slice(0, 12)
  // If still not enough, pad with product ID hash
  while (base.length < 12) {
    base = (base + numericId).slice(0, 12)
  }
  
  // Calculate EAN-13 check digit
  const checkDigit = calculateEAN13CheckDigit(base)
  return base + checkDigit
}

/**
 * Calculates the EAN-13 check digit
 */
const calculateEAN13CheckDigit = (base: string): string => {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10)
    // Multiply odd positions by 1, even positions by 3
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  const remainder = sum % 10
  const checkDigit = remainder === 0 ? 0 : 10 - remainder
  return checkDigit.toString()
}

/**
 * Validates if a barcode is in valid EAN-13 format
 */
export const isValidBarcode = (barcode: string): boolean => {
  if (!barcode || barcode.length !== 13) return false
  if (!/^\d+$/.test(barcode)) return false
  
  const base = barcode.slice(0, 12)
  const checkDigit = barcode.slice(12)
  const calculatedCheckDigit = calculateEAN13CheckDigit(base)
  
  return checkDigit === calculatedCheckDigit
}

