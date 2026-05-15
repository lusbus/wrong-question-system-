import { getDatabase, saveDatabase } from './connection'
import { WrongQuestion, QuestionStats } from '../../shared/types'
import { createLogger, LogLevel } from '../utils/logger'

const log = createLogger('QuestionRepository', LogLevel.DEBUG)

export const questionRepository = {
  async create(question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const startTime = Date.now()
    log.info('Creating new question', { type: question.questionType, subject: question.subject })
    
    const db = await getDatabase()
    
    db.run(`
      INSERT INTO wrong_questions (
        subject, question_type, question_content, user_answer, 
        correct_answer, error_type, error_analysis, correct_solution,
        knowledge_points, similar_questions, status, source,
        structure_analysis, error_cause_type, error_cause_detail, option_analysis,
        avoid_pitfall_mantra, similar_question_ids, self_check_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
      question.source,
      question.structureAnalysis || null,
      question.errorCauseType || null,
      question.errorCauseDetail || null,
      question.optionAnalysis || null,
      question.avoidPitfallMantra || null,
      question.similarQuestionIds || null,
      question.selfCheckAction || null
    ])
    
    saveDatabase()
    
    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0].values[0][0] as number
    
    log.info('Question created successfully', { id, duration: `${Date.now() - startTime}ms` })
    return id
  },

  async findById(id: number): Promise<WrongQuestion | null> {
    log.debug('Finding question by ID', { id })
    const db = await getDatabase()
    const result = db.exec('SELECT * FROM wrong_questions WHERE id = ?', [id])
    const question = result.length > 0 ? parseQuestionRow(result[0]) : null
    log.debug('Find by ID completed', { id, found: Boolean(question) })
    return question
  },

  async findAll(): Promise<WrongQuestion[]> {
    log.debug('Finding all questions')
    const db = await getDatabase()
    const result = db.exec('SELECT * FROM wrong_questions ORDER BY created_at DESC')
    const questions = result.length > 0 ? result[0].values.map(parseQuestionValues) : []
    log.debug('Find all completed', { count: questions.length })
    return questions
  },

  async findBySubject(subject: string): Promise<WrongQuestion[]> {
    log.debug('Finding questions by subject', { subject })
    const db = await getDatabase()
    const result = db.exec(
      'SELECT * FROM wrong_questions WHERE subject = ? ORDER BY created_at DESC',
      [subject]
    )
    const questions = result.length > 0 ? result[0].values.map(parseQuestionValues) : []
    log.debug('Find by subject completed', { subject, count: questions.length })
    return questions
  },

  async findByType(questionType: string): Promise<WrongQuestion[]> {
    log.debug('Finding questions by type', { questionType })
    const db = await getDatabase()
    const result = db.exec(
      'SELECT * FROM wrong_questions WHERE question_type = ? ORDER BY created_at DESC',
      [questionType]
    )
    const questions = result.length > 0 ? result[0].values.map(parseQuestionValues) : []
    log.debug('Find by type completed', { questionType, count: questions.length })
    return questions
  },

  async updateStatus(id: number, status: 'pending' | 'mastered'): Promise<void> {
    log.info('Updating question status', { id, status })
    const db = await getDatabase()
    db.run(
      'UPDATE wrong_questions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    )
    saveDatabase()
    log.info('Question status updated', { id, status })
  },

  async delete(id: number): Promise<void> {
    log.info('Deleting question', { id })
    const db = await getDatabase()
    db.run('DELETE FROM wrong_questions WHERE id = ?', [id])
    saveDatabase()
    log.info('Question deleted', { id })
  },

  async getStats(): Promise<QuestionStats> {
    log.debug('Getting statistics')
    const startTime = Date.now()
    const db = await getDatabase()
    
    const totalResult = db.exec('SELECT COUNT(*) FROM wrong_questions')
    const masteredResult = db.exec("SELECT COUNT(*) FROM wrong_questions WHERE status = 'mastered'")
    const pendingResult = db.exec("SELECT COUNT(*) FROM wrong_questions WHERE status = 'pending'")
    
    const byTypeResult = db.exec(
      'SELECT question_type, COUNT(*) FROM wrong_questions GROUP BY question_type'
    )
    
    const byType: Record<string, number> = {}
    if (byTypeResult.length > 0) {
      byTypeResult[0].values.forEach(([type, count]) => {
        byType[type as string] = count as number
      })
    }

    const weakPointsResult = db.exec(`
      SELECT value, COUNT(*) as count
      FROM wrong_questions, json_each(knowledge_points)
      GROUP BY value
      ORDER BY count DESC
      LIMIT 10
    `)
    
    const weakPoints: string[] = []
    if (weakPointsResult.length > 0) {
      weakPointsResult[0].values.forEach(([point]) => {
        weakPoints.push(point as string)
      })
    }

    const stats = {
      total: totalResult[0]?.values[0]?.[0] as number || 0,
      mastered: masteredResult[0]?.values[0]?.[0] as number || 0,
      pending: pendingResult[0]?.values[0]?.[0] as number || 0,
      byType,
      weakPoints
    }
    
    log.debug('Statistics retrieved', { 
      duration: `${Date.now() - startTime}ms`,
      total: stats.total 
    })
    return stats
  }
}

const COLUMN_NAMES = ['id', 'subject', 'question_type', 'question_content', 'user_answer', 'correct_answer', 'error_type', 'error_analysis', 'correct_solution', 'knowledge_points', 'similar_questions', 'status', 'source', 'structure_analysis', 'error_cause_type', 'error_cause_detail', 'option_analysis', 'avoid_pitfall_mantra', 'similar_question_ids', 'self_check_action', 'created_at', 'updated_at']

function parseQuestionRow(row: { columns: string[]; values: any[][] }): WrongQuestion {
  const values = row.values[0]
  return parseQuestionValues(values)
}

function parseQuestionValues(values: any[]): WrongQuestion {
  const row: Record<string, any> = {}
  COLUMN_NAMES.forEach((name, i) => {
    row[name] = values[i]
  })
  
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
    structureAnalysis: row.structure_analysis,
    errorCauseType: row.error_cause_type,
    errorCauseDetail: row.error_cause_detail,
    optionAnalysis: row.option_analysis,
    avoidPitfallMantra: row.avoid_pitfall_mantra,
    similarQuestionIds: row.similar_question_ids,
    selfCheckAction: row.self_check_action,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
