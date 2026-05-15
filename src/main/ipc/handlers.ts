import { ipcMain } from 'electron'
import { questionRepository } from '../database/questionRepository'
import { aiService } from '../services/aiService'
import { MarkdownService } from '../services/markdownService'
import { AIConfig } from '../../shared/types'
import { getDatabase, saveDatabase } from '../database/connection'
import { createLogger, LogLevel } from '../utils/logger'

const log = createLogger('IPC', LogLevel.DEBUG)

function withErrorHandling(channel: string, handler: Function): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    const startTime = Date.now()
    log.debug(`[${channel}] Request received`, { argsCount: args.length })
    
    try {
      const result = await handler(...args)
      const duration = Date.now() - startTime
      log.debug(`[${channel}] Success`, { duration: `${duration}ms` })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      log.error(`[${channel}] Failed`, error as Error, {
        duration: `${duration}ms`,
        argsCount: args.length
      })
      throw error
    }
  })
}

export function setupIpcHandlers(markdownService: MarkdownService): void {
  log.info('Setting up IPC handlers...')

  withErrorHandling('question:create', async (question) => {
    log.info('[question:create] Creating question', { type: question?.type })
    const id = await questionRepository.create(question)
    log.info('[question:create] Created successfully', { id })
    
    const questions = await questionRepository.findAll()
    const stats = await questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
    return id
  })

  withErrorHandling('question:findAll', async () => {
    log.debug('[question:findAll] Fetching all questions')
    const questions = await questionRepository.findAll()
    log.debug('[question:findAll] Found', { count: questions?.length || 0 })
    return questions
  })

  withErrorHandling('question:findById', async (id: number) => {
    log.debug('[question:findById] Fetching question by ID', { id })
    const question = await questionRepository.findById(id)
    if (question) {
      log.debug('[question:findById] Found', { id })
    } else {
      log.warn('[question:findById] Not found', { id })
    }
    return question
  })

  withErrorHandling('question:updateStatus', async (id: number, status: string) => {
    log.info('[question:updateStatus] Updating status', { id, status })
    await questionRepository.updateStatus(id, status as 'pending' | 'mastered')
    
    const questions = await questionRepository.findAll()
    const stats = await questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
    log.info('[question:updateStatus] Updated and markdown refreshed', { id, status })
  })

  withErrorHandling('question:delete', async (id: number) => {
    log.info('[question:delete] Deleting question', { id })
    await questionRepository.delete(id)
    
    const questions = await questionRepository.findAll()
    const stats = await questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
    log.info('[question:delete] Deleted and markdown refreshed', { id })
  })

  withErrorHandling('question:getStats', async () => {
    log.debug('[question:getStats] Fetching statistics')
    const stats = await questionRepository.getStats()
    log.debug('[question:getStats] Statistics', stats)
    return stats
  })

  withErrorHandling('ai:analyzeError', async (
    question: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ) => {
    log.info('[ai:analyzeError] Starting analysis', { questionType })
    const result = await aiService.analyzeError(question, userAnswer, correctAnswer, questionType)
    log.info('[ai:analyzeError] Analysis completed', { 
      errorType: result?.errorType,
      knowledgePointsCount: result?.knowledgePoints?.length || 0
    })
    return result
  })

  withErrorHandling('ai:reanalyzeWithCorrectAnswer', async (
    question: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ) => {
    log.info('[ai:reanalyzeWithCorrectAnswer] Starting re-analysis', { questionType })
    const result = await aiService.reanalyzeWithCorrectAnswer(question, userAnswer, correctAnswer, questionType)
    log.info('[ai:reanalyzeWithCorrectAnswer] Re-analysis completed', { 
      errorType: result?.errorType,
      knowledgePointsCount: result?.knowledgePoints?.length || 0,
      hasCorrectionNote: Boolean(result?.correctionNote)
    })
    return result
  })

  withErrorHandling('ai:parseQuestion', async (content: string) => {
    log.info('[ai:parseQuestion] Parsing question content', { contentLength: content?.length || 0 })
    const result = await aiService.parseQuestion(content)
    log.info('[ai:parseQuestion] Parsing completed', { 
      hasCorrectAnswer: Boolean(result?.correctAnswer),
      optionsCount: Object.keys(result?.options || {}).length
    })
    return result
  })

  withErrorHandling('ai:analyzeReview', async (
    questionStem: string,
    options: Record<string, string>,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ) => {
    log.info('[ai:analyzeReview] Starting review analysis', { questionType })
    const result = await aiService.analyzeReview(questionStem, options, userAnswer, correctAnswer, questionType)
    log.info('[ai:analyzeReview] Review analysis completed', { 
      errorType: result?.errorType,
      errorCauseType: result?.errorCauseType,
      knowledgePointsCount: result?.knowledgePoints?.length || 0
    })
    return result
  })

  withErrorHandling('ai:generateSimilar', async (question: string, knowledgePoints: string) => {
    log.info('[ai:generateSimilar] Generating similar questions')
    const result = await aiService.generateSimilarQuestions(question, knowledgePoints)
    log.info('[ai:generateSimilar] Generated', { count: result?.length || 0 })
    return result
  })

  withErrorHandling('ai:generateAdvice', async (
    stats: { total: number; byType: Record<string, number>; weakPoints: string[] }
  ) => {
    log.info('[ai:generateAdvice] Generating study advice', { 
      totalQuestions: stats.total,
      weakPointsCount: stats.weakPoints?.length || 0
    })
    const result = await aiService.generateStudyAdvice(
      stats.total,
      stats.byType,
      stats.weakPoints.join(', '),
      {}
    )
    log.info('[ai:generateAdvice] Advice generated')
    return result
  })

  withErrorHandling('config:save', async (config: AIConfig) => {
    log.info('[config:save] Saving AI config', { 
      provider: config.provider, 
      model: config.model,
      baseUrl: config.baseUrl,
      apiKeyLength: config.apiKey?.length || 0,
      apiKeyPrefix: config.apiKey?.substring(0, 8) || 'none'
    })
    const db = await getDatabase()
    db.run(
      'INSERT OR REPLACE INTO ai_config (id, provider, api_key, model, base_url, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [config.id || null, config.provider, config.apiKey, config.model, config.baseUrl, config.isActive ? 1 : 0]
    )
    saveDatabase()
    
    // Verify the save
    const verifyResult = db.exec('SELECT * FROM ai_config WHERE is_active = 1 LIMIT 1')
    if (verifyResult.length > 0 && verifyResult[0].values.length > 0) {
      const row = verifyResult[0].values[0]
      log.info('[config:save] Verification - saved config:', {
        provider: row[1],
        model: row[3],
        baseUrl: row[4],
        apiKeyLength: (row[2] as string)?.length || 0
      })
    }
    
    log.info('[config:save] Config saved successfully')
  })

  withErrorHandling('config:get', async () => {
    log.debug('[config:get] Loading AI config')
    const db = await getDatabase()
    const result = db.exec('SELECT * FROM ai_config WHERE is_active = 1 LIMIT 1')
    
    if (!result.length || result[0].values.length === 0) {
      log.debug('[config:get] No config found')
      return null
    }
    
    const row = result[0].values[0]
    const config = {
      id: row[0],
      provider: row[1],
      apiKey: row[2],
      model: row[3],
      baseUrl: row[4],
      isActive: Boolean(row[5])
    }
    
    log.debug('[config:get] Config loaded', { provider: config.provider, model: config.model })
    return config
  })

  withErrorHandling('stats:getReviewStats', async () => {
    log.info('[stats:getReviewStats] Fetching review statistics')
    const db = await getDatabase()
    
    const totalResult = db.exec('SELECT COUNT(*) as total, SUM(CASE WHEN status = "mastered" THEN 1 ELSE 0 END) as mastered FROM wrong_questions')
    const total = totalResult[0]?.values[0]?.[0] as number || 0
    const mastered = totalResult[0]?.values[0]?.[1] as number || 0

    const errorCauseResult = db.exec('SELECT error_cause_type, COUNT(*) as count FROM wrong_questions WHERE error_cause_type IS NOT NULL GROUP BY error_cause_type ORDER BY count DESC')
    const byErrorCause: Record<string, number> = {}
    if (errorCauseResult.length > 0) {
      errorCauseResult[0].values.forEach(row => {
        byErrorCause[row[0] as string] = row[1] as number
      })
    }

    const typeResult = db.exec('SELECT question_type, COUNT(*) as count FROM wrong_questions GROUP BY question_type ORDER BY count DESC')
    const byQuestionType: Record<string, number> = {}
    if (typeResult.length > 0) {
      typeResult[0].values.forEach(row => {
        byQuestionType[row[0] as string] = row[1] as number
      })
    }

    const knowledgeResult = db.exec('SELECT knowledge_points FROM wrong_questions WHERE knowledge_points IS NOT NULL')
    const knowledgeMap: Record<string, number> = {}
    if (knowledgeResult.length > 0) {
      knowledgeResult[0].values.forEach(row => {
        try {
          const points = JSON.parse(row[0] as string || '[]')
          points.forEach((point: string) => {
            const name = point.split('→')[0]?.trim()
            if (name) {
              knowledgeMap[name] = (knowledgeMap[name] || 0) + 1
            }
          })
        } catch { /* skip invalid JSON */ }
      })
    }
    const topWeakPoints = Object.entries(knowledgeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name)

    const mantraResult = db.exec('SELECT COUNT(*) as count FROM wrong_questions WHERE avoid_pitfall_mantra IS NOT NULL AND avoid_pitfall_mantra != ""')
    const mantrasCollected = mantraResult[0]?.values[0]?.[0] as number || 0

    log.info('[stats:getReviewStats] Statistics retrieved', { total, mastered })
    
    return {
      totalQuestions: total,
      masteredCount: mastered,
      byErrorCause,
      byQuestionType,
      topWeakPoints,
      mantrasCollected
    }
  })

  withErrorHandling('ai:generateStudyAdvice', async () => {
    log.info('[ai:generateStudyAdvice] Generating study advice')
    const db = await getDatabase()
    const totalResult = db.exec('SELECT COUNT(*) as total FROM wrong_questions')
    const total = totalResult[0]?.values[0]?.[0] as number || 0

    const typeResult = db.exec('SELECT question_type, COUNT(*) as count FROM wrong_questions GROUP BY question_type')
    const byType: Record<string, number> = {}
    if (typeResult.length > 0) {
      typeResult[0].values.forEach(row => {
        byType[row[0] as string] = row[1] as number
      })
    }

    const errorCauseResult = db.exec('SELECT error_cause_type, COUNT(*) as count FROM wrong_questions WHERE error_cause_type IS NOT NULL GROUP BY error_cause_type')
    const weakPoints: string[] = []
    if (errorCauseResult.length > 0) {
      errorCauseResult[0].values.forEach(row => {
        weakPoints.push(row[0] as string)
      })
    }

    const advice = await aiService.generateStudyAdvice(total, byType, weakPoints, {})
    log.info('[ai:generateStudyAdvice] Advice generated')
    return advice
  })

  withErrorHandling('markdown:sync', async () => {
    log.info('[markdown:sync] Syncing markdown')
    const questions = await questionRepository.findAll()
    const stats = await questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
    log.info('[markdown:sync] Sync completed', { questionCount: questions?.length || 0 })
  })

  log.info('All IPC handlers setup completed')
}
