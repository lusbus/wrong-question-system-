import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipc/handlers'
import { MarkdownService } from './services/markdownService'
import { closeDatabase } from './database/connection'
import { createLogger, LogLevel } from './utils/logger'

const log = createLogger('MainProcess', LogLevel.DEBUG)

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  log.info('Creating main window...')
  
  log.debug('Window configuration', {
    width: 1400,
    height: 900,
    show: false,
    nodeIntegration: false,
    contextIsolation: true
  })
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
  log.info('Environment info', {
    VITE_DEV_SERVER_URL: VITE_DEV_SERVER_URL || 'not set (production mode)',
    __dirname,
    preloadPath: join(__dirname, 'preload.js'),
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform
  })

  if (VITE_DEV_SERVER_URL) {
    log.info('Loading from dev server URL:', VITE_DEV_SERVER_URL)
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    const htmlPath = join(__dirname, '../index.html')
    log.info('Loading from file:', htmlPath)
    mainWindow.loadFile(htmlPath)
  }

  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    log.info('Window ready to show, displaying...')
    mainWindow?.show()
  })

  mainWindow.webContents.on('did-start-loading', () => {
    log.info('Page started loading...')
  })

  mainWindow.webContents.on('did-stop-loading', () => {
    log.info('Page stopped loading')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Page finished loading successfully')
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('Failed to load page!', {
      errorCode,
      errorDescription,
      url: validatedURL
    })
  })

  mainWindow.webContents.on('dom-ready', () => {
    log.info('DOM is ready')
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelNames = ['debug', 'log', 'warning', 'error']
    const levelColors = ['\x1b[36m', '\x1b[37m', '\x1b[33m', '\x1b[31m']
    const reset = '\x1b[0m'
    console.log(
      `${levelColors[level]}[Renderer ${levelNames[level]}]${reset} ${message}`,
      sourceId ? `(${sourceId}:${line})` : ''
    )
  })

  mainWindow.webContents.on('crashed', (event, killed) => {
    log.critical('Renderer process crashed!', { killed })
  })

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('Renderer process became unresponsive')
  })

  mainWindow.webContents.on('responsive-wakeup', () => {
    log.info('Renderer process became responsive again')
  })

  mainWindow.on('closed', () => {
    log.info('Main window closed')
    mainWindow = null
  })

  log.info('Window created successfully, waiting for page load...')
}

app.whenReady().then(async () => {
  log.info('========================================')
  log.info('Application starting')
  log.info('========================================')
  log.info('System info', {
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    platform: process.platform,
    arch: process.arch
  })
  
  try {
    const userDataPath = app.getPath('userData')
    const documentsPath = app.getPath('documents')
    const notebookPath = join(documentsPath, '公考错题本')
    
    log.info('Paths', {
      userData: userDataPath,
      documents: documentsPath,
      notebook: notebookPath,
      logs: join(userDataPath, 'logs')
    })
    
    log.info('Initializing MarkdownService...')
    const markdownService = new MarkdownService(notebookPath)
    log.info('MarkdownService initialized successfully')
    
    log.info('Setting up IPC handlers...')
    setupIpcHandlers(markdownService)
    log.info('IPC handlers setup successfully')
    
    log.info('Creating main window...')
    createWindow()
    
    log.info('========================================')
    log.info('Application initialized successfully!')
    log.info('========================================')
  } catch (error) {
    log.critical('Initialization failed!', error as Error)
    console.error('Full error:', error)
    
    // Try to create window anyway so user can see settings
    try {
      createWindow()
    } catch (windowError) {
      log.critical('Failed to create window after init error', windowError as Error)
    }
  }

  app.on('activate', () => {
    log.info('App activated')
    if (BrowserWindow.getAllWindows().length === 0) {
      log.info('No windows found, creating new one')
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  log.info('All windows closed, shutting down...')
  try {
    closeDatabase()
    log.info('Database closed successfully')
  } catch (error) {
    log.error('Error closing database', error as Error)
  }
  if (process.platform !== 'darwin') {
    log.info('Quitting application')
    app.quit()
  }
})

app.on('quit', () => {
  log.info('Application quit')
})

app.on('will-quit', () => {
  log.info('Application will quit')
})

process.on('uncaughtException', (error) => {
  log.critical('Uncaught Exception!', error)
})

process.on('unhandledRejection', (reason, promise) => {
  log.critical('Unhandled Rejection at:', promise, 'reason:', reason)
})

log.info('Main process module loaded, waiting for app ready...')
log.info('Node version:', process.version)
log.info('Electron version:', process.versions.electron)
