import { getDatabase } from './connection'
import { WrongQuestion, QuestionStats } from '../../shared/types'

export const questionRepository = {
  create(question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'>): number {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO wrong_questions (
        subject, question_type, question_content, user_answer, 
        correct_answer, error_type, error_analysis, correct_solution,
        knowledge_points, similar_questions, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      question.subject,
      question.questionType,
      question.questionContent,
      question.userAnswer,
      question.correctAnswer,
      question.errorType,
      question.errorAnalysis,
      question.correctSolution,
      JSON.stringify(question.knowledgePoints),
      JSON.stringify(question.similarQuestions),
      question.status,
      question.source
    )
    
    return result.lastInsertRowid as number
  },

  findById(id: number): WrongQuestion | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM wrong_questions WHERE id = ?')
    const row = stmt.get(id) as any
    return row ? parseQuestion(row) : null
  },

  findAll(): WrongQuestion[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM wrong_questions ORDER BY created_at DESC').all() as any[]
    return rows.map(parseQuestion)
  },

  findBySubject(subject: string): WrongQuestion[] {
    const db = getDatabase()
    const rows = db.prepare(
      'SELECT * FROM wrong_questions WHERE subject = ? ORDER BY created_at DESC'
    ).all(subject) as any[]
    return rows.map(parseQuestion)
  },

  findByType(questionType: string): WrongQuestion[] {
    const db = getDatabase()
    const rows = db.prepare(
      'SELECT * FROM wrong_questions WHERE question_type = ? ORDER BY created_at DESC'
    ).all(questionType) as any[]
    return rows.map(parseQuestion)
  },

  updateStatus(id: number, status: 'pending' | 'mastered'): void {
    const db = getDatabase()
    db.prepare('UPDATE wrong_questions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, id)
  },

  delete(id: number): void {
    const db = getDatabase()
    db.prepare('DELETE FROM wrong_questions WHERE id = ?').run(id)
  },

  getStats(): QuestionStats {
    const db = getDatabase()
    const total = db.prepare('SELECT COUNT(*) as count FROM wrong_questions').get() as any
    const mastered = db.prepare(
      'SELECT COUNT(*) as count FROM wrong_questions WHERE status = ?'
    ).get('mastered') as any
    const pending = db.prepare(
      'SELECT COUNT(*) as count FROM wrong_questions WHERE status = ?'
    ).get('pending') as any

    const byTypeRows = db.prepare(
      'SELECT question_type, COUNT(*) as count FROM wrong_questions GROUP BY question_type'
    ).all() as any[]
    
    const byType: Record<string, number> = {}
    byTypeRows.forEach(row => {
      byType[row.question_type] = row.count
    })

    const weakPointsRows = db.prepare(`
      SELECT value as point, COUNT(*) as count
      FROM wrong_questions, json_each(knowledge_points)
      GROUP BY value
      ORDER BY count DESC
      LIMIT 10
    `).all() as any[]
    
    const weakPoints = weakPointsRows.map(r => r.point)

    return {
      total: total.count,
      mastered: mastered.count,
      pending: pending.count,
      byType,
      weakPoints
    }
  }
}

function parseQuestion(row: any): WrongQuestion {
  return {
    id: row.id,
    subject: row.subject,
    questionType: row.question_type,
    questionContent: row.question_content,
    userAnswer: row.user_answer,
    correctAnswer: row.correct_answer,
    errorType: row.error_type,
    errorAnalysis: row.error_analysis,
    correctSolution: row.correct_solution,
    knowledgePoints: JSON.parse(row.knowledge_points || '[]'),
    similarQuestions: JSON.parse(row.similar_questions || '[]'),
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
