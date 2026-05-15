import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { createRendererLogger } from './utils/logger'

const log = createRendererLogger('Renderer')

// Add global error handler
window.addEventListener('error', (event) => {
  log.error('Uncaught error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  })
})

window.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled promise rejection', {
    reason: event.reason
  })
})

log.info('========================================')
log.info('Renderer process starting')
log.info('========================================')
log.info('Environment info', {
  userAgent: navigator.userAgent,
  url: window.location.href,
  timestamp: new Date().toISOString()
})

const rootElement = document.getElementById('root')

if (rootElement) {
  log.info('Root element found, mounting React app...')
  log.debug('Clearing root element')
  rootElement.innerHTML = ''
  
  const startTime = Date.now()
  
  try {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
    
    const duration = Date.now() - startTime
    log.info('========================================')
    log.info('React app mounted successfully!', {
      duration: `${duration}ms`
    })
    log.info('========================================')
  } catch (error) {
    const duration = Date.now() - startTime
    log.critical('Failed to mount React app!', error, {
      duration: `${duration}ms`
    })
    
    // Show error UI
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; color: red;">
        <h1>❌ 渲染失败</h1>
        <p>React 应用启动失败，请检查控制台日志</p>
        <pre style="background: #f5f5f5; padding: 20px; border-radius: 4px; overflow: auto; max-height: 400px;">
          ${error instanceof Error ? error.stack : String(error)}
        </pre>
      </div>
    `
  }
} else {
  log.critical('Root element not found!')
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: sans-serif; color: red;">
      <h1>❌ 错误</h1>
      <p>找不到 #root 元素</p>
    </div>
  `
}
