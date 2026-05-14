import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipc/handlers'
import { MarkdownService } from './services/markdownService'
import { closeDatabase } from './database/connection'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const notebookPath = join(app.getPath('documents'), '公考错题本')
  const markdownService = new MarkdownService(notebookPath)
  setupIpcHandlers(markdownService)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  closeDatabase()
})
