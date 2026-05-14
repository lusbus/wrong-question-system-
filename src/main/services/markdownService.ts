import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { WrongQuestion, QuestionStats } from '../../shared/types'

const QUESTION_TYPES_MAP: Record<string, string[]> = {
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
      ...Object.entries(QUESTION_TYPES_MAP).flatMap(([subject, types]) =>
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
    Object.entries(QUESTION_TYPES_MAP).forEach(([subject, types]) => {
      types.forEach(type => {
        const typeQuestions = questions.filter(
          q => q.subject === subject && q.questionType === type
        )
        this.writeTypeNotebook(subject, type, typeQuestions)
      })
    })
  }

  updateMindMaps(questions: WrongQuestion[]): void {
    Object.entries(QUESTION_TYPES_MAP).forEach(([subject, types]) => {
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
    
    Object.entries(QUESTION_TYPES_MAP).forEach(([subject, types]) => {
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

    const rows = questions.map((q) => {
      const icon = ERROR_TYPE_ICONS[q.errorType] || '⚪'
      const status = q.status === 'mastered' ? '✅ 已掌握' : '❌ 待复习'
      return `| ${q.id} | [错题${q.id}](#错题${q.id}) | ${icon} ${q.errorType} | ${q.knowledgePoints.join(', ')} | ${status} |`
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
    const rows = Object.entries(QUESTION_TYPES_MAP).flatMap(([subject, types]) => {
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
