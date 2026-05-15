# 错题复盘模板优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有的简单 AI 分析升级为结构化的五步复盘系统，支持智能粘贴解析和深度统计分析。

**Architecture:** 在现有 Electron + React + TypeScript + SQLite 架构基础上，扩展数据模型、优化 AI Prompt、重构前端界面，分三个阶段实施：核心复盘功能 → 统计分析 → Markdown 优化。

**Tech Stack:** Electron, React, TypeScript, Zustand, SQLite, OpenAI API (兼容国内提供商)

---

## 文件结构映射

### 新增文件
- `docs/superpowers/plans/2026-05-14-review-template-optimization.md` - 本计划文件
- `src/renderer/pages/StatisticsPage.tsx` - 统计分析页面
- `src/renderer/pages/ReviewResultPage.tsx` - 复盘结果展示组件（独立页面或内联）
- `database/migrations/add-review-fields.sql` - 数据库迁移脚本

### 修改文件
- `src/shared/types.ts` - 新增复盘相关类型字段
- `database/init.sql` - 新增复盘相关表字段
- `src/main/utils/prompts.ts` - 新增智能解析和五步复盘 Prompt
- `src/main/services/aiService.ts` - 新增复盘分析方法
- `src/main/ipc/handlers.ts` - 新增复盘相关 IPC 处理器
- `src/renderer/services/api.ts` - 新增复盘相关 API 调用
- `src/renderer/components/QuestionForm.tsx` - 重构为智能粘贴模式 + 五步复盘展示
- `src/renderer/pages/InputPage.tsx` - 调整布局适配新组件
- `src/renderer/App.tsx` - 新增统计分析页面路由
- `src/main/services/markdownService.ts` - 更新 Markdown 模板

---

## 实施阶段

### 阶段一：核心复盘功能

#### Task 1: 扩展数据模型（类型定义）

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `database/init.sql`

- [ ] **Step 1: 扩展 WrongQuestion 接口**

在 `src/shared/types.ts` 中，找到 `WrongQuestion` 接口，新增以下字段：

```typescript
export interface WrongQuestion {
  id: number
  createdAt: string
  updatedAt: string
  subject: string
  questionType: string
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
  
  // === 新增复盘字段 ===
  structureAnalysis?: string          // 拆结构分析（JSON 格式存储层次信息）
  errorCauseType?: string             // 错因类型（8 种标准类型之一）
  errorCauseDetail?: string           // 具体错因说明
  optionAnalysis?: string             // 选项对比分析（JSON 格式）
  avoidPitfallMantra?: string         // 避坑口诀
  similarQuestionIds?: string         // 同类题 ID 列表（JSON 数组）
  selfCheckAction?: string            // 自查动作描述
}
```

同时在 `src/shared/types.ts` 中新增错因类型常量：

```typescript
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
```

- [ ] **Step 2: 更新数据库表结构**

在 `database/init.sql` 中，找到 `wrong_questions` 表的 CREATE TABLE 语句，在 `source TEXT` 后新增字段：

```sql
    structure_analysis TEXT DEFAULT NULL,
    error_cause_type TEXT DEFAULT NULL,
    error_cause_detail TEXT DEFAULT NULL,
    option_analysis TEXT DEFAULT NULL,
    avoid_pitfall_mantra TEXT DEFAULT NULL,
    similar_question_ids TEXT DEFAULT NULL,
    self_check_action TEXT DEFAULT NULL,
```

注意：使用下划线命名（snake_case）作为数据库字段名，TypeScript 中使用驼峰命名（camelCase）。

- [ ] **Step 3: 更新 questionRepository.ts 中的字段映射**

在 `src/main/database/questionRepository.ts` 中，找到 `mapRowToQuestion` 或类似方法，新增字段映射：

```typescript
// 在现有的字段映射后新增
structureAnalysis: row.structure_analysis as string | null,
errorCauseType: row.error_cause_type as string | null,
errorCauseDetail: row.error_cause_detail as string | null,
optionAnalysis: row.option_analysis as string | null,
avoidPitfallMantra: row.avoid_pitfall_mantra as string | null,
similarQuestionIds: row.similar_question_ids as string | null,
selfCheckAction: row.self_check_action as string | null,
```

同时在 INSERT/UPDATE 语句中新增对应的字段。

- [ ] **Step 4: 运行测试确保无类型错误**

```bash
npm run typecheck
# 或
npx tsc --noEmit
```

Expected: PASS (no type errors)

---

#### Task 2: 新增智能解析 Prompt

**Files:**
- Modify: `src/main/utils/prompts.ts`

- [ ] **Step 1: 添加 parseQuestion prompt**

在 `src/main/utils/prompts.ts` 的 `PROMPTS` 对象中添加：

```typescript
parseQuestion: (content: string): string => `
你是一名公务员考试题目解析专家。请从用户粘贴的内容中提取题目信息。

注意：请不要使用任何 Markdown 语法（不要用 ** 加粗、# 标题等符号），直接输出纯文本。

请按照以下 JSON 格式输出（不要输出其他内容）：
{
  "questionStem": "题目题干部分（不包含选项）",
  "options": {
    "A": "选项 A 的内容",
    "B": "选项 B 的内容",
    "C": "选项 C 的内容",
    "D": "选项 D 的内容"
  },
  "correctAnswer": "正确答案的选项字母，如 A/B/C/D"
}

如果无法识别正确答案，请返回空字符串。

用户粘贴的内容：
${content}
`
```

- [ ] **Step 2: 添加五步复盘 Prompt**

在 `PROMPTS` 对象中添加：

```typescript
analyzeReview: (
  questionStem: string,
  options: string,
  userAnswer: string,
  correctAnswer: string,
  questionType: string
): string => `
你是一名公务员考试辅导专家。请对以下错题进行结构化复盘分析，按照公考标准答案解析格式输出。

注意：请不要使用任何 Markdown 语法（不要用 ** 加粗、# 标题等符号），直接输出纯文本。
注意：语言要简洁专业，符合公考解析标准。

【错误类型】（从以下选择：知识点掌握不足/解题思路偏差/审题失误/计算错误/时间管理不当/心理因素）

【第一步：拆结构】
请按以下格式分析文段结构：
| 层次 | 内容概括 | 作用（铺垫/过渡/重心/补充） |
| 第一层 | ... | ... |
| 第二层 | ... | ... |
...
判断重心句的方法：
1. 位置法：尾句是重心的概率最高（60-70%）
2. 关联词法：因此/所以/但是/实际上 → 后面是重心
3. 删减法：删掉某句后文章意思不变 → 不是重心
请明确指出重心在第几层。

【第二步：分析错因】
请从以下错因类型中选择最贴合的一个：
- 把背景当主旨（被开头数据/现象吸引，忽略后文重心）
- 以偏概全（选项只覆盖了部分内容，不是全文主旨）
- 无中生有（选项出现了原文没提到的概念）
- 过度推断（原文只说了A，选项推到了B）
- 偷换概念（选项把原文的关键词换成了相似但不同的词）
- 只看表面（被选项的个别词吸引，没看整体逻辑）
- 转折/递进没抓住（重心在转折后或递进后，却选了前面的内容）

具体错因说明：请结合题目具体分析用户为什么选错

【第三步：对比选项】
请逐项分析，每项占一行，使用以下排除术语：
- A项，...非重点，排除；
- B项，...范围缩小/扩大，排除；
- C项，...是正确答案；
- D项，...无中生有/偏离文意/强加因果/偷换概念，排除。

【正确答案】
故正确答案为 ${correctAnswer}

【第四步：提炼避坑口诀】
请用一句话总结这道题的教训，以后做题能快速想起来。格式：口诀：...

【第五步：同类题标记】
这道题的坑和之前什么类型的题目一样？下次遇到类似题型，自查动作是什么？

题目：${questionStem}
选项：${options}
用户答案：${userAnswer}
正确答案：${correctAnswer}
题型：${questionType}

请严格按照上述格式输出，不要添加其他内容。语言简洁专业，符合公考解析标准。
`
```

- [ ] **Step 3: 添加 parseReviewResponse 解析函数**

在 `prompts.ts` 文件末尾添加：

```typescript
export function parseReviewResponse(text: string): {
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
} {
  const rawErrorType = extractSection(text, '错误类型')
  const rawStructure = extractSection(text, '第一步：拆结构')
  const rawErrorCause = extractSection(text, '第二步：分析错因')
  const rawOptionAnalysis = extractSection(text, '第三步：对比选项')
  const rawCorrectAnswer = extractSection(text, '正确答案')
  const rawMantra = extractSection(text, '第四步：提炼避坑口诀')
  const rawSimilarTag = extractSection(text, '第五步：同类题标记')
  const rawKnowledgePoints = extractSection(text, '核心知识点')
  const rawSolvingTips = extractSection(text, '解题技巧')

  const cleanErrorType = cleanMarkdown(rawErrorType)
  const cleanStructure = cleanMarkdown(rawStructure)
  const cleanCorrectAnswer = cleanMarkdown(rawCorrectAnswer)
  
  // 从错因部分提取错因类型和具体说明
  const errorCauseLines = cleanMarkdown(rawErrorCause).split('\n').filter(Boolean)
  const errorCauseType = errorCauseLines.find(line => 
    ERROR_CAUSE_TYPES.some(t => line.includes(t))
  )?.trim() || ''
  const errorCauseDetail = errorCauseLines.filter(line => 
    !ERROR_CAUSE_TYPES.some(t => line.includes(t)) && line.trim()
  ).join('\n')

  const optionAnalysis = cleanMarkdown(rawOptionAnalysis)
  const mantra = cleanMarkdown(rawMantra).replace(/^口诀[：:]/, '')
  const selfCheckAction = cleanMarkdown(rawSimilarTag)

  const knowledgePoints = rawKnowledgePoints
    ? rawKnowledgePoints.split(/[\n,，]/)
        .map(s => cleanMarkdown(s).replace(/^[-•*]\s*/, ''))
        .filter(s => s.length > 2)
    : []

  return {
    errorType: cleanErrorType,
    structureAnalysis: cleanStructure,
    errorCauseType,
    errorCauseDetail,
    optionAnalysis,
    correctSolution: cleanCorrectAnswer,
    avoidPitfallMantra: mantra,
    selfCheckAction,
    knowledgePoints,
    solvingTips: cleanMarkdown(rawSolvingTips)
  }
}
```

- [ ] **Step 4: 导出新函数**

在文件末尾的 export 语句中确保新增的函数被导出：

```typescript
export { extractSection, parseReviewResponse }
```

---

#### Task 3: 新增 AI 服务方法

**Files:**
- Modify: `src/main/services/aiService.ts`

- [ ] **Step 1: 新增 parseQuestion 方法**

在 `aiService` 对象中添加：

```typescript
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
}
```

- [ ] **Step 2: 新增 analyzeReview 方法**

在 `aiService` 对象中添加：

```typescript
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
    
    // 将 options 对象格式化为字符串
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
```

- [ ] **Step 3: 确保 import parseReviewResponse**

在文件顶部 import 语句中添加 `parseReviewResponse`：

```typescript
import { PROMPTS, parseAnalysisResponse, parseReviewResponse, extractSection } from '../utils/prompts'
```

---

#### Task 4: 新增 IPC 处理器

**Files:**
- Modify: `src/main/ipc/handlers.ts`

- [ ] **Step 1: 添加 ai:parseQuestion 处理器**

在 `ai:analyzeError` 处理器之后添加：

```typescript
withErrorHandling('ai:parseQuestion', async (content: string) => {
  log.info('[ai:parseQuestion] Parsing question content', { contentLength: content?.length || 0 })
  const result = await aiService.parseQuestion(content)
  log.info('[ai:parseQuestion] Parsing completed', { 
    hasCorrectAnswer: Boolean(result?.correctAnswer),
    optionsCount: Object.keys(result?.options || {}).length
  })
  return result
})
```

- [ ] **Step 2: 添加 ai:analyzeReview 处理器**

```typescript
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
```

---

#### Task 5: 新增前端 API 调用

**Files:**
- Modify: `src/renderer/services/api.ts`

- [ ] **Step 1: 添加 parseQuestion 方法**

在 `api` 对象中添加：

```typescript
async parseQuestion(content: string): Promise<{
  questionStem: string
  options: Record<string, string>
  correctAnswer: string
}> {
  return window.electronAPI.invoke('ai:parseQuestion', content)
},
```

- [ ] **Step 2: 添加 analyzeReview 方法**

```typescript
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
```

---

#### Task 6: 重构 QuestionForm 组件（智能粘贴模式）

**Files:**
- Modify: `src/renderer/components/QuestionForm.tsx`

这是最大的改动。将现有的表单重构为智能粘贴模式 + 五步复盘展示。

- [ ] **Step 1: 更新组件状态**

修改 state 定义：

```typescript
const QuestionForm: React.FC<QuestionFormProps> = ({ onSuccess, questionContent = '', onContentChange }) => {
  const [subject, setSubject] = useState('行测')
  const [questionType, setQuestionType] = useState('言语理解')
  const [rawContent, setRawContent] = useState('')        // 粘贴的原始内容
  const [parsedQuestion, setParsedQuestion] = useState<{  // AI 解析后的题目
    questionStem: string
    options: Record<string, string>
    correctAnswer: string
  } | null>(null)
  const [userAnswer, setUserAnswer] = useState('')         // 用户选择的答案
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'parsing' | 'analyzing' | 'review' | 'confirm'>('input')
  const [aiResult, setAiResult] = useState<any>(null)
  const [correctionAnswer, setCorrectionAnswer] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
```

- [ ] **Step 2: 添加智能解析函数**

```typescript
const handleParseQuestion = async () => {
  if (!rawContent.trim()) {
    alert('请粘贴题目内容')
    return
  }

  setStep('parsing')
  setLoading(true)

  try {
    const result = await api.parseQuestion(rawContent)
    setParsedQuestion(result)
    setStep('analyzing')
  } catch (e) {
    log.error('Parse question failed', e as Error)
    alert('题目解析失败，请检查内容格式后重试')
    setStep('input')
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 3: 添加复盘分析函数**

```typescript
const handleAnalyzeReview = async () => {
  if (!parsedQuestion || !userAnswer.trim()) {
    alert('请选择你的答案')
    return
  }

  setStep('analyzing')
  setLoading(true)

  try {
    const result = await api.analyzeReview(
      parsedQuestion.questionStem,
      parsedQuestion.options,
      userAnswer.trim(),
      parsedQuestion.correctAnswer || userAnswer.trim(),  // 如果 AI 没识别出正确答案，使用用户答案
      questionType
    )
    setAiResult(result)
    setStep('review')
  } catch (e) {
    log.error('Review analysis failed', e as Error)
    alert('分析失败，请重试')
    setStep('analyzing')
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 4: 更新 handleConfirm 保存逻辑**

修改保存函数，将复盘结果保存到数据库：

```typescript
const handleConfirm = async () => {
  if (!aiResult || !parsedQuestion) return

  log.logUserAction('confirm_and_save_review', { 
    errorType: aiResult.errorType,
    errorCauseType: aiResult.errorCauseType
  })
  setLoading(true)

  try {
    const question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
      subject,
      questionType,
      questionContent: rawContent,
      userAnswer,
      correctAnswer: parsedQuestion.correctAnswer || '',
      errorType: aiResult.errorType as ErrorType,
      errorAnalysis: aiResult.errorAnalysis || aiResult.structureAnalysis || '',
      correctSolution: aiResult.correctSolution,
      knowledgePoints: aiResult.knowledgePoints,
      similarQuestions: [],
      status: 'pending',
      source: source || '未知',
      // 新增复盘字段
      structureAnalysis: aiResult.structureAnalysis,
      errorCauseType: aiResult.errorCauseType,
      errorCauseDetail: aiResult.errorCauseDetail,
      optionAnalysis: aiResult.optionAnalysis,
      avoidPitfallMantra: aiResult.avoidPitfallMantra,
      similarQuestionIds: aiResult.similarQuestionIds || '[]',
      selfCheckAction: aiResult.selfCheckAction,
    }

    await api.createQuestion(question)
    log.info('Review saved successfully')

    // 重置状态
    setRawContent('')
    setParsedQuestion(null)
    setUserAnswer('')
    setSource('')
    setAiResult(null)
    setStep('input')
    onSuccess?.()
  } catch (e) {
    log.error('Save review failed', e as Error)
    alert((e as Error).message)
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 5: 重构 input 步骤的 UI**

将输入步骤改为智能粘贴模式：

```tsx
{step === 'input' && (
  <>
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
        科目 <span style={{ color: 'red' }}>*</span>
      </label>
      <select
        value={subject}
        onChange={(e) => {
          setSubject(e.target.value)
          setQuestionType(questionTypeOptions[e.target.value][0])
        }}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }}
      >
        <option value="行测">行测</option>
        <option value="申论">申论</option>
      </select>
    </div>

    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
        题型 <span style={{ color: 'red' }}>*</span>
      </label>
      <select
        value={questionType}
        onChange={(e) => setQuestionType(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 }}
      >
        {questionTypeOptions[subject].map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    </div>

    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
        粘贴完整题目 <span style={{ color: 'red' }}>*</span>
      </label>
      <p style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
        请粘贴包含题干、选项和正确答案的完整题目内容，AI 将自动解析
      </p>
      <textarea
        value={rawContent}
        onChange={(e) => {
          setRawContent(e.target.value)
          onContentChange?.(e.target.value)
        }}
        placeholder="请粘贴完整题目内容，例如：&#10;文段首先指出...&#10;A. xxx&#10;B. xxx&#10;C. xxx&#10;D. xxx&#10;正确答案：C"
        rows={12}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          fontSize: 14,
          resize: 'vertical',
          boxSizing: 'border-box'
        }}
      />
    </div>

    <button
      onClick={handleParseQuestion}
      disabled={!rawContent.trim() || loading}
      style={{
        width: '100%',
        padding: '12px 24px',
        background: !rawContent.trim() || loading ? '#d9d9d9' : '#1890ff',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        fontSize: 16,
        cursor: !rawContent.trim() || loading ? 'not-allowed' : 'pointer'
      }}
    >
      {loading ? 'AI 解析中...' : '🔍 AI 智能解析题目'}
    </button>
  </>
)}
```

- [ ] **Step 6: 添加 parsing 步骤 UI**

```tsx
{step === 'parsing' && (
  <div style={{ textAlign: 'center', padding: 60 }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
    <h3>AI 正在解析题目内容...</h3>
    <p style={{ color: '#666' }}>请稍候，正在识别题干、选项和正确答案</p>
  </div>
)}
```

- [ ] **Step 7: 添加解析后确认步骤 UI**

在解析完成后，显示解析结果让用户确认并选择自己的答案：

```tsx
{step === 'analyzing' && parsedQuestion && (
  <>
    <div style={{ marginBottom: 24, padding: 20, background: '#f0f9ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
      <h3 style={{ marginTop: 0, color: '#096dd9' }}>📋 AI 解析结果</h3>
      
      <div style={{ marginBottom: 16 }}>
        <strong>题干：</strong>
        <div style={{ padding: 12, background: 'white', borderRadius: 6, lineHeight: 2, marginTop: 8 }}>
          {parsedQuestion.questionStem}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>选项：</strong>
        <div style={{ padding: 12, background: 'white', borderRadius: 6, lineHeight: 2, marginTop: 8 }}>
          {Object.entries(parsedQuestion.options).map(([key, value]) => (
            <div key={key} style={{ marginBottom: 4 }}>
              <strong>{key}.</strong> {value}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>AI 识别的正确答案：</strong>
        <span style={{ 
          padding: '4px 12px', 
          background: '#52c41a', 
          color: 'white', 
          borderRadius: 4,
          marginLeft: 8
        }}>
          {parsedQuestion.correctAnswer || '未识别'}
        </span>
      </div>
    </div>

    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
        你的选择 <span style={{ color: 'red' }}>*</span>
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        {['A', 'B', 'C', 'D'].map(option => (
          <button
            key={option}
            onClick={() => setUserAnswer(option)}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: userAnswer === option ? '#1890ff' : 'white',
              color: userAnswer === option ? 'white' : '#333',
              border: `2px solid ${userAnswer === option ? '#1890ff' : '#d9d9d9'}`,
              borderRadius: 4,
              fontSize: 16,
              cursor: 'pointer',
              fontWeight: userAnswer === option ? 'bold' : 'normal'
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>

    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
        题目来源
      </label>
      <input
        type="text"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="如：2024 国考行测真题"
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          fontSize: 14,
          boxSizing: 'border-box'
        }}
      />
    </div>

    <button
      onClick={handleAnalyzeReview}
      disabled={!userAnswer.trim() || loading}
      style={{
        width: '100%',
        padding: '12px 24px',
        background: !userAnswer.trim() || loading ? '#d9d9d9' : '#52c41a',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        fontSize: 16,
        cursor: !userAnswer.trim() || loading ? 'not-allowed' : 'pointer'
      }}
    >
      {loading ? 'AI 分析中...' : '📊 开始 AI 五步复盘'}
    </button>
  </>
)}
```

- [ ] **Step 8: 添加五步复盘展示 UI**

```tsx
{step === 'review' && aiResult && (
  <>
    <div style={{ marginBottom: 24, padding: 20, background: '#f0f9ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
      <h3 style={{ marginTop: 0, color: '#096dd9', borderBottom: '2px solid #91d5ff', paddingBottom: 12 }}>📊 AI 五步复盘结果</h3>
      
      {/* 错误类型 */}
      <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
        <strong style={{ color: '#cf1322' }}>🔍 错误类型：</strong>
        <span style={{ marginLeft: 8, color: '#cf1322', fontWeight: 600 }}>{aiResult.errorType}</span>
      </div>

      {/* 第一步：拆结构 */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>📊 第一步：拆结构</h4>
        <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #e8e8e8' }}>
          {(aiResult.structureAnalysis || '').split('\n').filter(Boolean).map((line: string, i: number) => (
            <div key={i} style={{ marginBottom: 8 }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* 第二步：分析错因 */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>🎯 第二步：分析错因</h4>
        <div style={{ padding: '12px 16px', background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7', marginBottom: 12 }}>
          <strong style={{ color: '#cf1322' }}>错因类型：</strong>
          <span style={{ marginLeft: 8, color: '#cf1322', fontWeight: 600 }}>{aiResult.errorCauseType}</span>
        </div>
        <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #e8e8e8' }}>
          <strong>具体原因：</strong>
          <div style={{ marginTop: 8 }}>
            {(aiResult.errorCauseDetail || '').split('\n').filter(Boolean).map((line: string, i: number) => (
              <div key={i} style={{ marginBottom: 4 }}>{line}</div>
            ))}
          </div>
        </div>
      </div>

      {/* 第三步：对比选项 */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>📝 第三步：对比选项</h4>
        <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #e8e8e8' }}>
          {(aiResult.optionAnalysis || '').split('\n').filter(Boolean).map((line: string, i: number) => (
            <div key={i} style={{ marginBottom: 8 }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* 正确答案 */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ color: '#52c41a', margin: '0 0 12px 0' }}>✅ 正确答案</h4>
        <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #b7eb8f', color: '#389e0d' }}>
          {aiResult.correctSolution}
        </div>
      </div>

      {/* 第四步：避坑口诀 */}
      {aiResult.avoidPitfallMantra && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ color: '#722ed1', margin: '0 0 12px 0' }}>💡 第四步：避坑口诀</h4>
          <div style={{ padding: 16, background: '#f9f0ff', borderRadius: 6, lineHeight: 2, border: '1px solid #d3adf7', color: '#531dab' }}>
            {aiResult.avoidPitfallMantra}
          </div>
        </div>
      )}

      {/* 第五步：同类题标记 */}
      {aiResult.selfCheckAction && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ color: '#13c2c2', margin: '0 0 12px 0' }}>🔗 第五步：同类题标记</h4>
          <div style={{ padding: 16, background: '#e6fffb', borderRadius: 6, lineHeight: 2, border: '1px solid #87e8de', color: '#08979c' }}>
            {aiResult.selfCheckAction}
          </div>
        </div>
      )}
    </div>

    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: loading ? '#d9d9d9' : '#52c41a',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '保存中...' : '✓ 复盘正确，保存'}
        </button>
        <button
          onClick={() => { setAiResult(null); setStep('input'); }}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: 'white',
            color: '#666',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          ✗ 重新录入
        </button>
      </div>
    </div>
  </>
)}
```

---

### 阶段二：统计分析

#### Task 7: 创建统计分析页面

**Files:**
- Create: `src/renderer/pages/StatisticsPage.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/services/api.ts`
- Modify: `src/main/ipc/handlers.ts`

- [ ] **Step 1: 新增统计 API 方法**

在 `src/renderer/services/api.ts` 中添加：

```typescript
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

async getStudyAdvice(): Promise<string> {
  return window.electronAPI.invoke('ai:generateStudyAdvice', {})
}
```

- [ ] **Step 2: 新增统计 IPC 处理器**

在 `src/main/ipc/handlers.ts` 中添加：

```typescript
withErrorHandling('stats:getReviewStats', async () => {
  log.info('[stats:getReviewStats] Fetching review statistics')
  const db = await getDatabase()
  
  // 总数和掌握数
  const totalResult = db.exec('SELECT COUNT(*) as total, SUM(CASE WHEN status = "mastered" THEN 1 ELSE 0 END) as mastered FROM wrong_questions')
  const total = totalResult[0]?.values[0]?.[0] as number || 0
  const mastered = totalResult[0]?.values[0]?.[1] as number || 0

  // 按错因类型统计
  const errorCauseResult = db.exec('SELECT error_cause_type, COUNT(*) as count FROM wrong_questions WHERE error_cause_type IS NOT NULL GROUP BY error_cause_type ORDER BY count DESC')
  const byErrorCause: Record<string, number> = {}
  if (errorCauseResult.length > 0) {
    errorCauseResult[0].values.forEach(row => {
      byErrorCause[row[0] as string] = row[1] as number
    })
  }

  // 按题型统计
  const typeResult = db.exec('SELECT question_type, COUNT(*) as count FROM wrong_questions GROUP BY question_type ORDER BY count DESC')
  const byQuestionType: Record<string, number> = {}
  if (typeResult.length > 0) {
    typeResult[0].values.forEach(row => {
      byQuestionType[row[0] as string] = row[1] as number
    })
  }

  // 薄弱知识点（从 knowledge_points 中提取）
  const knowledgeResult = db.exec('SELECT knowledge_points FROM wrong_questions WHERE knowledge_points IS NOT NULL')
  const knowledgeMap: Record<string, number> = {}
  if (knowledgeResult.length > 0) {
    knowledgeResult[0].values.forEach(row => {
      const points = JSON.parse(row[0] as string || '[]')
      points.forEach((point: string) => {
        const name = point.split('→')[0]?.trim()
        if (name) {
          knowledgeMap[name] = (knowledgeMap[name] || 0) + 1
        }
      })
    })
  }
  const topWeakPoints = Object.entries(knowledgeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  // 避坑口诀数量
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
```

- [ ] **Step 3: 创建 StatisticsPage 组件**

创建 `src/renderer/pages/StatisticsPage.tsx`：

```tsx
import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { createRendererLogger } from '../utils/logger'

const log = createRendererLogger('StatisticsPage')

interface ReviewStats {
  totalQuestions: number
  masteredCount: number
  byErrorCause: Record<string, number>
  byQuestionType: Record<string, number>
  topWeakPoints: string[]
  mantrasCollected: number
}

const StatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [advice, setAdvice] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, adviceData] = await Promise.all([
        api.getReviewStats(),
        api.getStudyAdvice()
      ])
      setStats(statsData)
      setAdvice(adviceData)
    } catch (e) {
      log.error('Failed to load statistics', e as Error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h3>加载统计数据中...</h3>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p>暂无统计数据</p>
      </div>
    )
  }

  const masteryRate = stats.totalQuestions > 0 
    ? Math.round((stats.masteredCount / stats.totalQuestions) * 100) 
    : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>📊 学习统计分析</h2>

      {/* 概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 8, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1890ff' }}>{stats.totalQuestions}</div>
          <div style={{ color: '#666', marginTop: 8 }}>总错题数</div>
        </div>
        <div style={{ background: 'white', borderRadius: 8, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#52c41a' }}>{masteryRate}%</div>
          <div style={{ color: '#666', marginTop: 8 }}>掌握率</div>
        </div>
        <div style={{ background: 'white', borderRadius: 8, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#722ed1' }}>{stats.mantrasCollected}</div>
          <div style={{ color: '#666', marginTop: 8 }}>避坑口诀</div>
        </div>
      </div>

      {/* 错因类型分布 */}
      <div style={{ background: 'white', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, color: '#1890ff' }}>🎯 错因类型分布</h3>
        {Object.entries(stats.byErrorCause).map(([cause, count]) => {
          const percentage = stats.totalQuestions > 0 ? Math.round((count / stats.totalQuestions) * 100) : 0
          return (
            <div key={cause} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{cause}</span>
                <span style={{ color: '#666' }}>{count}题 ({percentage}%)</span>
              </div>
              <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${percentage}%`, 
                  background: '#ff4d4f',
                  borderRadius: 4,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 题型错误分布 */}
      <div style={{ background: 'white', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, color: '#1890ff' }}>📚 题型错误分布</h3>
        {Object.entries(stats.byQuestionType).map(([type, count]) => {
          const percentage = stats.totalQuestions > 0 ? Math.round((count / stats.totalQuestions) * 100) : 0
          return (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>{type}</span>
                <span style={{ color: '#666' }}>{count}题 ({percentage}%)</span>
              </div>
              <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${percentage}%`, 
                  background: '#1890ff',
                  borderRadius: 4,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 薄弱知识点 */}
      {stats.topWeakPoints.length > 0 && (
        <div style={{ background: 'white', borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, color: '#fa8c16' }}>⚠️ 薄弱知识点</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.topWeakPoints.map((point, i) => (
              <span key={i} style={{
                padding: '8px 16px',
                background: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 20,
                color: '#d46b08',
                fontSize: 14
              }}>
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI 学习建议 */}
      {advice && (
        <div style={{ background: 'white', borderRadius: 8, padding: 24 }}>
          <h3 style={{ marginTop: 0, color: '#52c41a' }}>💡 AI 学习建议</h3>
          <div style={{ lineHeight: 2, color: '#333' }}>
            {advice.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} style={{ marginBottom: 8 }}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatisticsPage
```

- [ ] **Step 4: 更新 App.tsx 添加统计分析路由**

在 `src/renderer/App.tsx` 中：

1. 添加 import：
```tsx
import StatisticsPage from './pages/StatisticsPage'
```

2. 在 menuItems 中添加：
```tsx
{ key: 'statistics', icon: <BarChartOutlined />, label: '学习统计' }
```

注意：需要从 @ant-design/icons 导入 BarChartOutlined

3. 在 renderPage 中添加：
```tsx
case 'statistics': return <StatisticsPage />
```

- [ ] **Step 5: 添加 generateStudyAdvice IPC 处理器**

在 `src/main/ipc/handlers.ts` 中，找到现有的 `ai:generateAdvice` 处理器，更新它以使用新的统计

```typescript
withErrorHandling('ai:generateStudyAdvice', async () => {
  log.info('[ai:generateStudyAdvice] Generating study advice')
  
  // 获取统计数据
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
```

---

### 阶段三：Markdown 优化

#### Task 8: 更新 Markdown 模板

**Files:**
- Modify: `src/main/services/markdownService.ts`

- [ ] **Step 1: 查看现有 Markdown 模板结构**

先读取 `src/main/services/markdownService.ts` 了解当前模板格式。

- [ ] **Step 2: 更新错题复盘卡模板**

将现有的简单 Markdown 模板升级为结构化复盘格式：

```typescript
private generateQuestionMarkdown(question: WrongQuestion): string {
  const date = new Date(question.createdAt).toLocaleDateString('zh-CN')
  
  let md = `# 错题复盘卡

## 基本信息

- **日期：** ${date}
- **科目：** ${question.subject}
- **模块/题型：** ${question.questionType}
- **你的选择：** ${question.userAnswer}
- **正确答案：** ${question.correctAnswer}
- **题目来源：** ${question.source}
- **错误类型：** ${question.errorType}

---

`

  // 拆结构分析
  if (question.structureAnalysis) {
    md += `## 第一步：拆结构

${question.structureAnalysis}

---

`
  }

  // 错因分析
  if (question.errorCauseType || question.errorCauseDetail) {
    md += `## 第二步：分析错因

**错因类型：** ${question.errorCauseType || '未知'}

**具体原因：**
${question.errorCauseDetail || ''}

---

`
  }

  // 选项对比
  if (question.optionAnalysis) {
    md += `## 第三步：对比选项

${question.optionAnalysis}

---

`
  }

  // 正确答案
  if (question.correctSolution) {
    md += `## 正确答案

${question.correctSolution}

---

`
  }

  // 避坑口诀
  if (question.avoidPitfallMantra) {
    md += `## 第四步：避坑口诀

> ${question.avoidPitfallMantra}

---

`
  }

  // 同类题标记
  if (question.selfCheckAction) {
    md += `## 第五步：同类题标记

${question.selfCheckAction}

---

`
  }

  // 核心知识点
  if (question.knowledgePoints && question.knowledgePoints.length > 0) {
    md += `## 核心知识点

${question.knowledgePoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n')}

---

`
  }

  return md
}
```

- [ ] **Step 3: 测试 Markdown 生成**

启动应用，录入一道错题，检查生成的 Markdown 文件格式是否正确。

---

## 测试计划

### 手动测试用例

1. **智能解析测试**
   - 粘贴标准格式题目（含题干、选项、正确答案） → 验证 AI 正确解析
   - 粘贴非标准格式题目 → 验证容错处理

2. **五步复盘测试**
   - 完成完整录入流程 → 验证五步复盘结果展示
   - 验证拆结构、错因分类、选项对比、避坑口诀、同类题标记都正确显示

3. **保存测试**
   - 保存复盘卡 → 验证数据库中复盘字段正确保存
   - 检查 Markdown 错题本是否正确生成

4. **统计分析测试**
   - 录入多道错题后进入统计分析页面 → 验证数据正确显示
   - 验证错因分布、题型分布、薄弱知识点、AI 建议都正确

5. **回归测试**
   - 验证现有的纠错功能是否正常工作
   - 验证错题列表、知识图谱等其他页面不受影响

---

## 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AI 解析准确率低 | 用户需要手动修正 | 提供编辑功能让用户修改解析结果 |
| Prompt 过长导致 token 超限 | API 调用失败 | 控制 Prompt 长度，使用精简版本 |
| 数据库迁移导致现有数据丢失 | 历史错题丢失 | 先备份数据库，使用 ALTER TABLE 而非重建表 |
| 前端状态管理复杂 | 组件 bug 增多 | 分步实现，每步测试通过后再继续 |

---

## 提交策略

每个 Task 完成后提交一次，commit message 格式：

```
feat: 扩展数据模型 - 新增复盘相关字段
feat: 新增智能解析 Prompt
feat: 新增 AI 复盘分析方法
feat: 新增复盘相关 IPC 处理器
feat: 重构 QuestionForm 为智能粘贴模式
feat: 创建统计分析页面
feat: 更新 Markdown 模板为结构化复盘格式
```
