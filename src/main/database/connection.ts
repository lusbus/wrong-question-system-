import initSqlJs, { Database } from 'sql.js'
import { join } from 'path'
import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createLogger, LogLevel } from '../utils/logger'

const log = createLogger('Database', LogLevel.DEBUG)

let db: Database | null = null
const DB_PATH = join(app.getPath('userData'), 'gwy.db')

export async function getDatabase(): Promise<Database> {
  if (!db) {
    log.info('Initializing database connection', { path: DB_PATH })
    const startTime = Date.now()
    const SQL = await initSqlJs()
    
    if (existsSync(DB_PATH)) {
      log.info('Loading existing database file', { path: DB_PATH })
      const buffer = readFileSync(DB_PATH)
      db = new SQL.Database(buffer)
      log.info('Database loaded from file')
    } else {
      log.info('Creating new database', { path: DB_PATH })
      db = new SQL.Database()
    }
    
    db.run('PRAGMA journal_mode = WAL')
    db.run('PRAGMA foreign_keys = ON')
    initializeDatabase(db)
    
    const duration = Date.now() - startTime
    log.info('Database initialized successfully', { duration: `${duration}ms` })
  }
  return db
}

function initializeDatabase(database: Database): void {
  const schemaPath = join(app.getAppPath(), 'database', 'init.sql')
  log.debug('Reading database schema', { path: schemaPath })
  const schema = readFileSync(schemaPath, 'utf-8')
  database.run(schema)
  log.info('Database schema initialized')
}

export function saveDatabase(): void {
  if (db) {
    const startTime = Date.now()
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(DB_PATH, buffer)
    const duration = Date.now() - startTime
    log.debug('Database saved', { duration: `${duration}ms`, path: DB_PATH })
  }
}

export function closeDatabase(): void {
  log.info('Closing database...')
  try {
    saveDatabase()
    db = null
    log.info('Database closed successfully')
  } catch (error) {
    log.error('Error closing database', error as Error)
  }
}
