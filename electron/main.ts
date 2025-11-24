const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const { join, resolve } = require('node:path')
const { createServer } = require('http')
const { readFileSync, existsSync } = require('fs')
const { extname } = require('path')

// Handle Squirrel events (required for Squirrel.Windows installer)
// This MUST be at the very top before any app initialization
if (process.platform === 'win32') {
  // Check for Squirrel startup using electron-squirrel-startup
  try {
    if (require('electron-squirrel-startup')) {
      app.quit()
      process.exit(0)
    }
  } catch (error) {
    // electron-squirrel-startup not available, continue with manual handling
  }

  // Handle Squirrel command line arguments manually
  const handleSquirrelEvent = () => {
    // Check if we have Squirrel command line arguments
    if (process.argv.length <= 1) {
      return false
    }

    const squirrelEvent = process.argv[1]
    
    // Debug: Log Squirrel events for troubleshooting
    if (squirrelEvent && squirrelEvent.startsWith('--squirrel-')) {
      console.log('Squirrel event detected:', squirrelEvent)
    }
    
    const path = require('path')

    const appFolder = path.resolve(process.execPath, '..')
    const rootAtomFolder = path.resolve(appFolder, '..')
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'))
    
    // Check if Update.exe exists (required for Squirrel events)
    const fs = require('fs')
    const os = require('os')
    const { execSync, spawnSync } = require('child_process')
    if (!fs.existsSync(updateDotExe)) {
      console.warn('Update.exe not found at:', updateDotExe)
      return false
    }
    
    // Resolve the correct executable path for Squirrel installations
    // In Squirrel, the executable is ALWAYS at: %LOCALAPPDATA%\ponytory-erp\app-<version>\ponytory-erp.exe
    // During Squirrel events, process.execPath might incorrectly point to the root, so we ALWAYS find the app-* folder
    let exePath = process.execPath
    let exeName = 'ponytory-erp.exe'
    
    // ALWAYS try to find the app-* folder in the root directory
    // This ensures we get the correct path even if process.execPath is wrong
    try {
      console.log('Root atom folder:', rootAtomFolder)
      const rootFiles = fs.readdirSync(rootAtomFolder)
      console.log('Root folder contents:', rootFiles)
      
      const appFolderMatch = rootFiles.find((file: string) => {
        const fullPath = path.join(rootAtomFolder, file)
        try {
          return file.startsWith('app-') && fs.statSync(fullPath).isDirectory()
        } catch (error) {
          return false
        }
      })
      
      if (appFolderMatch) {
        console.log('Found app folder:', appFolderMatch)
        // Construct the correct executable path using the found app-* folder
        const versionedAppFolder = path.join(rootAtomFolder, appFolderMatch)
        exePath = path.join(versionedAppFolder, exeName)
        
        // Verify the executable exists
        if (fs.existsSync(exePath)) {
          console.log('✓ Resolved executable path to app folder:', exePath)
        } else {
          console.warn('Executable not found at resolved path:', exePath)
          // Try to find any .exe in the app folder
          try {
            const appFiles = fs.readdirSync(versionedAppFolder)
            console.log('App folder contents:', appFiles)
            const exeFile = appFiles.find((file: string) => file.endsWith('.exe'))
            if (exeFile) {
              exePath = path.join(versionedAppFolder, exeFile)
              exeName = exeFile
              console.log('✓ Found executable in app folder:', exePath)
            } else {
              console.error('No .exe file found in app folder:', versionedAppFolder)
            }
          } catch (error: any) {
            console.error('Failed to read app folder:', error.message)
          }
        }
      } else {
        console.warn('No app-* folder found in root:', rootAtomFolder)
        console.warn('Falling back to process.execPath:', process.execPath)
      }
    } catch (error: any) {
      console.error('Failed to resolve app folder:', error.message)
      console.error('Falling back to process.execPath:', process.execPath)
      exePath = process.execPath
      exeName = path.basename(process.execPath)
    }
    
    // Final verification
    if (!fs.existsSync(exePath)) {
      console.error('✗ CRITICAL: Executable not found at final path:', exePath)
      console.error('process.execPath was:', process.execPath)
    } else {
      console.log('✓ Final executable path verified:', exePath)
    }

    // Declare variables once for all cases
    const productName = 'PonyTory ERP'
    const startMenuLocations = [
      path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs')
    ]

    switch (squirrelEvent) {
      case '--squirrel-install':
      case '--squirrel-updated':
        console.log('Creating shortcuts for:', exeName)
        console.log('Executable path:', exePath)
        console.log('Update.exe path:', updateDotExe)
        
        // Create Start Menu shortcut using Squirrel first (waits for completion)
        console.log('Creating Start Menu shortcut using Squirrel...')
        try {
          // Use spawnSync to wait for Squirrel's shortcut creation to complete
          const squirrelResult = spawnSync(updateDotExe, ['--createShortcut', exeName], {
            cwd: rootAtomFolder,
            timeout: 10000
          })
          if (squirrelResult.error) {
            console.error('Squirrel shortcut creation error:', squirrelResult.error)
          } else {
            console.log('Squirrel shortcut creation completed with code:', squirrelResult.status)
          }
        } catch (error: any) {
          console.error('Failed to create Squirrel shortcut:', error.message || error)
        }
        
        // Wait a moment for Squirrel's shortcut to be fully created
        // Use a blocking sleep with child_process
        try {
          execSync('timeout /t 1 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 2 >nul', { shell: true })
        } catch (error) {
          // Ignore sleep errors
        }
        
        // Normalize the path to use forward slashes or ensure it's absolute
        const normalizedExePath = path.resolve(exePath)
        console.log('Normalized executable path for shortcuts:', normalizedExePath)
        
        // Function to recursively search for shortcuts
        const findShortcutRecursive = (dir: string, names: string[]): string | null => {
          try {
            if (!fs.existsSync(dir)) {
              return null
            }
            
            const entries = fs.readdirSync(dir)
            
            // Check direct files first
            for (const name of names) {
              const testPath = path.join(dir, name)
              if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
                return testPath
              }
            }
            
            // Check subdirectories
            for (const entry of entries) {
              const fullPath = path.join(dir, entry)
              try {
                if (fs.statSync(fullPath).isDirectory()) {
                  const found = findShortcutRecursive(fullPath, names)
                  if (found) {
                    return found
                  }
                }
              } catch (error) {
                // Skip if can't access
                continue
              }
            }
          } catch (error) {
            // Ignore errors
          }
          return null
        }
        
        // Now update/recreate Start Menu shortcut to point directly to exe
        // Check both user and common Start Menu locations
        for (const startMenuPath of startMenuLocations) {
          try {
            // Check if Start Menu folder exists
            if (!fs.existsSync(startMenuPath)) {
              continue
            }
            
            // Look for any shortcuts with the exe name or product name (recursively)
            const possibleNames = [
              `${productName}.lnk`,
              `${exeName.replace('.exe', '')}.lnk`,
              `ponytory-erp.lnk`
            ]
            
            let startMenuShortcutPath: string | null = findShortcutRecursive(startMenuPath, possibleNames)
            
            if (startMenuShortcutPath) {
              console.log('Found existing Start Menu shortcut (recursive search):', startMenuShortcutPath)
            }
            
            // If no existing shortcut found, create one directly in Programs folder
            if (!startMenuShortcutPath) {
              startMenuShortcutPath = path.join(startMenuPath, `${productName}.lnk`)
              console.log('No existing shortcut found, will create new one at:', startMenuShortcutPath)
            }
            
            console.log('Creating/updating Start Menu shortcut at:', startMenuShortcutPath)
            console.log('Target executable path:', normalizedExePath)
            
            // Delete existing shortcut first to ensure clean update
            if (fs.existsSync(startMenuShortcutPath)) {
              try {
                fs.unlinkSync(startMenuShortcutPath)
                console.log('Deleted existing Start Menu shortcut')
              } catch (error: any) {
                console.warn('Failed to delete existing shortcut:', error.message)
              }
            }
            
            // Ensure parent directory exists (in case it's in a subfolder)
            const shortcutDir = path.dirname(startMenuShortcutPath)
            if (!fs.existsSync(shortcutDir)) {
              fs.mkdirSync(shortcutDir, { recursive: true })
              console.log('Created shortcut directory:', shortcutDir)
            }
            
            // Escape paths for VBScript (double backslashes for VBScript strings)
            const startMenuPathEscaped = path.dirname(startMenuShortcutPath).replace(/\\/g, '\\\\')
            const shortcutName = path.basename(startMenuShortcutPath, '.lnk')
            const exePathEscaped = normalizedExePath.replace(/\\/g, '\\\\')
            const workingDirEscaped = path.dirname(normalizedExePath).replace(/\\/g, '\\\\')

            console.log('VBScript will create shortcut with TargetPath:', normalizedExePath)

            // Create VBScript to create/update Start Menu shortcut
            // This creates a shortcut that points directly to the executable
            const startMenuVbsScript = `Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${startMenuPathEscaped}\\\\${shortcutName}.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${exePathEscaped}"
oLink.WorkingDirectory = "${workingDirEscaped}"
oLink.Description = "${productName}"
oLink.IconLocation = "${exePathEscaped}, 0"
oLink.Save`

            const startMenuTempVbs = path.join(os.tmpdir(), `create-startmenu-shortcut-${Date.now()}.vbs`)
            fs.writeFileSync(startMenuTempVbs, startMenuVbsScript, 'utf8')
            console.log('Start Menu VBScript created at:', startMenuTempVbs)
            console.log('VBScript content:', startMenuVbsScript)

            // Execute VBScript synchronously
            try {
              execSync(`cscript //nologo "${startMenuTempVbs}"`, { stdio: 'inherit', timeout: 5000 })
              console.log('Start Menu shortcut created/updated successfully')
              
              // Verify shortcut was created and check its target
              if (startMenuShortcutPath && fs.existsSync(startMenuShortcutPath)) {
                console.log('✓ Start Menu shortcut verified:', startMenuShortcutPath)
                // Try to read the shortcut target using PowerShell (if available)
                try {
                  const psScript = `$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut('${startMenuShortcutPath.replace(/'/g, "''")}'); Write-Output $shortcut.TargetPath`
                  const psResult = execSync(`powershell -Command "${psScript}"`, { encoding: 'utf8', timeout: 3000 }).trim()
                  console.log('Shortcut target path (read back):', psResult)
                  if (psResult && psResult !== normalizedExePath) {
                    console.warn('⚠ WARNING: Shortcut target does not match expected path!')
                    console.warn('Expected:', normalizedExePath)
                    console.warn('Actual:', psResult)
                  } else {
                    console.log('✓ Shortcut target path verified correctly')
                  }
                } catch (psError) {
                  // PowerShell not available or failed, skip verification
                  console.log('Could not verify shortcut target (PowerShell check skipped)')
                }
                // Break after successfully creating in first location
                break
              } else {
                console.warn('✗ Start Menu shortcut not found after creation:', startMenuShortcutPath)
              }
            } catch (execError: any) {
              console.error('Start Menu VBScript execution error:', execError.message || execError)
            }

            // Cleanup temp VBS file
            try {
              if (fs.existsSync(startMenuTempVbs)) {
                fs.unlinkSync(startMenuTempVbs)
              }
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
          } catch (error: any) {
            console.error('Failed to create/update Start Menu shortcut:', error.message || error)
          }
        }

        // Create Desktop shortcut manually (Squirrel doesn't create desktop shortcuts)
        
        try {
          const desktopPath = path.join(os.homedir(), 'Desktop')
          const desktopShortcutPath = path.join(desktopPath, `${productName}.lnk`)
          
          console.log('Creating desktop shortcut at:', desktopShortcutPath)
          console.log('Target executable path:', normalizedExePath)
          
          // Ensure Desktop directory exists
          if (!fs.existsSync(desktopPath)) {
            fs.mkdirSync(desktopPath, { recursive: true })
            console.log('Created Desktop directory:', desktopPath)
          }

          // Delete existing desktop shortcut first to ensure clean update
          if (fs.existsSync(desktopShortcutPath)) {
            try {
              fs.unlinkSync(desktopShortcutPath)
              console.log('Deleted existing desktop shortcut')
            } catch (error: any) {
              console.warn('Failed to delete existing desktop shortcut:', error.message)
            }
          }

          // Escape paths for VBScript (double backslashes for VBScript strings)
          const desktopPathEscaped = desktopPath.replace(/\\/g, '\\\\')
          const exePathEscaped = normalizedExePath.replace(/\\/g, '\\\\')
          const workingDirEscaped = path.dirname(normalizedExePath).replace(/\\/g, '\\\\')

          console.log('VBScript will create desktop shortcut with TargetPath:', normalizedExePath)

          // Create VBScript to create desktop shortcut
          const vbsScript = `Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${desktopPathEscaped}\\\\${productName}.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${exePathEscaped}"
oLink.WorkingDirectory = "${workingDirEscaped}"
oLink.Description = "${productName}"
oLink.IconLocation = "${exePathEscaped}, 0"
oLink.Save`

          const tempVbs = path.join(os.tmpdir(), `create-shortcut-${Date.now()}.vbs`)
          fs.writeFileSync(tempVbs, vbsScript, 'utf8')
          console.log('VBScript created at:', tempVbs)

          // Execute VBScript synchronously to ensure it completes
          try {
            execSync(`cscript //nologo "${tempVbs}"`, { stdio: 'inherit', timeout: 5000 })
            console.log('Desktop shortcut created successfully')
            
            // Verify shortcut was created
            if (fs.existsSync(desktopShortcutPath)) {
              console.log('Desktop shortcut verified:', desktopShortcutPath)
            } else {
              console.warn('Desktop shortcut not found after creation:', desktopShortcutPath)
            }
          } catch (execError: any) {
            console.error('VBScript execution error:', execError.message || execError)
          }

          // Cleanup temp VBS file
          try {
            if (fs.existsSync(tempVbs)) {
              fs.unlinkSync(tempVbs)
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        } catch (error: any) {
          console.error('Failed to create desktop shortcut:', error.message || error)
        }

        // Quit after creating shortcuts (give time for both to complete)
        setTimeout(() => {
          app.quit()
        }, 3000)
        return true

      case '--squirrel-uninstall':
        // Remove shortcuts using Squirrel
        try {
          spawnSync(updateDotExe, ['--removeShortcut', exeName], {
            cwd: rootAtomFolder,
            timeout: 10000
          })
        } catch (error) {
          // Ignore errors
        }
        
        // Remove desktop shortcut manually
        try {
          const desktopPath = path.join(os.homedir(), 'Desktop')
          const desktopShortcutPath = path.join(desktopPath, `${productName}.lnk`)
          
          if (fs.existsSync(desktopShortcutPath)) {
            fs.unlinkSync(desktopShortcutPath)
          }
        } catch (error) {
          // Ignore errors
        }

        // Remove Start Menu shortcuts from both locations
        for (const startMenuPath of startMenuLocations) {
          try {
            if (!fs.existsSync(startMenuPath)) {
              continue
            }
            
            // Look for any shortcuts with the exe name or product name
            const possibleNames = [
              `${productName}.lnk`,
              `${exeName.replace('.exe', '')}.lnk`,
              `PonyTory ERP.lnk`
            ]
            
            for (const name of possibleNames) {
              const shortcutPath = path.join(startMenuPath, name)
              if (fs.existsSync(shortcutPath)) {
                fs.unlinkSync(shortcutPath)
              }
            }
          } catch (error) {
            // Ignore errors
          }
        }

        setTimeout(() => {
          app.quit()
        }, 1000)
        return true

      case '--squirrel-obsolete':
        app.quit()
        return true
    }

    return false
  }

  // Handle Squirrel events - this MUST return early if handled
  if (handleSquirrelEvent()) {
    process.exit(0)
  }

  // Set Application User Model ID for Windows search indexing
  app.setAppUserModelId('com.ponytory.erp')
}

// Single instance lock - prevent double installation/launch
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
  process.exit(0)
} else {
  // Handle when a second instance tries to launch
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Conditionally require electron-updater (only available in packaged app)
let autoUpdater: any = null
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch (error) {
  console.warn('electron-updater not available:', error)
}

// === Environment Variables ===
// Only use dev server URL if explicitly set (not in production builds)
// In production, process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL is undefined
// const MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173/';
const MAIN_WINDOW_VITE_DEV_SERVER_URL = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL
const MAIN_WINDOW_VITE_NAME = process.env.MAIN_WINDOW_VITE_NAME || 'main_window'
const MAIN_WINDOW_PRELOAD_VITE_ENTRY = process.env.MAIN_WINDOW_PRELOAD_VITE_ENTRY

// Local HTTP server for production (required for Firebase Auth)
let localServer: any = null
let localServerPort = 5174 // Use a different port than dev server
const MAX_PORT_RETRIES = 10 // Maximum number of port retry attempts

// Start local HTTP server to serve static files in production
const startLocalServer = (retryCount: number = 0): Promise<number> => {
  return new Promise((resolvePromise, reject) => {
    if (localServer) {
      resolvePromise(localServerPort)
      return
    }

    // Check if we've exceeded the maximum retry limit
    if (retryCount >= MAX_PORT_RETRIES) {
      reject(new Error(`Failed to start local server: Could not find an available port after ${MAX_PORT_RETRIES} attempts`))
      return
    }

    const rendererPath = join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}`)
    
    const mimeTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.wasm': 'application/wasm',
      '.map': 'application/json',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    }

    localServer = createServer((req: any, res: any) => {
      // Normalize the URL path - remove leading slash and query string
      let urlPath = req.url === '/' ? 'index.html' : req.url.split('?')[0]
      // Remove leading slash to make it relative
      if (urlPath.startsWith('/')) {
        urlPath = urlPath.substring(1)
      }
      
      // Handle empty path (e.g., from query-only URLs like /?foo=bar)
      // After removing leading slash, empty string means root path
      if (!urlPath || urlPath === '') {
        urlPath = 'index.html'
      }
      
      // Join with renderer path (now urlPath is relative, so join works correctly)
      let filePath = join(rendererPath, urlPath)
      
      // Security: prevent directory traversal
      // Resolve to absolute path to handle .. and . segments
      const resolvedPath = resolve(filePath)
      const resolvedRendererPath = resolve(rendererPath)
      
      // Verify path is within renderer directory by checking:
      // 1. Path equals renderer path, OR
      // 2. Path starts with renderer path followed by path separator
      // This prevents prefix matching attacks (e.g., /app/render vs /app/renderer)
      const path = require('path')
      const pathSeparator = path.sep
      const isWithinRenderer = resolvedPath === resolvedRendererPath || 
        resolvedPath.startsWith(resolvedRendererPath + pathSeparator)
      
      if (!isWithinRenderer) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      
      filePath = resolvedPath

      // Check if file exists
      if (!existsSync(filePath)) {
        // For SPA routing: if the path doesn't exist and doesn't have a file extension,
        // serve index.html to let React Router handle the route
        // Check if the path has a file extension (excluding query strings)
        const pathWithoutQuery = urlPath.split('?')[0]
        const hasFileExtension = /\.\w+$/.test(pathWithoutQuery)
        
        // Also check if it's a static asset path (assets/, _vite/, etc.)
        const isStaticAsset = pathWithoutQuery.startsWith('assets/') || 
                             pathWithoutQuery.startsWith('_vite/') ||
                             pathWithoutQuery.startsWith('node_modules/')
        
        if (!hasFileExtension && !isStaticAsset) {
          // This is likely a client-side route (e.g., /settings, /customers)
          // Serve index.html to let React Router handle the routing
          filePath = join(rendererPath, 'index.html')
          // Re-resolve the path for security check
          filePath = resolve(filePath)
          if (!existsSync(filePath)) {
            res.writeHead(404)
            res.end('File not found')
            return
          }
        } else {
          // File with extension or static asset doesn't exist, return 404
          res.writeHead(404)
          res.end('File not found')
          return
        }
      }

      try {
        const fileContent = readFileSync(filePath)
        const ext = extname(filePath)
        const contentType = mimeTypes[ext] || 'application/octet-stream'

        res.writeHead(200, { 'Content-Type': contentType })
        res.end(fileContent)
      } catch (error: any) {
        console.error('Error serving file:', error)
        res.writeHead(500)
        res.end('Internal server error')
      }
    })

    localServer.listen(localServerPort, 'localhost', () => {
      console.log(`Local server started on http://localhost:${localServerPort}`)
      resolvePromise(localServerPort)
    })

    localServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        // Port in use, try next port
        // Close the server first to properly release resources
        if (localServer) {
          localServer.close()
        }
        localServerPort++
        localServer = null
        // Recursively retry with incremented retry count
        startLocalServer(retryCount + 1).then(resolvePromise).catch(reject)
      } else {
        reject(error)
      }
    })
  })
}

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
      webSecurity: true,
      enableWebSecurity: true,
    },
  })
  
  // Set Content Security Policy via session (for HTTP/HTTPS requests in dev mode)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details: any, callback: any) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.googleapis.com https://accounts.google.com; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com https://*.google.com wss://*.firebaseio.com; " +
          "frame-src 'self' https://*.google.com https://*.firebaseapp.com https://accounts.google.com;"
        ],
      },
    })
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Normalize dev server URL to ensure it ends with a trailing slash
    const devServerUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL.endsWith('/') 
      ? MAIN_WINDOW_VITE_DEV_SERVER_URL 
      : MAIN_WINDOW_VITE_DEV_SERVER_URL + '/'
    
    await splash.loadURL(devServerUrl + 'splash/index.html');
    await mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    // Start local HTTP server for production (required for Firebase Auth)
    const port = await startLocalServer()
    const localUrl = `http://localhost:${port}`
    
    await splash.loadURL(`${localUrl}/splash/index.html`)
    await mainWindow.loadURL(localUrl)
    // Note: DevTools disabled in production for security
  }

  
  // Hide splash and show main window after 2.5 seconds
  setTimeout(() => { splash?.close(); mainWindow.show(); }, 2500);
  

  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Allow Firebase authentication popups
    const urlObj = new URL(url)
    const isFirebaseAuth = urlObj.hostname.includes('firebaseapp.com') || 
                          urlObj.hostname.includes('googleapis.com') ||
                          urlObj.hostname.includes('accounts.google.com') ||
                          urlObj.hostname.includes('google.com')
    
    if (isFirebaseAuth) {
      // Allow popup for Firebase auth - Electron will create the window
      return { action: 'allow' }
    }
    
    // For other URLs, open in external browser
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// WhatsApp Handlers
let whatsappClient: any = null
let whatsappQRCode: string | null = null
let isInitialized = false

const setupWhatsAppHandlers = () => {
  ipcMain.handle('whatsapp:initialize', async (_event: any, options: { sessionPath?: string }) => {
    try {
      // Dynamically import wwebjs-electron only when needed
      const { Client, LocalAuth } = require('wwebjs-electron')

      if (whatsappClient) {
        await whatsappClient.destroy()
      }

      const sessionPath = options.sessionPath || join(app.getPath('userData'), 'whatsapp-session')

      whatsappClient = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPath,
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      })

      whatsappClient.on('qr', (qr: string) => {
        // wwebjs-electron returns QR code as base64 string, store it as is
        whatsappQRCode = qr
        // Send QR code to all windows
        BrowserWindow.getAllWindows().forEach((window: any) => {
          window.webContents.send('whatsapp:qr', qr)
        })
      })

      whatsappClient.on('ready', () => {
        isInitialized = true
        whatsappQRCode = null
        BrowserWindow.getAllWindows().forEach((window: any) => {
          window.webContents.send('whatsapp:ready')
        })
      })

      whatsappClient.on('authenticated', () => {
        isInitialized = true
        whatsappQRCode = null
      })

      whatsappClient.on('auth_failure', (msg: string) => {
        console.error('WhatsApp authentication failed:', msg)
        isInitialized = false
        BrowserWindow.getAllWindows().forEach((window: any) => {
          window.webContents.send('whatsapp:auth_failure', msg)
        })
      })

      whatsappClient.on('disconnected', () => {
        isInitialized = false
        BrowserWindow.getAllWindows().forEach((window: any) => {
          window.webContents.send('whatsapp:disconnected')
        })
      })

      await whatsappClient.initialize()

      return {
        success: true,
        connected: whatsappClient.info !== undefined,
      }
    } catch (error: any) {
      console.error('WhatsApp initialization error:', error)
      return {
        success: false,
        error: error.message || 'Failed to initialize WhatsApp',
      }
    }
  })

  ipcMain.handle('whatsapp:getQR', async () => {
    return { qrCode: whatsappQRCode }
  })

  ipcMain.handle('whatsapp:checkConnection', async () => {
    try {
      if (!whatsappClient) {
        return { connected: false }
      }

      const info = whatsappClient.info
      return { connected: !!info }
    } catch (error) {
      return { connected: false }
    }
  })

  ipcMain.handle('whatsapp:sendMessage', async (_event: any, options: { to: string; message: string; mediaPath?: string; caption?: string }) => {
    try {
      if (!whatsappClient || !isInitialized) {
        throw new Error('WhatsApp client is not initialized')
      }

      const { to, message, mediaPath, caption } = options

      // Format phone number (remove + and add @c.us for WhatsApp)
      let phoneNumber = to.replace(/\D/g, '')
      if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
        phoneNumber = `91${phoneNumber}`
      }
      const chatId = `${phoneNumber}@c.us`

      if (mediaPath) {
        const { MessageMedia } = require('wwebjs-electron')
        const media = MessageMedia.fromFilePath(mediaPath)
        await whatsappClient.sendMessage(chatId, media, { caption: caption || message })
      } else {
        await whatsappClient.sendMessage(chatId, message)
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error)
      return {
        success: false,
        error: error.message || 'Failed to send message',
      }
    }
  })

  ipcMain.handle('whatsapp:disconnect', async () => {
    try {
      if (whatsappClient) {
        await whatsappClient.destroy()
        whatsappClient = null
        isInitialized = false
        whatsappQRCode = null
      }
      return { success: true }
    } catch (error: any) {
      console.error('Error disconnecting WhatsApp:', error)
      return {
        success: false,
        error: error.message || 'Failed to disconnect',
      }
    }
  })
}

app.whenReady().then(() => {
  setupWhatsAppHandlers()
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
  // Clean up local server
  if (localServer) {
    localServer.close()
    localServer = null
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clean up local server before quitting
  if (localServer) {
    localServer.close()
    localServer = null
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

// PDF Generation Handler
ipcMain.handle('generate:pdf', async (_event: any, options: { html: string; filename: string }) => {
  try {
    const { join } = require('path')
    const { writeFileSync } = require('fs')
    const { app } = require('electron')
    
    // Try to use puppeteer-core if available, otherwise use electron's webContents
    let pdfBuffer: Buffer
    
    try {
      const puppeteer = require('puppeteer-core')
      const executablePath = puppeteer.executablePath()
      
      const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()
      await page.setContent(options.html, { waitUntil: 'networkidle0' })

      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      })

      await browser.close()
    } catch (puppeteerError) {
      // Fallback: Use a hidden BrowserWindow to print to PDF
      const { BrowserWindow } = require('electron')
      const pdfWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })

      await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(options.html)}`)
      
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait for content to load
      
      pdfBuffer = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        margins: {
          top: 0.79,
          right: 0.59,
          bottom: 0.79,
          left: 0.59,
        },
      })

      pdfWindow.close()
    }

    // Save PDF to temp directory
    const tempPath = join(app.getPath('temp'), options.filename)
    writeFileSync(tempPath, pdfBuffer)

    return {
      success: true,
      filePath: tempPath,
    }
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate PDF',
    }
  }
})

