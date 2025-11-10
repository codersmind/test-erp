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

