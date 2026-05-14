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
  solvingTips: string
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
    solvingTips
  }
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`【${sectionName}】([\\s\\S]*?)(?=【|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}
