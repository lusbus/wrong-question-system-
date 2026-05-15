export interface WrongQuestion {
  id?: number
  subject: '行测' | '申论'
  questionType: QuestionType
  questionContent: string
  userAnswer: string
  correctAnswer: string
  errorType: ErrorType
  errorAnalysis: string
  correctSolution: string
  knowledgePoints: string[]
  similarQuestions: SimilarQuestion[]
  status: 'pending' | 'mastered'
  source: string
  structureAnalysis?: string
  errorCauseType?: string
  errorCauseDetail?: string
  optionAnalysis?: string
  avoidPitfallMantra?: string
  similarQuestionIds?: string
  selfCheckAction?: string
  createdAt?: string
  updatedAt?: string
}

export type QuestionType = 
  | '常识判断'
  | '言语理解'
  | '数量关系'
  | '判断推理'
  | '资料分析'
  | '归纳概括'
  | '综合分析'
  | '贯彻执行'
  | '文章写作'

export type ErrorType = 
  | '知识点掌握不足'
  | '解题思路偏差'
  | '审题失误'
  | '计算错误'
  | '时间管理不当'
  | '心理因素'

export interface SimilarQuestion {
  question: string
  answer: string
  explanation: string
}

export interface KnowledgePoint {
  id?: number
  name: string
  subject: '行测' | '申论'
  category: string
  parentId?: number
  description: string
  createdAt?: string
}

export interface AIConfig {
  id?: number
  provider: 'openai' | 'qwen' | 'zhipu'
  apiKey: string
  model: string
  baseUrl: string
  isActive: boolean
}

export interface StudyNote {
  id?: number
  questionId: number
  noteContent: string
  reviewCount: number
  lastReviewed?: string
  createdAt?: string
}

export interface QuestionStats {
  total: number
  mastered: number
  pending: number
  byType: Record<string, number>
  weakPoints: string[]
}

export const ERROR_CAUSE_TYPES = [
  '把背景当主旨',
  '以偏概全',
  '无中生有',
  '过度推断',
  '偷换概念',
  '只看表面',
  '转折/递进没抓住',
  '其他'
] as const
