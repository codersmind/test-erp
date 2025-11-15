import { app, BrowserWindow, ipcMain, shell, dialog, Notification, screen } from 'electron';
import { join } from 'node:path';
import { autoUpdater } from 'electron-updater';

// ───── Environment ─────
const IS_DEV = import.meta.env.DEV || !!process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL;
const RENDERER_NAME = process.env.MAIN_WINDOW_VITE_NAME ?? 'main_window';
const PRELOAD_PATH = process.env.MAIN_WINDOW_PRELOAD_VITE_ENTRY ?? join(__dirname, '../preload/index.cjs');

// ───── Global Windows ─────
let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

// ───── Create Splash (centered, frameless) ─────
function createSplash() {
  // const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  splashWindow = new BrowserWindow({
    width: 400,
    height: 260,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    center: true,
    webPreferences: { nodeIntegration: false },
  });

  splashWindow.loadFile(join(__dirname, '../splash/index.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow?.show();
    // Close splash after 2.5 seconds → open main
    setTimeout(() => {
      splashWindow?.close();
      createMainWindow();
    }, 2500);
  });

  splashWindow.on('closed', () => (splashWindow = null));
}

// ───── Create Main Window (hidden until ready) ─────
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (IS_DEV) {
    await mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(join(__dirname, `../renderer/${RENDERER_NAME}/index.html`));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => (mainWindow = null));
}

// ───── App Lifecycle ─────
app.whenReady().then(() => {
  createSplash();
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});

// ───── Auto-Updater Events ─────
autoUpdater.allowPrerelease = false;

autoUpdater.on('checking-for-update', () => {
  new Notification({ title: 'Update', body: 'Checking for updates...' }).show();
});

autoUpdater.on('update-available', (info) => {
  new Notification({
    title: 'Update Available',
    body: `Downloading v${info.version}...`,
  }).show();
  autoUpdater.downloadUpdate();
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update-progress', progress);
});

autoUpdater.on('update-downloaded', async () => {
  new Notification({ title: 'Update Ready', body: 'Restart to apply.' }).show();

  const { response } = await dialog.showMessageBox(mainWindow!, {
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    title: 'Update Ready',
    message: 'New version downloaded.',
  });

  if (response === 0) autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => {
  console.error('Updater error:', err);
  new Notification({ title: 'Update Failed', body: 'Check internet.' }).show();
});

ipcMain.handle('check-for-update', () => autoUpdater.checkForUpdates());

// ───── Secure Storage (keytar) ─────
let keytar: typeof import('keytar') | null = null;
const getKeytar = () => {
  if (keytar) return keytar;
  try { keytar = require('keytar'); } catch (e) {
    console.warn('keytar not available', e);
  }
  return keytar;
};
const SERVICE_NAME = 'BookStoreERP';

ipcMain.handle('secure-storage:get', async (_ev, scope: string) => {
  const kt = getKeytar();
  return kt ? await kt.getPassword(SERVICE_NAME, scope) : null;
});
ipcMain.handle('secure-storage:set', async (_ev, scope: string, value: string) => {
  const kt = getKeytar();
  if (kt) await kt.setPassword(SERVICE_NAME, scope, value);
});
ipcMain.handle('secure-storage:clear', async (_ev, scope: string) => {
  const kt = getKeytar();
  if (kt) await kt.deletePassword(SERVICE_NAME, scope);
});