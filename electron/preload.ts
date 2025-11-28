const { contextBridge, ipcRenderer } = require('electron')

type StorageScope = 'auth' | 'driveToken' | 'driveFolderId'

contextBridge.exposeInMainWorld('electronSecureStorage', {
  async getToken(scope: StorageScope) {
    return ipcRenderer.invoke('secure-storage:get', scope)
  },
  async setToken(scope: StorageScope, value: string) {
    return ipcRenderer.invoke('secure-storage:set', scope, value)
  },
  async clearToken(scope: StorageScope) {
    return ipcRenderer.invoke('secure-storage:clear', scope)
  },
})

// Auto-updater API
contextBridge.exposeInMainWorld('electronUpdater', {
  async checkForUpdates() {
    return ipcRenderer.invoke('update:check')
  },
  async restartApp() {
    return ipcRenderer.invoke('update:restart')
  },
  async getVersion() {
    return ipcRenderer.invoke('update:get-version')
  },
  onUpdateChecking(callback: () => void) {
    ipcRenderer.on('update:checking', callback)
    return () => ipcRenderer.removeAllListeners('update:checking')
  },
  onUpdateAvailable(callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void) {
    ipcRenderer.on('update:available', (_event: any, info: { version: string; releaseDate: string; releaseNotes?: string }) => callback(info))
    return () => ipcRenderer.removeAllListeners('update:available')
  },
  onUpdateNotAvailable(callback: (info: { version: string }) => void) {
    ipcRenderer.on('update:not-available', (_event: any, info: { version: string }) => callback(info))
    return () => ipcRenderer.removeAllListeners('update:not-available')
  },
  onUpdateError(callback: (error: { message: string }) => void) {
    ipcRenderer.on('update:error', (_event: any, error: { message: string }) => callback(error))
    return () => ipcRenderer.removeAllListeners('update:error')
  },
  onDownloadProgress(callback: (progress: { percent: number; transferred: number; total: number }) => void) {
    ipcRenderer.on('update:download-progress', (_event: any, progress: { percent: number; transferred: number; total: number }) => callback(progress))
    return () => ipcRenderer.removeAllListeners('update:download-progress')
  },
  onUpdateDownloaded(callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void) {
    ipcRenderer.on('update:downloaded', (_event: any, info: { version: string; releaseDate: string; releaseNotes?: string }) => callback(info))
    return () => ipcRenderer.removeAllListeners('update:downloaded')
  },
})

// Printer API
contextBridge.exposeInMainWorld('electronPrinter', {
  async getPrinters() {
    return ipcRenderer.invoke('printer:get-printers')
  },
  async print(options: { html: string; printerName?: string; silent?: boolean }) {
    return ipcRenderer.invoke('printer:print', options)
  },
  async showDialog() {
    return ipcRenderer.invoke('printer:show-dialog')
  },
})

// PDF Generation API
const electronPDFAPI = {
  async generate(options: { html: string; filename: string }) {
    return ipcRenderer.invoke('generate:pdf', options)
  },
}

// Expose via contextBridge (works with contextIsolation: true or false)
contextBridge.exposeInMainWorld('electronPDF', electronPDFAPI)

// Also expose directly on window as fallback (for contextIsolation: false)
if (typeof window !== 'undefined') {
  (window as any).electronPDF = electronPDFAPI
}

