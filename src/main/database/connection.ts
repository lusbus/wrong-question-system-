import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { readFileSync } from 'fs'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'gwy.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeDatabase(db)
  }
  return db
}

function initializeDatabase(database: Database.Database): void {
  const schemaPath = join(app.getAppPath(), 'database', 'init.sql')
  const schema = readFileSync(schemaPath, 'utf-8')
  database.exec(schema)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
