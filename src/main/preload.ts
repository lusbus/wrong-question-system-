import { contextBridge, ipcRenderer } from 'electron'

const LOG_PREFIX = '[Preload]'
let isLoaded = false

function log(...args: any[]): void {
  console.log(LOG_PREFIX, new Date().toISOString().split('T')[1].replace('Z', ''), ...args)
}

log('Preload script starting...')

const electronAPI = {
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    const startTime = Date.now()
    log(`[IPC] Invoking: ${channel}`, { argsCount: args.length })
    
    try {
      const result = await ipcRenderer.invoke(channel, ...args)
      const duration = Date.now() - startTime
      log(`[IPC] Success: ${channel}`, { duration: `${duration}ms` })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      log(`[IPC] Error: ${channel}`, error, { duration: `${duration}ms` })
      throw error
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

isLoaded = true
log('Preload script completed, electronAPI exposed to window')

// Add diagnostic functions
contextBridge.exposeInMainWorld('__preload__', {
  isLoaded: () => isLoaded,
  getTimestamp: () => new Date().toISOString()
})
