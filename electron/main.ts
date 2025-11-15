import path from 'path';

const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { join } = require('node:path')
// const {autoUpdater} = require('electron-updater')

// === Environment Variables ===
const MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173/';
// const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_NAME = process.env.MAIN_WINDOW_VITE_NAME || 'main_window'
const MAIN_WINDOW_PRELOAD_VITE_ENTRY = process.env.MAIN_WINDOW_PRELOAD_VITE_ENTRY

const createWindow = async () => {

    const splash = new BrowserWindow({
    width: 600,
    height: 400,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
    },
    frame: false,
    transparent: true,
  });
  
  splash.center();

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    resizable: true,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_VITE_ENTRY ?? join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await splash.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + 'splash/index.html');
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    await splash.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/splash/index.html`))
    await mainWindow.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  
  // Hide splash and show main window after 2.5 seconds
  setTimeout(() => { splash?.close(); mainWindow.show(); }, 2500);
  

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow()
  }
})

let keytar: typeof import('keytar') | null = null

const getKeytar = () => {
  if (keytar) return keytar
  try {
    keytar = require('keytar')
    return keytar
  } catch (error) {
    console.warn('keytar module not available. Tokens will not be stored securely.', error)
    return null
  }
}

const SERVICE_NAME = 'BookStoreERP'

ipcMain.handle('secure-storage:get', async (_:any, scope: string) => {
  const instance = getKeytar()
  if (!instance) return null
  return instance.getPassword(SERVICE_NAME, scope)
})

ipcMain.handle('secure-storage:set', async (_:any, scope: string, value: string) => {
  const instance = getKeytar()
  if (!instance) return
  await instance.setPassword(SERVICE_NAME, scope, value)
})

ipcMain.handle('secure-storage:clear', async (_:any, scope: string) => {
  const instance = getKeytar()
  if (!instance) return
  await instance.deletePassword(SERVICE_NAME, scope)
})

