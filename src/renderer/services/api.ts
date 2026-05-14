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
  }> {
    return window.electronAPI.invoke('ai:analyzeError', question, userAnswer, correctAnswer, questionType)
  },

  async generateSimilar(question: string, knowledgePoints: string): Promise<SimilarQuestion[]> {
    return window.electronAPI.invoke('ai:generateSimilar', question, knowledgePoints)
  },

  async generateAdvice(stats: { total: number; byType: Record<string, number>; weakPoints: string[] }): Promise<string> {
    return window.electronAPI.invoke('ai:generateAdvice', stats)
  },

  async syncMarkdown(): Promise<void> {
    return window.electronAPI.invoke('markdown:sync')
  }
}
