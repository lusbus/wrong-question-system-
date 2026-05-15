export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class RendererLogger {
  private module: string
  private level: LogLevel

  constructor(module: string, level: LogLevel = LogLevel.DEBUG) {
    this.module = module
    this.level = level
  }

  private formatLevel(level: LogLevel): string {
    return LogLevel[level].padEnd(5)
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍'
      case LogLevel.INFO: return 'ℹ️'
      case LogLevel.WARN: return '⚠️'
      case LogLevel.ERROR: return '❌'
      default: return ''
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const emoji = this.getEmoji(level)
    const levelStr = this.formatLevel(level)
    const moduleStr = `[${this.module}]`.padEnd(25)
    const timestamp = new Date().toISOString().split('T')[1].replace('Z', '')
    
    let msg = `${emoji} ${timestamp} ${levelStr} ${moduleStr} ${message}`
    
    if (data !== undefined) {
      try {
        if (typeof data === 'string') {
          msg += ` | ${data}`
        } else {
          const dataStr = JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')
          msg += `\n  Data: ${dataStr}`
        }
      } catch {
        msg += ` | [${String(data)}]`
      }
    }
    
    return msg
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    console.debug(this.formatMessage(LogLevel.DEBUG, message, data))
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    console.info(this.formatMessage(LogLevel.INFO, message, data))
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    console.warn(this.formatMessage(LogLevel.WARN, message, data))
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack, ...data }
      : { error, ...data }
    
    console.error(this.formatMessage(LogLevel.ERROR, message, errorData))
  }

  critical(message: string, error?: Error | any, data?: any): void {
    // Critical is same level as ERROR for renderer but with more emphasis
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack, critical: true, ...data }
      : { error, critical: true, ...data }
    
    console.error(this.formatMessage(LogLevel.ERROR, `🔥 CRITICAL: ${message}`, errorData))
  }

  // Helper for component lifecycle
  logComponentMount(): void {
    this.info('Component mounted')
  }

  logComponentUnmount(): void {
    this.info('Component unmounted')
  }

  // Helper for API calls
  logApiCall(endpoint: string, data?: any): void {
    this.info(`API call: ${endpoint}`, data)
  }

  logApiResponse(endpoint: string, result?: any, duration?: number): void {
    this.debug(`API response: ${endpoint}`, {
      success: result !== undefined,
      duration: duration ? `${duration}ms` : undefined
    })
  }

  // Helper for user actions
  logUserAction(action: string, data?: any): void {
    this.info(`User action: ${action}`, data)
  }
}

export function createRendererLogger(module: string, level?: LogLevel): RendererLogger {
  return new RendererLogger(module, level)
}
