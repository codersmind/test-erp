import { get, set } from 'idb-keyval'

const LOGO_STORAGE_KEY = 'erp_company_logo'

export interface LogoData {
  dataUrl: string // Base64 encoded image
  fileName: string
  mimeType: string
  uploadedAt: string
}

/**
 * Save logo to IndexedDB
 */
export const saveLogo = async (logo: LogoData): Promise<void> => {
  await set(LOGO_STORAGE_KEY, logo)
}

/**
 * Get logo from IndexedDB
 */
export const getLogo = async (): Promise<LogoData | null> => {
  return await get<LogoData>(LOGO_STORAGE_KEY) || null
}

/**
 * Delete logo from IndexedDB
 */
export const deleteLogo = async (): Promise<void> => {
  await set(LOGO_STORAGE_KEY, null)
}

/**
 * Convert file to base64 data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 2 * 1024 * 1024 // 2MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload PNG, JPEG, GIF, WebP, or SVG image.' }
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large. Maximum size is 2MB.' }
  }
  
  return { valid: true }
}

