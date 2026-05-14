import { ipcMain } from 'electron'
import { questionRepository } from '../database/questionRepository'
import { aiService } from '../services/aiService'
import { MarkdownService } from '../services/markdownService'
import { AIConfig } from '../../shared/types'
import { getDatabase } from '../database/connection'

export function setupIpcHandlers(markdownService: MarkdownService): void {
  ipcMain.handle('question:create', async (_event, question) => {
    const id = questionRepository.create(question)
    const questions = questionRepository.findAll()
    const stats = questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
    return id
  })

  ipcMain.handle('question:findAll', async () => {
    return questionRepository.findAll()
  })

  ipcMain.handle('question:findById', async (_event, id: number) => {
    return questionRepository.findById(id)
  })

  ipcMain.handle('question:updateStatus', async (_event, id: number, status: string) => {
    questionRepository.updateStatus(id, status as 'pending' | 'mastered')
    const questions = questionRepository.findAll()
    const stats = questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
  })

  ipcMain.handle('question:delete', async (_event, id: number) => {
    questionRepository.delete(id)
    const questions = questionRepository.findAll()
    const stats = questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
  })

  ipcMain.handle('question:getStats', async () => {
    return questionRepository.getStats()
  })

  ipcMain.handle('ai:analyzeError', async (
    _event,
    question: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ) => {
    return aiService.analyzeError(question, userAnswer, correctAnswer, questionType)
  })

  ipcMain.handle('ai:generateSimilar', async (_event, question: string, knowledgePoints: string) => {
    return aiService.generateSimilarQuestions(question, knowledgePoints)
  })

  ipcMain.handle('ai:generateAdvice', async (
    _event,
    stats: { total: number; byType: Record<string, number>; weakPoints: string[] }
  ) => {
    return aiService.generateStudyAdvice(
      stats.total,
      stats.byType,
      stats.weakPoints.join(', '),
      {}
    )
  })

  ipcMain.handle('config:save', async (_event, config: AIConfig) => {
    const db = getDatabase()
    db.prepare('INSERT OR REPLACE INTO ai_config (id, provider, api_key, model, base_url, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run(config.id || null, config.provider, config.apiKey, config.model, config.baseUrl, config.isActive)
  })

  ipcMain.handle('markdown:sync', async () => {
    const questions = questionRepository.findAll()
    const stats = questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
  })
}
