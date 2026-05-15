import { WrongQuestion, QuestionStats, SimilarQuestion } from '../../shared/types'

declare global {
  interface Window {
    electronAPI: {
      invoke(channel: string, ...args: any[]): Promise<any>
    }
  }
}

export const api = {
  async createQuestion(question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return window.electronAPI.invoke('question:create', question)
  },

  async findAllQuestions(): Promise<WrongQuestion[]> {
    return window.electronAPI.invoke('question:findAll')
  },

  async findById(id: number): Promise<WrongQuestion | null> {
    return window.electronAPI.invoke('question:findById', id)
  },

  async updateQuestionStatus(id: number, status: 'pending' | 'mastered'): Promise<void> {
    return window.electronAPI.invoke('question:updateStatus', id, status)
  },

  async deleteQuestion(id: number): Promise<void> {
    return window.electronAPI.invoke('question:delete', id)
  },

  async getStats(): Promise<QuestionStats> {
    return window.electronAPI.invoke('question:getStats')
  },

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
    solvingTips?: string
  }> {
    return window.electronAPI.invoke('ai:analyzeError', question, userAnswer, correctAnswer, questionType)
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
    solvingTips?: string
    correctionNote?: string
  }> {
    return window.electronAPI.invoke('ai:reanalyzeWithCorrectAnswer', question, userAnswer, correctAnswer, questionType)
  },

  async parseQuestion(content: string): Promise<{
    questionStem: string
    options: Record<string, string>
    correctAnswer: string
  }> {
    return window.electronAPI.invoke('ai:parseQuestion', content)
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
    return window.electronAPI.invoke('ai:analyzeReview', questionStem, options, userAnswer, correctAnswer, questionType)
  },

  async getReviewStats(): Promise<{
    totalQuestions: number
    masteredCount: number
    byErrorCause: Record<string, number>
    byQuestionType: Record<string, number>
    topWeakPoints: string[]
    mantrasCollected: number
  }> {
    return window.electronAPI.invoke('stats:getReviewStats')
  },

  async generateStudyAdvice(): Promise<string> {
    return window.electronAPI.invoke('ai:generateStudyAdvice')
  },

  async generateSimilar(question: string, knowledgePoints: string): Promise<SimilarQuestion[]> {
    return window.electronAPI.invoke('ai:generateSimilar', question, knowledgePoints)
  },

  async generateAdvice(stats: { total: number; byType: Record<string, number>; weakPoints: string[] }): Promise<string> {
    return window.electronAPI.invoke('ai:generateAdvice', stats)
  },

  async saveConfig(config: any): Promise<void> {
    return window.electronAPI.invoke('config:save', config)
  },

  async getConfig(): Promise<any> {
    return window.electronAPI.invoke('config:get')
  },

  async syncMarkdown(): Promise<void> {
    return window.electronAPI.invoke('markdown:sync')
  }
}
