import { PROMPTS, parseAnalysisResponse, parseReviewResponse, extractSection } from '../utils/prompts'
import { SimilarQuestion } from '../../shared/types'
import { getDatabase } from '../database/connection'
import { createLogger, LogLevel } from '../utils/logger'

const log = createLogger('AIService', LogLevel.DEBUG)

interface AIConfig {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
  isActive: boolean
}

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
    const startTime = Date.now()
    log.info('analyzeError started', { 
      questionType,
      questionLength: question?.length || 0,
      userAnswerLength: userAnswer?.length || 0,
      correctAnswerLength: correctAnswer?.length || 0
    })

    try {
      const config = await getConfig()
      log.debug('Got AI config', { provider: config.provider, model: config.model, baseUrl: config.baseUrl })

      const prompt = PROMPTS.analyzeError(question, userAnswer, correctAnswer, questionType)
      log.debug('Generated prompt', { promptLength: prompt?.length || 0 })
      
      const text = await callAI(config, prompt)
      const duration = Date.now() - startTime
      
      log.info('analyzeError AI call completed', { 
        responseLength: text?.length || 0,
        duration: `${duration}ms`
      })
      
      const result = parseAnalysisResponse(text)
      log.info('analyzeError parsing completed', { 
        errorType: result?.errorType,
        knowledgePointsCount: result?.knowledgePoints?.length || 0,
        totalDuration: `${Date.now() - startTime}ms`
      })
      
      return result
    } catch (error) {
      log.error('analyzeError failed', error as Error, {
        duration: `${Date.now() - startTime}ms`,
        questionType
      })
      throw error
    }
  },

  async generateSimilarQuestions(
    question: string,
    knowledgePoints: string
  ): Promise<SimilarQuestion[]> {
    const startTime = Date.now()
    log.info('generateSimilarQuestions started', {
      questionLength: question?.length || 0,
      knowledgePointsLength: knowledgePoints?.length || 0
    })

    try {
      const config = await getConfig()
      log.debug('Got AI config', { provider: config.provider, model: config.model })

      const prompt = PROMPTS.generateSimilar(question, knowledgePoints)
      log.debug('Generated prompt', { promptLength: prompt?.length || 0 })
      
      const text = await callAI(config, prompt)
      const duration = Date.now() - startTime
      
      log.info('AI call completed', {
        responseLength: text?.length || 0,
        duration: `${duration}ms`
      })
      
      try {
        const result = JSON.parse(text)
        log.info('generateSimilarQuestions completed', { 
          count: result?.length || 0,
          totalDuration: `${Date.now() - startTime}ms`
        })
        return result
      } catch (parseError) {
        log.error('Failed to parse AI response as JSON', parseError as Error, {
          responsePreview: text?.substring(0, 200)
        })
        return []
      }
    } catch (error) {
      log.error('generateSimilarQuestions failed', error as Error, {
        duration: `${Date.now() - startTime}ms`
      })
      throw error
    }
  },

  async generateStudyAdvice(
    total: number,
    distribution: Record<string, number>,
    weakPoints: string[],
    _errorTypes: Record<string, number>
  ): Promise<string> {
    const startTime = Date.now()
    log.info('generateStudyAdvice started', {
      total,
      distributionKeys: Object.keys(distribution || {}),
      weakPointsCount: weakPoints?.length || 0
    })

    try {
      const config = await getConfig()
      log.debug('Got AI config', { provider: config.provider, model: config.model })

      const prompt = PROMPTS.generateAdvice(
        total,
        JSON.stringify(distribution),
        weakPoints.join(', '),
        '{}'
      )
      log.debug('Generated prompt', { promptLength: prompt?.length || 0 })
      
      const result = await callAI(config, prompt)
      const duration = Date.now() - startTime
      
      log.info('generateStudyAdvice completed', {
        responseLength: result?.length || 0,
        duration: `${duration}ms`
      })
      
      return result
    } catch (error) {
      log.error('generateStudyAdvice failed', error as Error, {
        duration: `${Date.now() - startTime}ms`
      })
      throw error
    }
  },

  async reanalyzeWithCorrectAnswer(
    question: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ): Promise<{
    errorType: string
    errorAnalysis: string
    correctSolution: string
    knowledgePoints: string[]
    solvingTips: string
    correctionNote: string
  }> {
    const startTime = Date.now()
    log.info('reanalyzeWithCorrectAnswer started', { 
      questionType,
      questionLength: question?.length || 0,
      userAnswerLength: userAnswer?.length || 0,
      correctAnswerLength: correctAnswer?.length || 0
    })

    try {
      const config = await getConfig()
      log.debug('Got AI config', { provider: config.provider, model: config.model, baseUrl: config.baseUrl })

      const prompt = PROMPTS.reanalyzeWithCorrectAnswer(question, userAnswer, correctAnswer, questionType)
      log.debug('Generated reanalyze prompt', { promptLength: prompt?.length || 0 })
      
      const text = await callAI(config, prompt)
      const duration = Date.now() - startTime
      
      log.info('reanalyzeWithCorrectAnswer AI call completed', { 
        responseLength: text?.length || 0,
        duration: `${duration}ms`
      })
      
      const result = parseAnalysisResponse(text)
      const correctionNote = extractSection(text, '纠错说明')
      
      log.info('reanalyzeWithCorrectAnswer parsing completed', { 
        errorType: result?.errorType,
        knowledgePointsCount: result?.knowledgePoints?.length || 0,
        totalDuration: `${Date.now() - startTime}ms`
      })
      
      return { ...result, correctionNote }
    } catch (error) {
      log.error('reanalyzeWithCorrectAnswer failed', error as Error, {
        duration: `${Date.now() - startTime}ms`,
        questionType
      })
      throw error
    }
  },

  async parseQuestion(content: string): Promise<{
    questionStem: string
    options: Record<string, string>
    correctAnswer: string
  }> {
    const startTime = Date.now()
    log.info('parseQuestion started', { contentLength: content?.length || 0 })

    try {
      const config = await getConfig()
      const prompt = PROMPTS.parseQuestion(content)
      
      const text = await callAI(config, prompt)
      const duration = Date.now() - startTime
      
      log.info('parseQuestion AI call completed', { 
        responseLength: text?.length || 0,
        duration: `${duration}ms`
      })
      
      try {
        const result = JSON.parse(text)
        log.info('parseQuestion completed', { 
          hasCorrectAnswer: Boolean(result?.correctAnswer),
          optionsCount: Object.keys(result?.options || {}).length
        })
        return {
          questionStem: result.questionStem || '',
          options: result.options || {},
          correctAnswer: result.correctAnswer || ''
        }
      } catch (parseError) {
        log.error('Failed to parse AI response as JSON', parseError as Error, {
          responsePreview: text?.substring(0, 200)
        })
        return {
          questionStem: content,
          options: {},
          correctAnswer: ''
        }
      }
    } catch (error) {
      log.error('parseQuestion failed', error as Error, {
        duration: `${Date.now() - startTime}ms`
      })
      throw error
    }
  },

  async analyzeReview(
    questionStem: string,
    options: Record<string, string>,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ): Promise<{
    errorType: string
    structureAnalysis: string
    errorCauseType: string
    errorCauseDetail: string
    optionAnalysis: string
    correctSolution: string
    avoidPitfallMantra: string
    selfCheckAction: string
    knowledgePoints: string[]
    solvingTips: string
  }> {
    const startTime = Date.now()
    log.info('analyzeReview started', { 
      questionType,
      questionStemLength: questionStem?.length || 0,
      userAnswerLength: userAnswer?.length || 0,
      correctAnswerLength: correctAnswer?.length || 0
    })

    try {
      const config = await getConfig()
      
      const optionsText = Object.entries(options)
        .map(([key, value]) => `${key}. ${value}`)
        .join('\n')
      
      const prompt = PROMPTS.analyzeReview(questionStem, optionsText, userAnswer, correctAnswer, questionType)
      
      const text = await callAI(config, prompt)
      const duration = Date.now() - startTime
      
      log.info('analyzeReview AI call completed', { 
        responseLength: text?.length || 0,
        duration: `${duration}ms`
      })
      
      const result = parseReviewResponse(text)
      log.info('analyzeReview parsing completed', { 
        errorType: result?.errorType,
        errorCauseType: result?.errorCauseType,
        knowledgePointsCount: result?.knowledgePoints?.length || 0,
        totalDuration: `${Date.now() - startTime}ms`
      })
      
      return result
    } catch (error) {
      log.error('analyzeReview failed', error as Error, {
        duration: `${Date.now() - startTime}ms`,
        questionType
      })
      throw error
    }
  }
}

async function callAI(config: AIConfig, prompt: string): Promise<string> {
  const startTime = Date.now()
  const url = `${config.baseUrl}/chat/completions`
  
  log.info('Making AI request', {
    url,
    model: config.model,
    promptLength: prompt.length,
    apiKeyLength: config.apiKey?.length || 0,
    apiKeyPrefix: config.apiKey?.substring(0, 8) || 'none',
    provider: config.provider,
    baseUrl: config.baseUrl
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    })

    const duration = Date.now() - startTime
    log.info('AI request completed', {
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      url
    })

    if (!response.ok) {
      const errorText = await response.text()
      log.error('AI request failed', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText?.substring(0, 500),
        duration: `${duration}ms`
      })
      throw new Error(`AI 请求失败 (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    log.debug('AI response parsed', {
      choicesCount: data.choices?.length || 0,
      contentLength: content.length
    })
    
    return content
  } catch (error) {
    const duration = Date.now() - startTime
    log.error('AI request error', error as Error, {
      url,
      duration: `${duration}ms`
    })
    throw error
  }
}

async function getConfig(): Promise<AIConfig> {
  log.debug('Fetching active AI config from database')
  const db = await getDatabase()
  const result = db.exec('SELECT * FROM ai_config WHERE is_active = 1 LIMIT 1')
  
  if (!result.length || result[0].values.length === 0) {
    log.error('No active AI config found')
    throw new Error('未配置 AI 服务，请在设置页面添加 API Key')
  }

  const row = result[0].values[0]
  const config = {
    provider: row[1] as string,
    apiKey: row[2] as string,
    model: row[3] as string,
    baseUrl: row[4] as string,
    isActive: Boolean(row[5])
  }
  
  log.debug('AI config retrieved', {
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    hasApiKey: Boolean(config.apiKey)
  })
  
  return config
}
