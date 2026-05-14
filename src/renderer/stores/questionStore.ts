import { create } from 'zustand'
import { WrongQuestion, QuestionStats } from '../../shared/types'
import { api } from '../services/api'

interface QuestionState {
  questions: WrongQuestion[]
  stats: QuestionStats | null
  loading: boolean
  error: string | null
  
  fetchQuestions: () => Promise<void>
  fetchStats: () => Promise<void>
  addQuestion: (question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateQuestionStatus: (id: number, status: 'pending' | 'mastered') => Promise<void>
  deleteQuestion: (id: number) => Promise<void>
}

export const useQuestionStore = create<QuestionState>((set) => ({
  questions: [],
  stats: null,
  loading: false,
  error: null,

  fetchQuestions: async () => {
    set({ loading: true, error: null })
    try {
      const questions = await api.findAllQuestions()
      set({ questions, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  fetchStats: async () => {
    try {
      const stats = await api.getStats()
      set({ stats })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  addQuestion: async (question) => {
    set({ loading: true, error: null })
    try {
      await api.createQuestion(question)
      await api.syncMarkdown()
      await api.findAllQuestions().then(questions => {
        set({ questions, loading: false })
      })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  updateQuestionStatus: async (id, status) => {
    set({ loading: true, error: null })
    try {
      await api.updateQuestionStatus(id, status)
      await api.syncMarkdown()
      await api.findAllQuestions().then(questions => {
        set({ questions, loading: false })
      })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  deleteQuestion: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.deleteQuestion(id)
      await api.syncMarkdown()
      await api.findAllQuestions().then(questions => {
        set({ questions, loading: false })
      })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  }
}))
