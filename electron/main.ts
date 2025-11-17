const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const { join } = require('node:path')

// Conditionally require electron-updater (only available in packaged app)
let autoUpdater: any = null
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch (error) {
  console.warn('electron-updater not available:', error)
}

// === Environment Variables ===
const MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173/';
// const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
const MAIN_WINDOW_VITE_NAME = process.env.MAIN_WINDOW_VITE_NAME || 'main_window'
const MAIN_WINDOW_PRELOAD_VITE_ENTRY = process.env.MAIN_WINDOW_PRELOAD_VITE_ENTRY

let mainWindow: any = null

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

  mainWindow = new BrowserWindow({
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

app.whenReady().then(() => {
  createWindow()
  
  // Initialize auto-updater after window is ready (only in production)
  if (app.isPackaged && autoUpdater) {
    // Small delay to ensure window is fully loaded
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify()
      
      // Check for updates every 4 hours
      setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify()
      }, 4 * 60 * 60 * 1000)
    }, 3000)
  }
})

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

const SERVICE_NAME = 'PonyToryERP'

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

// === Auto Updater Configuration ===
// Only enable auto-updater in production (not in dev mode)
if (app.isPackaged && autoUpdater) {
  autoUpdater.setAutoDownload(false)
  autoUpdater.setAutoInstallOnAppQuit(true)
  
  // Configure for GitHub Releases
  // The repository will be automatically detected from package.json or forge.config.cjs
  // Make sure your GitHub repository is set in forge.config.cjs publishers section
} else {
  console.log('Auto-updater disabled (dev mode or module not available)')
}

// === Auto Updater Event Handlers ===
if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
    if (mainWindow) {
      mainWindow.webContents.send('update:checking')
    }
  })

  autoUpdater.on('update-available', (info: any) => {
    console.log('Update available:', info.version)
    if (mainWindow) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      })
    }
    
    // Automatically download the update
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('update-not-available', (info: any) => {
    console.log('Update not available. Current version is latest.')
    if (mainWindow) {
      mainWindow.webContents.send('update:not-available', {
        version: info.version,
      })
    }
  })

  autoUpdater.on('error', (err: any) => {
    console.error('Error in auto-updater:', err)
    if (mainWindow) {
      mainWindow.webContents.send('update:error', {
        message: err.message,
      })
    }
  })

  autoUpdater.on('download-progress', (progressObj: any) => {
    const percent = Math.round(progressObj.percent || 0)
    console.log(`Download progress: ${percent}%`)
    if (mainWindow) {
      mainWindow.webContents.send('update:download-progress', {
        percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      })
    }
  })

  autoUpdater.on('update-downloaded', (info: any) => {
    console.log('Update downloaded:', info.version)
    if (mainWindow) {
      mainWindow.webContents.send('update:downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      })
      
      // Show restart dialog
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded successfully!',
        detail: `Version ${info.version} has been downloaded. The application will restart to apply the update.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then((result: any) => {
        if (result.response === 0) {
          // User clicked "Restart Now"
          autoUpdater.quitAndInstall(false, true)
        }
      })
    }
  })
}

// === IPC Handlers for Update Control ===
ipcMain.handle('update:check', async () => {
  if (!autoUpdater) {
    return { success: false, error: 'Auto-updater not available' }
  }
  try {
    await autoUpdater.checkForUpdates()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('update:restart', async () => {
  if (!autoUpdater) {
    return
  }
  autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('update:get-version', async () => {
  return app.getVersion()
})

// === Printer IPC Handlers ===
ipcMain.handle('printer:get-printers', async () => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' }
    }
    const printers = await mainWindow.webContents.getPrintersAsync()
    return {
      success: true,
      printers: printers.map((printer: any) => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        description: printer.description || printer.name,
        status: printer.status,
        isDefault: printer.isDefault || false,
      })),
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('printer:print', async (_: any, options: { html: string; printerName?: string; silent?: boolean }) => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' }
    }

    const { html, printerName, silent = false } = options

    // Create a hidden window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Load HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Print options
    const printOptions: any = {
      silent,
      printBackground: true,
      deviceName: printerName || undefined,
    }

    // Print
    const success = await printWindow.webContents.print(printOptions)

    // Close the print window
    printWindow.close()

    return { success: !!success }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('printer:show-dialog', async () => {
  try {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' }
    }

    const printers = await mainWindow.webContents.getPrintersAsync()
    
    if (printers.length === 0) {
      return { success: false, error: 'No printers available' }
    }

    // Show dialog to select printer
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Select Printer',
      message: 'Choose a printer:',
      buttons: printers.map((p: any) => p.displayName || p.name),
      defaultId: printers.findIndex((p: any) => p.isDefault) || 0,
      cancelId: -1,
    })

    if (result.response >= 0 && result.response < printers.length) {
      const selectedPrinter = printers[result.response]
      return {
        success: true,
        printer: {
          name: selectedPrinter.name,
          displayName: selectedPrinter.displayName || selectedPrinter.name,
          description: selectedPrinter.description || selectedPrinter.name,
        },
      }
    }

    return { success: false, error: 'No printer selected' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

