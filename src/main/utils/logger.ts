import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  levelName: string
  module: string
  message: string
  data?: any
  stack?: string
}

export class Logger {
  private static instance: Logger
  private logDir: string
  private logFile: string
  private maxFileSize = 10 * 1024 * 1024 // 10MB
  private maxFiles = 5
  private level: LogLevel
  private enableConsole = true
  private enableFile = true
  private module: string

  private constructor(module: string, level?: LogLevel) {
    this.module = module
    this.level = level ?? LogLevel.DEBUG
    
    if (app.isReady()) {
      this.logDir = path.join(app.getPath('userData'), 'logs')
    } else {
      this.logDir = path.join(process.cwd(), 'logs')
    }
    
    this.logFile = path.join(this.logDir, `gwy-${this.formatDate(new Date())}.log`)
    
    this.ensureLogDir()
    this.rotateLogs()
  }

  static getInstance(module: string, level?: LogLevel): Logger {
    // 创建新的 Logger 实例，每个模块一个
    return new Logger(module, level)
  }

  static setGlobalLevel(level: LogLevel): void {
    Logger.globalLevel = level
  }

  private static globalLevel: LogLevel = LogLevel.DEBUG

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private formatTime(date: Date): string {
    return date.toISOString().split('T')[1].replace('Z', '')
  }

  private getLevelName(level: LogLevel): string {
    return LogLevel[level]
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍'
      case LogLevel.INFO: return 'ℹ️'
      case LogLevel.WARN: return '⚠️'
      case LogLevel.ERROR: return '❌'
      case LogLevel.CRITICAL: return '🔥'
      default: return ''
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= Math.max(this.level, Logger.globalLevel)
  }

  private formatLogEntry(entry: LogEntry): string {
    const emoji = this.getLevelEmoji(entry.level)
    const timestamp = entry.timestamp
    const level = entry.levelName.padEnd(8)
    const module = `[${entry.module}]`.padEnd(20)
    const message = entry.message
    
    let logLine = `${emoji} ${timestamp} ${level} ${module} ${message}`
    
    if (entry.data) {
      logLine += '\n  Data: ' + this.formatData(entry.data)
    }
    
    if (entry.stack) {
      logLine += '\n  Stack: ' + entry.stack
    }
    
    return logLine
  }

  private formatData(data: any): string {
    try {
      if (typeof data === 'string') return data
      return JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')
    } catch {
      return String(data)
    }
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.enableFile) return

    try {
      const logLine = this.formatLogEntry(entry) + '\n'
      fs.appendFileSync(this.logFile, logLine, 'utf8')
    } catch (err) {
      console.error('Failed to write to log file:', err)
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.enableConsole) return

    const emoji = this.getLevelEmoji(entry.level)
    const timestamp = entry.timestamp
    const level = entry.levelName.padEnd(8)
    const module = `[${entry.module}]`.padEnd(20)
    const message = entry.message

    const logArgs = [`${emoji} ${timestamp} ${level} ${module}`, message]
    
    if (entry.data) {
      logArgs.push(this.formatData(entry.data))
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...logArgs)
        break
      case LogLevel.INFO:
        console.log(...logArgs)
        break
      case LogLevel.WARN:
        console.warn(...logArgs)
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(...logArgs)
        break
    }
  }

  private rotateLogs(): void {
    try {
      if (!fs.existsSync(this.logDir)) return

      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('gwy-') && f.endsWith('.log'))
        .sort()

      while (files.length > this.maxFiles) {
        const oldest = files.shift()
        if (oldest) {
          fs.unlinkSync(path.join(this.logDir, oldest))
        }
      }

      // Check file size
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile)
        if (stats.size > this.maxFileSize) {
          const backupPath = this.logFile.replace('.log', `-${Date.now()}.log`)
          fs.renameSync(this.logFile, backupPath)
        }
      }
    } catch (err) {
      console.error('Failed to rotate logs:', err)
    }
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    
    const entry: LogEntry = {
      timestamp: this.formatTime(new Date()),
      level: LogLevel.DEBUG,
      levelName: this.getLevelName(LogLevel.DEBUG),
      module: this.module,
      message,
      data
    }
    
    this.writeToConsole(entry)
    this.writeToFile(entry)
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    
    const entry: LogEntry = {
      timestamp: this.formatTime(new Date()),
      level: LogLevel.INFO,
      levelName: this.getLevelName(LogLevel.INFO),
      module: this.module,
      message,
      data
    }
    
    this.writeToConsole(entry)
    this.writeToFile(entry)
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    
    const entry: LogEntry = {
      timestamp: this.formatTime(new Date()),
      level: LogLevel.WARN,
      levelName: this.getLevelName(LogLevel.WARN),
      module: this.module,
      message,
      data
    }
    
    this.writeToConsole(entry)
    this.writeToFile(entry)
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const entry: LogEntry = {
      timestamp: this.formatTime(new Date()),
      level: LogLevel.ERROR,
      levelName: this.getLevelName(LogLevel.ERROR),
      module: this.module,
      message,
      data,
      stack: error?.stack || (error instanceof Error ? error.message : undefined)
    }
    
    this.writeToConsole(entry)
    this.writeToFile(entry)
  }

  critical(message: string, error?: Error | any, data?: any): void {
    if (!this.shouldLog(LogLevel.CRITICAL)) return
    
    const entry: LogEntry = {
      timestamp: this.formatTime(new Date()),
      level: LogLevel.CRITICAL,
      levelName: this.getLevelName(LogLevel.CRITICAL),
      module: this.module,
      message,
      data,
      stack: error?.stack || (error instanceof Error ? error.message : undefined)
    }
    
    this.writeToConsole(entry)
    this.writeToFile(entry)
  }

  // Helper for logging function calls
  logFunctionCall(fnName: string, args?: any): void {
    this.debug(`Calling ${fnName}`, args ? { args } : undefined)
  }

  // Helper for logging function results
  logFunctionResult(fnName: string, result?: any, duration?: number): void {
    this.debug(`${fnName} completed`, {
      result: result !== undefined ? '[result]' : undefined,
      duration: duration ? `${duration}ms` : undefined
    })
  }

  // Helper for logging errors with context
  logError(message: string, error: Error | any, context?: any): void {
    this.error(message, error, context)
  }

  // Helper for logging performance
  logPerformance(operation: string, duration: number, extra?: any): void {
    this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...extra
    })
  }
}

// Export a factory function
export function createLogger(module: string, level?: LogLevel): Logger {
  return Logger.getInstance(module, level)
}
