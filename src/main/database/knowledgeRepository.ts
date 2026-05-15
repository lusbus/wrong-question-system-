import { getDatabase, saveDatabase } from './connection'
import { KnowledgePoint } from '../../shared/types'

export const knowledgeRepository = {
  async create(kp: Omit<KnowledgePoint, 'id' | 'createdAt'>): Promise<number> {
    const db = await getDatabase()
    
    db.run(`
      INSERT OR IGNORE INTO knowledge_points (name, subject, category, parent_id, description)
      VALUES (?, ?, ?, ?, ?)
    `, [kp.name, kp.subject, kp.category, kp.parentId || null, kp.description])
    
    saveDatabase()
    
    const result = db.exec('SELECT last_insert_rowid() as id')
    return result[0]?.values[0]?.[0] as number
  },

  async findAll(): Promise<KnowledgePoint[]> {
    const db = await getDatabase()
    const result = db.exec('SELECT * FROM knowledge_points ORDER BY category, name')
    return result.length > 0 ? result[0].values.map(parseKnowledgePointValues) : []
  },

  async findBySubject(subject: string): Promise<KnowledgePoint[]> {
    const db = await getDatabase()
    const result = db.exec(
      'SELECT * FROM knowledge_points WHERE subject = ? ORDER BY category, name',
      [subject]
    )
    return result.length > 0 ? result[0].values.map(parseKnowledgePointValues) : []
  },

  async findByName(name: string): Promise<KnowledgePoint | null> {
    const db = await getDatabase()
    const result = db.exec('SELECT * FROM knowledge_points WHERE name = ?', [name])
    return result.length > 0 ? parseKnowledgePointValues(result[0].values[0]) : null
  }
}

const KP_COLUMNS = ['id', 'name', 'subject', 'category', 'parent_id', 'description', 'created_at']

function parseKnowledgePointValues(values: any[]): KnowledgePoint {
  const row: Record<string, any> = {}
  KP_COLUMNS.forEach((name, i) => {
    row[name] = values[i]
  })
  
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
