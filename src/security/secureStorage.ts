type StorageScope = 'auth' | 'driveToken' | 'driveFolderId'

interface SecureStorageAPI {
  getToken: (key: StorageScope) => Promise<string | null>
  setToken: (key: StorageScope, value: string) => Promise<void>
  clearToken: (key: StorageScope) => Promise<void>
}

const WEB_STORAGE_PREFIX = 'erp:secure:'

const webStorageApi: SecureStorageAPI = {
  async getToken(key) {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`${WEB_STORAGE_PREFIX}${key}`)
  },
  async setToken(key, value) {
    if (typeof window === 'undefined') return
    localStorage.setItem(`${WEB_STORAGE_PREFIX}${key}`, value)
  },
  async clearToken(key) {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`${WEB_STORAGE_PREFIX}${key}`)
  },
}

declare global {
  interface Window {
    electronSecureStorage?: SecureStorageAPI
  }
}

const resolveSecureStorage = (): SecureStorageAPI => {
  if (typeof window !== 'undefined' && window.electronSecureStorage) {
    return window.electronSecureStorage
  }
  return webStorageApi
}

const storage = resolveSecureStorage()

export const saveSecureToken = (scope: StorageScope, value: string) => storage.setToken(scope, value)
export const loadSecureToken = (scope: StorageScope) => storage.getToken(scope)
export const clearSecureToken = (scope: StorageScope) => storage.clearToken(scope)

