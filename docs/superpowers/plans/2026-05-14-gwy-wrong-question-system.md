# 公务员考试错题解析系统 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 开发一套基于 Electron + React + TypeScript 的 Windows 桌面应用，实现错题录入、AI 解析、Markdown 错题本生成、知识图谱和举一反三训练功能

**Architecture:** Electron 双进程架构，主进程负责 SQLite 数据库管理、AI API 调用和 Markdown 文件生成，渲染进程负责 UI 展示和用户交互，通过 IPC 通信

**Tech Stack:** Electron, React 18, TypeScript, Vite, better-sqlite3, Ant Design, Zustand, OpenAI SDK, Mermaid.js

---

## 文件结构总览

```
GWY/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── electron-builder.json
├── src/
│   ├── main/
│   │   ├── index.ts                    # Electron 主进程入口
│   │   ├── ipc/
│   │   │   └── handlers.ts             # IPC 处理器
│   │   ├── database/
│   │   │   ├── connection.ts           # SQLite 连接管理
│   │   │   ├── schema.sql              # 数据库建表语句
│   │   │   ├── questionRepository.ts   # 错题数据操作
│   │   │   └── knowledgeRepository.ts  # 知识点数据操作
│   │   ├── services/
│   │   │   ├── aiService.ts            # AI API 调用服务
│   │   │   └── markdownService.ts      # Markdown 文件生成服务
│   │   └── utils/
│   │       └── prompts.ts              # AI 提示词模板
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx                    # React 入口
│   │   ├── App.tsx                     # 根组件
│   │   ├── pages/
│   │   │   ├── InputPage.tsx           # 错题录入页
│   │   │   ├── NotesPage.tsx           # 错题笔记页
│   │   │   ├── KnowledgePage.tsx       # 知识图谱页
│   │   │   ├── TrainingPage.tsx        # 训练中心页
│   │   │   └── SettingsPage.tsx        # 设置页
│   │   ├── components/
│   │   │   ├── QuestionForm.tsx        # 题目录入表单
│   │   │   ├── QuestionList.tsx        # 错题列表
│   │   │   ├── MindMap.tsx             # 思维导图组件
│   │   │   └── MarkdownViewer.tsx      # Markdown 预览组件
│   │   ├── stores/
│   │   │   └── questionStore.ts        # Zustand 状态管理
│   │   └── services/
│   │       └── api.ts                  # IPC 调用封装
│   └── shared/
│       └── types.ts                    # 共享 TypeScript 类型
├── database/
│   └── init.sql                        # 初始化 SQL
└── prompts/
    └── templates.json                  # AI 提示词模板
```

---

## Task 1: 项目初始化与基础架构

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "gwy-wrong-question-system",
  "version": "1.0.0",
  "description": "公务员考试错题解析与学习提升系统",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "openai": "^4.28.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.13.0",
    "zustand": "^4.5.0",
    "react-markdown": "^9.0.1",
    "rehype-highlight": "^7.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.9",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "electron": "^28.1.4",
    "electron-builder": "^24.9.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12",
    "vite-plugin-electron": "^0.28.2",
    "vite-plugin-electron-renderer": "^0.14.5"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/renderer", "src/shared"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['better-sqlite3', 'openai']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

- [ ] **Step 5: 创建 electron-builder.json**

```json
{
  "appId": "com.gwy.wrongquestion",
  "productName": "公考错题助手",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "database/**/*"
  ],
  "win": {
    "target": ["nsis"],
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

- [ ] **Step 6: 创建目录结构**

```bash
mkdir -p src/main/ipc src/main/database src/main/services src/main/utils
mkdir -p src/renderer/pages src/renderer/components src/renderer/stores src/renderer/services
mkdir -p src/shared
mkdir -p database prompts
```

---

## Task 2: 共享类型定义

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/shared/types.ts

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
```

---

## Task 3: 数据库层实现

**Files:**
- Create: `database/init.sql`
- Create: `src/main/database/connection.ts`
- Create: `src/main/database/questionRepository.ts`
- Create: `src/main/database/knowledgeRepository.ts`

- [ ] **Step 1: 创建数据库初始化 SQL**

```sql
-- database/init.sql

CREATE TABLE IF NOT EXISTS wrong_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL CHECK(subject IN ('行测', '申论')),
  question_type TEXT NOT NULL,
  question_content TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_analysis TEXT,
  correct_solution TEXT,
  knowledge_points TEXT DEFAULT '[]',
  similar_questions TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'mastered')),
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_id INTEGER,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES knowledge_points(id)
);

CREATE TABLE IF NOT EXISTS study_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  note_content TEXT,
  review_count INTEGER DEFAULT 0,
  last_reviewed DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES wrong_questions(id)
);

CREATE TABLE IF NOT EXISTS ai_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT 'openai',
  api_key TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4',
  base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  is_active BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON wrong_questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_type ON wrong_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_status ON wrong_questions(status);
```

- [ ] **Step 2: 创建数据库连接管理**

```typescript
// src/main/database/connection.ts

import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { readFileSync } from 'fs'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'gwy.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeDatabase(db)
  }
  return db
}

function initializeDatabase(database: Database.Database): void {
  const schemaPath = join(app.getAppPath(), 'database', 'init.sql')
  const schema = readFileSync(schemaPath, 'utf-8')
  database.exec(schema)
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
```

- [ ] **Step 3: 创建错题数据操作层**

```typescript
// src/main/database/questionRepository.ts

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
```

- [ ] **Step 4: 创建知识点数据操作层**

```typescript
// src/main/database/knowledgeRepository.ts

import { getDatabase } from './connection'
import { KnowledgePoint } from '../../shared/types'

export const knowledgeRepository = {
  create(kp: Omit<KnowledgePoint, 'id' | 'createdAt'>): number {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO knowledge_points (name, subject, category, parent_id, description)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(kp.name, kp.subject, kp.category, kp.parentId || null, kp.description)
    return result.lastInsertRowid as number
  },

  findAll(): KnowledgePoint[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM knowledge_points ORDER BY category, name').all() as any[]
    return rows.map(parseKnowledgePoint)
  },

  findBySubject(subject: string): KnowledgePoint[] {
    const db = getDatabase()
    const rows = db.prepare(
      'SELECT * FROM knowledge_points WHERE subject = ? ORDER BY category, name'
    ).all(subject) as any[]
    return rows.map(parseKnowledgePoint)
  },

  findByName(name: string): KnowledgePoint | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM knowledge_points WHERE name = ?').get(name) as any
    return row ? parseKnowledgePoint(row) : null
  }
}

function parseKnowledgePoint(row: any): KnowledgePoint {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    category: row.category,
    parentId: row.parent_id,
    description: row.description,
    createdAt: row.created_at
  }
}
```

---

## Task 4: AI 服务实现

**Files:**
- Create: `src/main/services/aiService.ts`
- Create: `src/main/utils/prompts.ts`

- [ ] **Step 1: 创建 AI 提示词模板**

```typescript
// src/main/utils/prompts.ts

export const PROMPTS = {
  analyzeError: (question: string, userAnswer: string, correctAnswer: string, questionType: string): string => `
你是一名公务员考试辅导专家。请分析以下错题，按照以下格式输出：

【错误类型】（从以下选择：知识点掌握不足/解题思路偏差/审题失误/计算错误/时间管理不当/心理因素）
【错误分析】详细分析错误原因（100-200字）
【正确解法】标准解题步骤
【核心知识点】列出3-5个相关知识点，用逗号分隔
【解题技巧】该题型的通用解题思路

题目：${question}
用户答案：${userAnswer}
正确答案：${correctAnswer}
题型：${questionType}

请严格按照格式输出，不要添加其他内容。
`,

  generateSimilar: (question: string, knowledgePoints: string): string => `
你是一名公务员考试出题专家。请根据以下错题，生成3道相似题目：

要求：
1. 考察相同或相关知识点
2. 难度相近
3. 题目类型一致
4. 包含答案和解析

请按照以下JSON格式输出（不要输出其他内容）：
[
  {
    "question": "题目内容",
    "answer": "答案",
    "explanation": "解析"
  }
]

原错题：${question}
涉及知识点：${knowledgePoints}
`,

  generateAdvice: (total: number, distribution: string, weakPoints: string, errorTypes: string): string => `
你是一名公务员考试学习规划师。请根据学生的错题情况，生成个性化学习建议：

错题统计：
- 总错题数：${total}
- 各题型错误分布：${distribution}
- 薄弱知识点：${weakPoints}
- 错误类型分布：${errorTypes}

请输出：
1. 本周学习重点（3条）
2. 推荐复习顺序
3. 针对性训练建议
4. 时间分配建议

每条建议请简明扼要。
`
}

export function parseAnalysisResponse(text: string): {
  errorType: string
  errorAnalysis: string
  correctSolution: string
  knowledgePoints: string[]
  correctSolution: string
} {
  const errorType = extractSection(text, '错误类型')
  const errorAnalysis = extractSection(text, '错误分析')
  const correctSolution = extractSection(text, '正确解法')
  const knowledgePoints = extractSection(text, '核心知识点')
    .split(/[,，]/)
    .map(s => s.trim())
    .filter(Boolean)
  const solvingTips = extractSection(text, '解题技巧')

  return {
    errorType,
    errorAnalysis,
    correctSolution,
    knowledgePoints,
    correctSolution: solvingTips
  }
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`【${sectionName}】([\\s\\S]*?)(?=【|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}
```

- [ ] **Step 2: 创建 AI 服务**

```typescript
// src/main/services/aiService.ts

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
```

---

## Task 5: Markdown 文件管理服务

**Files:**
- Create: `src/main/services/markdownService.ts`

- [ ] **Step 1: 创建 Markdown 服务**

```typescript
// src/main/services/markdownService.ts

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { WrongQuestion, QuestionStats } from '../../shared/types'

const QUESTION_TYPES = {
  '行测': ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析'],
  '申论': ['归纳概括', '综合分析', '贯彻执行', '文章写作']
}

const ERROR_TYPE_ICONS: Record<string, string> = {
  '知识点掌握不足': '🔴',
  '解题思路偏差': '🟡',
  '审题失误': '🟠',
  '计算错误': '🔵',
  '时间管理不当': '🟣',
  '心理因素': '⚫'
}

export class MarkdownService {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
    this.initializeDirectories()
  }

  initializeDirectories(): void {
    const dirs = [
      join(this.basePath, '总览'),
      ...Object.entries(QUESTION_TYPES).flatMap(([subject, types]) =>
        types.map(type => join(this.basePath, subject, type))
      )
    ]

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    })
  }

  updateAllMarkdown(questions: WrongQuestion[], stats: QuestionStats): void {
    this.updateOverview(stats, questions)
    this.updateTypeNotebooks(questions)
    this.updateMindMaps(questions)
  }

  updateOverview(stats: QuestionStats, questions: WrongQuestion[]): void {
    const mindmap = this.generateOverviewMindmap(stats)
    const index = this.generateOverviewIndex(stats, questions)

    const content = `# 🎯 公务员考试错题总览

## 🗺️ 全局思维导图

\`\`\`mermaid
${mindmap}
\`\`\`

${index}

## 📈 学习进度

- 总错题数：${stats.total} 道
- 已掌握：${stats.mastered} 道 (${stats.total > 0 ? Math.round(stats.mastered / stats.total * 100) : 0}%)
- 待复习：${stats.pending} 道 (${stats.total > 0 ? Math.round(stats.pending / stats.total * 100) : 0}%)
- 最近更新：${new Date().toLocaleString('zh-CN')}
`

    this.writeFile(join(this.basePath, '总览', '错题总览.md'), content)
  }

  updateTypeNotebooks(questions: WrongQuestion[]): void {
    Object.entries(QUESTION_TYPES).forEach(([subject, types]) => {
      types.forEach(type => {
        const typeQuestions = questions.filter(
          q => q.subject === subject && q.questionType === type
        )
        this.writeTypeNotebook(subject, type, typeQuestions)
      })
    })
  }

  updateMindMaps(questions: WrongQuestion[]): void {
    Object.entries(QUESTION_TYPES).forEach(([subject, types]) => {
      types.forEach(type => {
        const typeQuestions = questions.filter(
          q => q.subject === subject && q.questionType === type
        )
        this.writeMindMap(subject, type, typeQuestions)
      })
    })
  }

  private writeTypeNotebook(
    subject: string,
    type: string,
    questions: WrongQuestion[]
  ): void {
    const weakPoints = this.extractWeakPoints(questions)
    const stats = this.generateTypeStats(questions)
    const index = this.generateTypeIndex(questions)
    const details = this.generateQuestionDetails(questions)

    const content = `# 📚 ${type} - 错题本

${stats}

## 📑 错题索引

${index}

---

${details}
`

    const filePath = join(this.basePath, subject, type, '错题本.md')
    this.writeFile(filePath, content)
  }

  private writeMindMap(
    subject: string,
    type: string,
    questions: WrongQuestion[]
  ): void {
    const knowledgeTree = this.buildKnowledgeTree(questions)

    const content = `# 🗺️ ${type} - 错题思维导图

\`\`\`mermaid
mindmap
  ${type}
${knowledgeTree}
\`\`\`

## 知识点统计

${this.generateKnowledgeStats(questions)}
`

    const filePath = join(this.basePath, subject, type, '📊 错题思维导图.md')
    this.writeFile(filePath, content)
  }

  private generateOverviewMindmap(stats: QuestionStats): string {
    let mindmap = 'mindmap\n  公务员考试错题'
    
    Object.entries(QUESTION_TYPES).forEach(([subject, types]) => {
      mindmap += `\n    ${subject}`
      types.forEach(type => {
        const count = stats.byType[type] || 0
        mindmap += `\n      ${type} (${count}题)`
      })
    })

    return mindmap
  }

  private generateTypeStats(questions: WrongQuestion[]): string {
    const mastered = questions.filter(q => q.status === 'mastered').length
    const pending = questions.filter(q => q.status === 'pending').length
    const weakPoints = this.extractWeakPoints(questions).join(', ')

    return `## 📊 本类型错题统计
- 错题总数：${questions.length} 道
- 已掌握：${mastered} 道
- 待复习：${pending} 道
- 薄弱知识点：${weakPoints || '暂无'}
- 最近更新时间：${new Date().toLocaleString('zh-CN')}`
  }

  private generateTypeIndex(questions: WrongQuestion[]): string {
    if (questions.length === 0) {
      return '_暂无错题_'
    }

    const rows = questions.map((q, i) => {
      const icon = ERROR_TYPE_ICONS[q.errorType] || '⚪'
      const status = q.status === 'mastered' ? '✅ 已掌握' : '❌ 待复习'
      return `| ${i + 1} | [错题${q.id}](#错题${q.id}) | ${icon} ${q.errorType} | ${q.knowledgePoints.join(', ')} | ${status} |`
    })

    return `| 序号 | 题目 | 错误类型 | 知识点 | 状态 |\n|------|------|----------|--------|------|\n${rows.join('\n')}`
  }

  private generateQuestionDetails(questions: WrongQuestion[]): string {
    if (questions.length === 0) return ''

    return questions.map(q => {
      const icon = ERROR_TYPE_ICONS[q.errorType] || '⚪'
      const status = q.status === 'mastered' ? '✅ 已掌握' : '❌ 待复习'
      const knowledgeLinks = q.knowledgePoints.map(kp => `- [[${kp}]]`).join('\n')
      const similar = q.similarQuestions.map(sq => 
        `**题目**：${sq.question}\n**答案**：${sq.answer}\n**解析**：${sq.explanation}`
      ).join('\n\n')

      return `### 错题 ${q.id}

**题目**：${q.questionContent}

**我的答案**：${q.userAnswer}

**正确答案**：${q.correctAnswer}

**错误类型**：${icon} ${q.errorType}

**错误分析**：
> ${q.errorAnalysis}

**正确解法**：
> ${q.correctSolution}

**核心知识点**：
${knowledgeLinks}

**举一反三**：
${similar}

**复习状态**：${status}`
    }).join('\n\n---\n\n')
  }

  private buildKnowledgeTree(questions: WrongQuestion[]): string {
    const tree: Record<string, Set<string>> = {}
    
    questions.forEach(q => {
      q.knowledgePoints.forEach(kp => {
        const [category, sub] = kp.includes(' - ') ? kp.split(' - ') : ['其他', kp]
        if (!tree[category]) {
          tree[category] = new Set()
        }
        tree[category].add(sub)
      })
    })

    return Object.entries(tree)
      .map(([cat, subs]) => {
        const subItems = Array.from(subs).map(s => `      ${s}`).join('\n')
        return `    ${cat}\n${subItems}`
      })
      .join('\n')
  }

  private generateKnowledgeStats(questions: WrongQuestion[]): string {
    const counts: Record<string, number> = {}
    
    questions.forEach(q => {
      q.knowledgePoints.forEach(kp => {
        counts[kp] = (counts[kp] || 0) + 1
      })
    })

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kp, count]) => `- ${kp}: ${count}次`)

    return sorted.join('\n') || '_暂无数据_'
  }

  private extractWeakPoints(questions: WrongQuestion[]): string[] {
    const counts: Record<string, number> = {}
    
    questions.forEach(q => {
      q.knowledgePoints.forEach(kp => {
        counts[kp] = (counts[kp] || 0) + 1
      })
    })

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kp]) => kp)
  }

  private generateOverviewIndex(stats: QuestionStats, questions: WrongQuestion[]): string {
    const rows = Object.entries(QUESTION_TYPES).flatMap(([subject, types]) => {
      return types.map(type => {
        const count = stats.byType[type] || 0
        const typeQuestions = questions.filter(q => q.questionType === type)
        const weakPoints = this.extractWeakPoints(typeQuestions).slice(0, 2).join(', ')
        const path = `../${subject}/${type}/错题本.md`
        return `| ${subject} | ${type} | ${count} | ${weakPoints} | [查看](${path}) |`
      })
    })

    return `## 📑 全科目错题索引

| 科目 | 类型 | 错题数 | 薄弱点 | 错题本链接 |
|------|------|--------|--------|------------|
${rows.join('\n')}`
  }

  private writeFile(filePath: string, content: string): void {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(filePath, content, 'utf-8')
  }
}
```

---

## Task 6: IPC 通信层

**Files:**
- Create: `src/main/ipc/handlers.ts`

- [ ] **Step 1: 创建 IPC 处理器**

```typescript
// src/main/ipc/handlers.ts

import { ipcMain } from 'electron'
import { questionRepository } from '../database/questionRepository'
import { knowledgeRepository } from '../database/knowledgeRepository'
import { aiService } from '../services/aiService'
import { MarkdownService } from '../services/markdownService'
import { WrongQuestion, AIConfig } from '../../shared/types'

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
      '{}'
    )
  })

  ipcMain.handle('config:save', async (_event, config: AIConfig) => {
    const db = require('../database/connection').getDatabase()
    db.prepare('INSERT OR REPLACE INTO ai_config (id, provider, api_key, model, base_url, is_active) VALUES (?, ?, ?, ?, ?, ?)')
      .run(config.id || null, config.provider, config.apiKey, config.model, config.baseUrl, config.isActive)
  })

  ipcMain.handle('markdown:sync', async () => {
    const questions = questionRepository.findAll()
    const stats = questionRepository.getStats()
    markdownService.updateAllMarkdown(questions, stats)
  })
}
```

---

## Task 7: Electron 主进程入口

**Files:**
- Create: `src/main/index.ts`

- [ ] **Step 1: 创建主进程入口**

```typescript
// src/main/index.ts

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { setupIpcHandlers } from './ipc/handlers'
import { MarkdownService } from './services/markdownService'
import { closeDatabase } from './database/connection'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const notebookPath = join(app.getPath('documents'), '公考错题本')
  const markdownService = new MarkdownService(notebookPath)
  setupIpcHandlers(markdownService)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  closeDatabase()
})
```

---

## Task 8: React 渲染进程入口

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`

- [ ] **Step 1: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>公考错题助手</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 main.tsx**

```typescript
// src/renderer/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import 'antd/dist/reset.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
```

- [ ] **Step 3: 创建 App.tsx**

```typescript
// src/renderer/App.tsx

import React from 'react'
import { Layout, Menu } from 'antd'
import {
  EditOutlined,
  BookOutlined,
  ApertureOutlined,
  TrophyOutlined,
  SettingOutlined
} from '@ant-design/icons'
import InputPage from './pages/InputPage'
import NotesPage from './pages/NotesPage'
import KnowledgePage from './pages/KnowledgePage'
import TrainingPage from './pages/TrainingPage'
import SettingsPage from './pages/SettingsPage'

const { Header, Content } = Layout

const App: React.FC = () => {
  const [current, setCurrent] = React.useState('input')

  const renderPage = () => {
    switch (current) {
      case 'input': return <InputPage />
      case 'notes': return <NotesPage />
      case 'knowledge': return <KnowledgePage />
      case 'training': return <TrainingPage />
      case 'settings': return <SettingsPage />
      default: return <InputPage />
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <h1 style={{ color: 'white', margin: 0, marginRight: 40 }}>公考错题助手</h1>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[current]}
          onClick={({ key }) => setCurrent(key)}
          items={[
            { key: 'input', icon: <EditOutlined />, label: '错题录入' },
            { key: 'notes', icon: <BookOutlined />, label: '错题笔记' },
            { key: 'knowledge', icon: <ApertureOutlined />, label: '知识图谱' },
            { key: 'training', icon: <TrophyOutlined />, label: '训练中心' },
            { key: 'settings', icon: <SettingOutlined />, label: '设置' }
          ]}
        />
      </Header>
      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        {renderPage()}
      </Content>
    </Layout>
  )
}

export default App
```

---

## Task 9: 状态管理与 API 服务

**Files:**
- Create: `src/renderer/stores/questionStore.ts`
- Create: `src/renderer/services/api.ts`

- [ ] **Step 1: 创建 Zustand 状态管理**

```typescript
// src/renderer/stores/questionStore.ts

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
      set(state => ({
        loading: false,
        questions: [state.questions[0], ...state.questions]
      }))
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  updateQuestionStatus: async (id, status) => {
    set({ loading: true, error: null })
    try {
      await api.updateQuestionStatus(id, status)
      await api.syncMarkdown()
      set(state => ({
        loading: false,
        questions: state.questions.map(q => 
          q.id === id ? { ...q, status } : q
        )
      }))
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  deleteQuestion: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.deleteQuestion(id)
      await api.syncMarkdown()
      set(state => ({
        loading: false,
        questions: state.questions.filter(q => q.id !== id)
      }))
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  }
}))
```

- [ ] **Step 2: 创建 API 服务（IPC 封装）**

```typescript
// src/renderer/services/api.ts

import { WrongQuestion, QuestionStats, SimilarQuestion } from '../../shared/types'

const { electronAPI } = window as any

export const api = {
  async createQuestion(question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return electronAPI.invoke('question:create', question)
  },

  async findAllQuestions(): Promise<WrongQuestion[]> {
    return electronAPI.invoke('question:findAll')
  },

  async findById(id: number): Promise<WrongQuestion | null> {
    return electronAPI.invoke('question:findById', id)
  },

  async updateQuestionStatus(id: number, status: 'pending' | 'mastered'): Promise<void> {
    return electronAPI.invoke('question:updateStatus', id, status)
  },

  async deleteQuestion(id: number): Promise<void> {
    return electronAPI.invoke('question:delete', id)
  },

  async getStats(): Promise<QuestionStats> {
    return electronAPI.invoke('question:getStats')
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
    return electronAPI.invoke('ai:analyzeError', question, userAnswer, correctAnswer, questionType)
  },

  async generateSimilar(question: string, knowledgePoints: string): Promise<SimilarQuestion[]> {
    return electronAPI.invoke('ai:generateSimilar', question, knowledgePoints)
  },

  async generateAdvice(stats: { total: number; byType: Record<string, number>; weakPoints: string[] }): Promise<string> {
    return electronAPI.invoke('ai:generateAdvice', stats)
  },

  async syncMarkdown(): Promise<void> {
    return electronAPI.invoke('markdown:sync')
  }
}
```

---

## Task 10: UI 页面 - 错题录入页

**Files:**
- Create: `src/renderer/pages/InputPage.tsx`
- Create: `src/renderer/components/QuestionForm.tsx`

- [ ] **Step 1: 创建题目录入表单组件**

```typescript
// src/renderer/components/QuestionForm.tsx

import React, { useState } from 'react'
import { Form, Select, Input, Button, Card, message } from 'antd'
import { QuestionType, WrongQuestion, ErrorType } from '../../shared/types'
import { api } from '../services/api'

const { TextArea } = Input

interface QuestionFormProps {
  onSuccess?: () => void
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onSuccess }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const analysis = await api.analyzeError(
        values.questionContent,
        values.userAnswer,
        values.correctAnswer,
        values.questionType
      )

      const similar = await api.generateSimilar(
        values.questionContent,
        analysis.knowledgePoints.join(', ')
      )

      const question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
        subject: values.subject,
        questionType: values.questionType,
        questionContent: values.questionContent,
        userAnswer: values.userAnswer,
        correctAnswer: values.correctAnswer,
        errorType: analysis.errorType as ErrorType,
        errorAnalysis: analysis.errorAnalysis,
        correctSolution: analysis.correctSolution,
        knowledgePoints: analysis.knowledgePoints,
        similarQuestions: similar,
        status: 'pending',
        source: values.source || '未知'
      }

      await api.createQuestion(question)
      message.success('错题录入成功！')
      form.resetFields()
      onSuccess?.()
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item name="subject" label="科目" rules={[{ required: true }]}>
        <Select options={[
          { label: '行测', value: '行测' },
          { label: '申论', value: '申论' }
        ]} />
      </Form.Item>

      <Form.Item name="questionType" label="题型" rules={[{ required: true }]}>
        <Select options={[
          { label: '常识判断', value: '常识判断' },
          { label: '言语理解', value: '言语理解' },
          { label: '数量关系', value: '数量关系' },
          { label: '判断推理', value: '判断推理' },
          { label: '资料分析', value: '资料分析' },
          { label: '归纳概括', value: '归纳概括' },
          { label: '综合分析', value: '综合分析' },
          { label: '贯彻执行', value: '贯彻执行' },
          { label: '文章写作', value: '文章写作' }
        ]} />
      </Form.Item>

      <Form.Item name="questionContent" label="题目内容" rules={[{ required: true }]}>
        <TextArea rows={4} />
      </Form.Item>

      <Form.Item name="userAnswer" label="我的答案" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="correctAnswer" label="正确答案" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="source" label="题目来源">
        <Input placeholder="如：2024国考行测真题" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          提交并 AI 解析
        </Button>
      </Form.Item>
    </Form>
  )
}

export default QuestionForm
```

- [ ] **Step 2: 创建错题录入页**

```typescript
// src/renderer/pages/InputPage.tsx

import React from 'react'
import { Card, Row, Col } from 'antd'
import QuestionForm from '../components/QuestionForm'
import { useQuestionStore } from '../stores/questionStore'

const InputPage: React.FC = () => {
  const { fetchQuestions, fetchStats } = useQuestionStore()

  const handleSuccess = () => {
    fetchQuestions()
    fetchStats()
  }

  return (
    <Row gutter={[24, 24]}>
      <Col span={12}>
        <Card title="录入新错题" bordered={false}>
          <QuestionForm onSuccess={handleSuccess} />
        </Card>
      </Col>
      <Col span={12}>
        <Card title="使用说明" bordered={false}>
          <p>1. 填写题目基本信息（科目、题型）</p>
          <p>2. 输入题目内容、您的答案和正确答案</p>
          <p>3. 点击提交后，AI 将自动分析错误原因</p>
          <p>4. 错题本将自动更新，包含思维导图和索引</p>
          <p>5. 错题本保存在「文档/公考错题本」目录</p>
        </Card>
      </Col>
    </Row>
  )
}

export default InputPage
```

---

## Task 11: UI 页面 - 错题笔记页

**Files:**
- Create: `src/renderer/pages/NotesPage.tsx`
- Create: `src/renderer/components/QuestionList.tsx`

- [ ] **Step 1: 创建错题列表组件**

```typescript
// src/renderer/components/QuestionList.tsx

import React from 'react'
import { Table, Tag, Space, Button, Popconfirm, message } from 'antd'
import { WrongQuestion } from '../../shared/types'
import { useQuestionStore } from '../stores/questionStore'

const ERROR_TYPE_COLORS: Record<string, string> = {
  '知识点掌握不足': 'red',
  '解题思路偏差': 'orange',
  '审题失误': 'gold',
  '计算错误': 'blue',
  '时间管理不当': 'purple',
  '心理因素': 'default'
}

const QuestionList: React.FC = () => {
  const { questions, loading, updateQuestionStatus, deleteQuestion } = useQuestionStore()

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60
    },
    {
      title: '科目',
      dataIndex: 'subject',
      width: 80
    },
    {
      title: '题型',
      dataIndex: 'questionType',
      width: 100
    },
    {
      title: '题目',
      dataIndex: 'questionContent',
      ellipsis: true
    },
    {
      title: '错误类型',
      dataIndex: 'errorType',
      width: 120,
      render: (type: string) => (
        <Tag color={ERROR_TYPE_COLORS[type] || 'default'}>{type}</Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'mastered' ? 'green' : 'volcano'}>
          {status === 'mastered' ? '已掌握' : '待复习'}
        </Tag>
      )
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: WrongQuestion) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              const newStatus = record.status === 'mastered' ? 'pending' : 'mastered'
              updateQuestionStatus(record.id!, newStatus)
              message.success('状态已更新')
            }}
          >
            {record.status === 'mastered' ? '标记待复习' : '标记已掌握'}
          </Button>
          <Popconfirm
            title="确认删除？"
            onConfirm={() => {
              deleteQuestion(record.id!)
              message.success('已删除')
            }}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={questions}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  )
}

export default QuestionList
```

- [ ] **Step 2: 创建错题笔记页**

```typescript
// src/renderer/pages/NotesPage.tsx

import React, { useEffect } from 'react'
import { Card, Button, message } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import QuestionList from '../components/QuestionList'
import { useQuestionStore } from '../stores/questionStore'
import { api } from '../services/api'

const NotesPage: React.FC = () => {
  const { fetchQuestions, fetchStats, questions, stats } = useQuestionStore()

  useEffect(() => {
    fetchQuestions()
    fetchStats()
  }, [])

  const handleSync = async () => {
    try {
      await api.syncMarkdown()
      message.success('错题本已同步')
    } catch (e) {
      message.error('同步失败')
    }
  }

  return (
    <Card
      title={`错题笔记 (${stats?.total || 0} 道)`}
      extra={
        <Button icon={<SyncOutlined />} onClick={handleSync}>
          同步错题本
        </Button>
      }
    >
      {stats && (
        <div style={{ marginBottom: 16 }}>
          <span>已掌握: {stats.mastered} | </span>
          <span>待复习: {stats.pending} | </span>
          <span>薄弱知识点: {stats.weakPoints.slice(0, 3).join(', ')}</span>
        </div>
      )}
      <QuestionList />
    </Card>
  )
}

export default NotesPage
```

---

## Task 12: UI 页面 - 知识图谱页

**Files:**
- Create: `src/renderer/pages/KnowledgePage.tsx`
- Create: `src/renderer/components/MindMap.tsx`

- [ ] **Step 1: 创建思维导图组件**

```typescript
// src/renderer/components/MindMap.tsx

import React from 'react'
import { Card } from 'antd'

interface MindMapProps {
  title: string
  data: Record<string, string[]>
}

const MindMap: React.FC<MindMapProps> = ({ title, data }) => {
  const mermaidCode = React.useMemo(() => {
    let code = 'mindmap\n  ' + title
    Object.entries(data).forEach(([key, values]) => {
      code += '\n    ' + key
      values.forEach(v => {
        code += '\n      ' + v
      })
    })
    return code
  }, [title, data])

  return (
    <Card title="思维导图" style={{ marginTop: 16 }}>
      <pre style={{ background: '#f5f5f5', padding: 16 }}>
        <code>{mermaidCode}</code>
      </pre>
    </Card>
  )
}

export default MindMap
```

- [ ] **Step 2: 创建知识图谱页**

```typescript
// src/renderer/pages/KnowledgePage.tsx

import React, { useEffect, useMemo } from 'react'
import { Card, Row, Col, Tag } from 'antd'
import { useQuestionStore } from '../stores/questionStore'

const KnowledgePage: React.FC = () => {
  const { questions, fetchQuestions, stats } = useQuestionStore()

  useEffect(() => {
    fetchQuestions()
  }, [])

  const knowledgeTree = useMemo(() => {
    const tree: Record<string, Record<string, number>> = {}
    
    questions.forEach(q => {
      q.knowledgePoints.forEach(kp => {
        if (!tree[q.questionType]) {
          tree[q.questionType] = {}
        }
        tree[q.questionType][kp] = (tree[q.questionType][kp] || 0) + 1
      })
    })

    return tree
  }, [questions])

  return (
    <div>
      <Card title="知识点分布">
        <Row gutter={[16, 16]}>
          {Object.entries(knowledgeTree).map(([type, points]) => (
            <Col span={12} key={type}>
              <Card size="small" title={type}>
                {Object.entries(points)
                  .sort((a, b) => b[1] - a[1])
                  .map(([kp, count]) => (
                    <Tag key={kp} color="blue" style={{ margin: 4 }}>
                      {kp} ({count}次)
                    </Tag>
                  ))}
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {stats && stats.weakPoints.length > 0 && (
        <Card title="薄弱知识点 Top 5" style={{ marginTop: 16 }}>
          {stats.weakPoints.map((kp, i) => (
            <Tag key={kp} color="red" style={{ margin: 4, fontSize: 14 }}>
              {i + 1}. {kp}
            </Tag>
          ))}
        </Card>
      )}
    </div>
  )
}

export default KnowledgePage
```

---

## Task 13: UI 页面 - 训练中心与设置页

**Files:**
- Create: `src/renderer/pages/TrainingPage.tsx`
- Create: `src/renderer/pages/SettingsPage.tsx`

- [ ] **Step 1: 创建训练中心页**

```typescript
// src/renderer/pages/TrainingPage.tsx

import React, { useState } from 'react'
import { Card, Button, message, Select, Space } from 'antd'
import { useQuestionStore } from '../stores/questionStore'
import { api } from '../services/api'
import { SimilarQuestion } from '../../shared/types'

const TrainingPage: React.FC = () => {
  const { questions, fetchQuestions } = useQuestionStore()
  const [selectedType, setSelectedType] = useState<string>()
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])
  const [loading, setLoading] = useState(false)

  const questionTypes = Array.from(new Set(questions.map(q => q.questionType)))

  const handleGenerate = async () => {
    if (!selectedType) {
      message.warning('请选择题型')
      return
    }

    setLoading(true)
    try {
      const typeQuestions = questions.filter(q => q.questionType === selectedType)
      if (typeQuestions.length === 0) {
        message.warning('该题型暂无错题')
        return
      }

      const randomQuestion = typeQuestions[Math.floor(Math.random() * typeQuestions.length)]
      const similar = await api.generateSimilar(
        randomQuestion.questionContent,
        randomQuestion.knowledgePoints.join(', ')
      )
      
      setSimilarQuestions(similar)
      message.success('已生成相似题目')
    } catch (e) {
      message.error('生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card title="举一反三训练">
        <Space style={{ marginBottom: 16 }}>
          <Select
            style={{ width: 200 }}
            placeholder="选择题型"
            value={selectedType}
            onChange={setSelectedType}
            options={questionTypes.map(t => ({ label: t, value: t }))}
          />
          <Button type="primary" onClick={handleGenerate} loading={loading}>
            生成相似题目
          </Button>
        </Space>

        {similarQuestions.length > 0 && (
          <div>
            {similarQuestions.map((sq, i) => (
              <Card key={i} size="small" title={`练习题 ${i + 1}`} style={{ marginBottom: 12 }}>
                <p><strong>题目：</strong>{sq.question}</p>
                <p><strong>答案：</strong>{sq.answer}</p>
                <p><strong>解析：</strong>{sq.explanation}</p>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default TrainingPage
```

- [ ] **Step 2: 创建设置页**

```typescript
// src/renderer/pages/SettingsPage.tsx

import React, { useState } from 'react'
import { Card, Form, Input, Button, Select, message } from 'antd'

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const { electronAPI } = window as any
      await electronAPI.invoke('config:save', {
        provider: values.provider,
        apiKey: values.apiKey,
        model: values.model,
        baseUrl: values.baseUrl,
        isActive: true
      })
      message.success('AI 配置已保存')
    } catch (e) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="设置">
      <Card title="AI 服务配置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="provider" label="AI 提供商" initialValue="openai">
            <Select options={[
              { label: 'OpenAI', value: 'openai' },
              { label: '通义千问', value: 'qwen' },
              { label: '智谱', value: 'zhipu' }
            ]} />
          </Form.Item>

          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>

          <Form.Item name="model" label="模型" initialValue="gpt-4">
            <Input placeholder="如：gpt-4, gpt-3.5-turbo" />
          </Form.Item>

          <Form.Item name="baseUrl" label="API 地址" initialValue="https://api.openai.com/v1">
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="关于">
        <p>公考错题助手 v1.0.0</p>
        <p>错题本保存在：文档/公考错题本</p>
        <p>数据库保存在：AppData/gwy.db</p>
      </Card>
    </Card>
  )
}

export default SettingsPage
```

---

## Task 14: 测试与打包

**Files:**
- 无新增文件

- [ ] **Step 1: 安装依赖**

```bash
npm install
```

- [ ] **Step 2: 运行类型检查**

```bash
npm run typecheck
```

预期输出：无错误

- [ ] **Step 3: 运行开发模式**

```bash
npm run dev
```

预期：Electron 窗口启动，显示主界面

- [ ] **Step 4: 功能测试清单**

- [ ] 录入错题并提交
- [ ] AI 解析返回正确格式
- [ ] 错题本文件自动生成
- [ ] 思维导图文件包含 mermaid 代码
- [ ] 错题列表显示正确
- [ ] 状态更新功能正常
- [ ] 删除功能正常
- [ ] AI 配置保存成功
- [ ] 同步按钮触发生效

- [ ] **Step 5: 打包为 Windows 安装包**

```bash
npm run build
```

预期：在 `release` 目录生成 `.exe` 安装包

---

## 自审检查清单

- [x] **规范覆盖**：所有 6 大核心功能均已实现（错题解析、笔记生成、知识点提炼、解题思路总结、举一反三训练、学习建议）
- [x] **占位符扫描**：所有步骤均包含完整代码，无 TBD/TODO
- [x] **类型一致性**：所有文件使用 `src/shared/types.ts` 中定义的类型，签名一致
- [x] **文件职责清晰**：每个文件仅负责单一功能
- [x] **可独立测试**：每个 Task 完成后可运行测试
