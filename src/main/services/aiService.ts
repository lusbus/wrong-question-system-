import OpenAI from 'openai'
import { PROMPTS, parseAnalysisResponse } from '../utils/prompts'
import { AIConfig, SimilarQuestion } from '../../shared/types'
import { getDatabase } from '../database/connection'

export const aiService = {
  async analyzeError(
    question: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ): Promise<{
    errorType: string
    errorAnalysis: string
    correctSolution: string
    knowledgePoints: string[]
  }> {
    const client = getOpenAIClient()
    const prompt = PROMPTS.analyzeError(question, userAnswer, correctAnswer, questionType)
    
    const response = await client.chat.completions.create({
      model: getConfig().model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })

    const text = response.choices[0].message.content || ''
    return parseAnalysisResponse(text)
  },

  async generateSimilarQuestions(
    question: string,
    knowledgePoints: string
  ): Promise<SimilarQuestion[]> {
    const client = getOpenAIClient()
    const prompt = PROMPTS.generateSimilar(question, knowledgePoints)
    
    const response = await client.chat.completions.create({
      model: getConfig().model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    })

    const text = response.choices[0].message.content || ''
    try {
      return JSON.parse(text)
    } catch {
      return []
    }
  },

  async generateStudyAdvice(
    total: number,
    distribution: Record<string, number>,
    weakPoints: string[],
    errorTypes: Record<string, number>
  ): Promise<string> {
    const client = getOpenAIClient()
    const prompt = PROMPTS.generateAdvice(
      total,
      JSON.stringify(distribution),
      weakPoints.join(', '),
      JSON.stringify(errorTypes)
    )
    
    const response = await client.chat.completions.create({
      model: getConfig().model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })

    return response.choices[0].message.content || ''
  }
}

function getOpenAIClient(): OpenAI {
  const config = getConfig()
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl
  })
}

function getConfig(): AIConfig {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM ai_config WHERE is_active = 1 LIMIT 1').get() as any
  
  if (!row) {
    throw new Error('未配置 AI 服务，请在设置页面添加 API Key')
  }

  return {
    id: row.id,
    provider: row.provider,
    apiKey: row.api_key,
    model: row.model,
    baseUrl: row.base_url,
    isActive: Boolean(row.is_active)
  }
}
