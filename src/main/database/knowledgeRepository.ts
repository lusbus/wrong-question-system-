import { getDatabase } from './connection'
import { KnowledgePoint } from '../../shared/types'

export const knowledgeRepository = {
  create(kp: Omit<KnowledgePoint, 'id' | 'createdAt'>): number {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO knowledge_points (name, subject, category, parent_id, description)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(kp.name, kp.subject, kp.category, kp.parentId || null, kp.description)
    return result.lastInsertRowid as number
  },

  findAll(): KnowledgePoint[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM knowledge_points ORDER BY category, name').all() as any[]
    return rows.map(parseKnowledgePoint)
  },

  findBySubject(subject: string): KnowledgePoint[] {
    const db = getDatabase()
    const rows = db.prepare(
      'SELECT * FROM knowledge_points WHERE subject = ? ORDER BY category, name'
    ).all(subject) as any[]
    return rows.map(parseKnowledgePoint)
  },

  findByName(name: string): KnowledgePoint | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM knowledge_points WHERE name = ?').get(name) as any
    return row ? parseKnowledgePoint(row) : null
  }
}

function parseKnowledgePoint(row: any): KnowledgePoint {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    category: row.category,
    parentId: row.parent_id,
    description: row.description,
    createdAt: row.created_at
  }
}
