import { cleanMarkdown } from './cleanText'
import { ERROR_CAUSE_TYPES } from '../../shared/types'

export const PROMPTS = {
  analyzeError: (question: string, userAnswer: string, correctAnswer: string, questionType: string): string => {
    const hasCorrectAnswer = correctAnswer && correctAnswer.trim()
    
    return `
你是一名公务员考试辅导专家。请分析以下错题，按照公考标准答案解析格式输出。

注意：请不要使用任何 Markdown 语法（不要用 ** 加粗、# 标题等符号），直接输出纯文本。
注意：语言要简洁专业，符合公考解析标准。

【错误类型】（从以下选择：知识点掌握不足/解题思路偏差/审题失误/计算错误/时间管理不当/心理因素）

【文段分析】
请按以下格式分析文段：
文段首先指出...接着具体介绍...在此基础上，尾句总结强调...
明确指出文段结构类型（如：总分结构/分总结构/总分总结构/并列结构等），重点强调什么内容。

【选项分析】
请逐项分析，每项占一行，使用以下排除术语：
- A项，...非重点，排除；
- B项，...范围缩小/扩大，排除；
- C项，...是正确答案；
- D项，...无中生有/偏离文意/强加因果/偷换概念，排除。

【正确答案】
故正确答案为 X

【核心知识点】
请列出3-5个知识点，格式：知识点名称 → 具体内容引申说明
例如：主旨概括 → 关注文段首尾句，通常是中心句

【解题技巧】该题型的通用解题思路

题目：${question}
用户答案：${userAnswer}
${hasCorrectAnswer ? `正确答案：${correctAnswer}` : '正确答案：（请根据题目内容分析并给出正确答案）'}
题型：${questionType}

${!hasCorrectAnswer ? '注意：用户没有提供正确答案，请你根据题目内容自行分析并给出正确答案。' : ''}

请严格按照上述格式输出，不要添加其他内容。语言简洁专业，符合公考解析标准。
`
  },

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
`,

  parseQuestion: (content: string): string => `
你是一名公务员考试题目解析专家。请从用户粘贴的内容中提取题目信息，并分析给出正确答案。

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
  "correctAnswer": "你分析后认为正确答案的选项字母，如 A/B/C/D"
}

重要：用户粘贴的题目可能不包含正确答案。请你根据题目内容自行分析，给出你认为正确的答案。

用户粘贴的内容：
${content}
`,

  analyzeReview: (
    questionStem: string,
    options: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ): string => {
    const isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase()
    
    return `
你是一名公务员考试辅导专家。请对以下题目进行结构化复盘分析，按照公考标准答案解析格式输出。

注意：请不要使用任何 Markdown 语法（不要用 ** 加粗、# 标题等符号），直接输出纯文本。
注意：语言要简洁专业，符合公考解析标准。

${isCorrect ? `
【答题情况】
用户答案：${userAnswer}
正确答案：${correctAnswer}
判断：✅ 回答正确！

虽然回答正确，但请继续分析，帮助用户巩固知识点，避免运气好的情况。
` : `
【答题情况】
用户答案：${userAnswer}
正确答案：${correctAnswer}
判断：❌ 回答错误

【错误类型】（从以下选择：知识点掌握不足/解题思路偏差/审题失误/计算错误/时间管理不当/心理因素）
`}

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

${!isCorrect ? `
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
` : `
【第二步：巩固知识点】
虽然回答正确，但请指出：
1. 这道题的核心考点是什么
2. 有没有容易混淆的点需要注意
3. 是否有"蒙对"的可能（如果题目设计有歧义）
`}

【第三步：对比选项】
请逐项分析，每项占一行，使用以下排除术语：
- A项，...非重点，排除；
- B项，...范围缩小/扩大，排除；
- C项，...是正确答案；
- D项，...无中生有/偏离文意/强加因果/偷换概念，排除。

【正确答案】
故正确答案为 ${correctAnswer}

【核心知识点】
请列出3-5个知识点，格式：知识点名称 → 具体内容引申说明
例如：主旨概括 → 关注文段首尾句，通常是中心句

【解题技巧】该题型的通用解题思路

${isCorrect ? `
【第四步：巩固口诀】
请用一句话总结这道题的核心要点，以后做题能快速想起来。格式：口诀：...

【第五步：举一反三】
这道题的考点可以延伸到哪些题型？下次遇到类似题型，解题动作是什么？
` : `
【第四步：提炼避坑口诀】
请用一句话总结这道题的教训，以后做题能快速想起来。格式：口诀：...

【第五步：同类题标记】
这道题的坑和之前什么类型的题目一样？下次遇到类似题型，自查动作是什么？
`}

题目：${questionStem}
选项：${options}
用户答案：${userAnswer}
正确答案：${correctAnswer}
题型：${questionType}

请严格按照上述格式输出，不要添加其他内容。语言简洁专业，符合公考解析标准。
`
  },

  reanalyzeWithCorrectAnswer: (
    question: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ): string => `
你是一名公务员考试辅导专家。用户反馈之前AI给出的答案可能不正确，现已提供官方正确答案。

请基于正确答案重新分析题目，并与之前的分析进行对比。

注意：请不要使用任何 Markdown 语法（不要用 ** 加粗、# 标题等符号），直接输出纯文本。
注意：语言要简洁专业，符合公考解析标准。

【正确答案对比】
请先对比说明：
- AI 之前认为的正确答案：请根据上下文推断
- 用户提供的正确答案：${correctAnswer}
- 判断：请判断用户提供的答案是否正确，并说明理由（如果AI之前错了，请坦诚承认并解释原因；如果用户的答案确实不对，请耐心解释为什么）

【文段分析】
请按以下格式分析文段：
文段首先指出...接着具体介绍...在此基础上，尾句总结强调...
明确指出文段结构类型（如：总分结构/分总结构/总分总结构/并列结构等），重点强调什么内容。

【选项分析】
请逐项分析，每项占一行，使用以下排除术语：
- A项，...非重点，排除；
- B项，...范围缩小/扩大，排除；
- C项，...是正确答案；
- D项，...无中生有/偏离文意/强加因果/偷换概念，排除。

【正确答案】
故正确答案为 ${correctAnswer}

【核心知识点】
请列出3-5个知识点，格式：知识点名称 → 具体内容引申说明
例如：主旨概括 → 关注文段首尾句，通常是中心句

【解题技巧】该题型的通用解题思路

【纠错说明】
如果AI之前的分析有误，请说明：
- 错误原因：为什么之前会分析错
- 教训：以后遇到类似题目应该如何正确分析

题目：${question}
用户答案：${userAnswer}
官方正确答案：${correctAnswer}
题型：${questionType}

请严格按照上述格式输出，不要添加其他内容。语言简洁专业，符合公考解析标准。
`
}

export function parseAnalysisResponse(text: string): {
  errorType: string
  errorAnalysis: string
  correctSolution: string
  knowledgePoints: string[]
  solvingTips: string
} {
  const rawErrorType = extractSection(text, '错误类型')
  
  // New format: 【文段分析】+【选项分析】+【正确答案】
  const rawParagraphAnalysis = extractSection(text, '文段分析')
  const rawOptionAnalysis = extractSection(text, '选项分析')
  const rawCorrectAnswer = extractSection(text, '正确答案')
  
  const rawKnowledgePoints = extractSection(text, '核心知识点')
  const rawSolvingTips = extractSection(text, '解题技巧')

  // Clean Markdown from all fields
  const errorType = cleanMarkdown(rawErrorType)
  
  // Combine paragraph analysis and option analysis into errorAnalysis
  const paragraphAnalysis = cleanMarkdown(rawParagraphAnalysis)
  const optionAnalysis = cleanMarkdown(rawOptionAnalysis)
  const correctAnswer = cleanMarkdown(rawCorrectAnswer)
  
  // Combine all three into errorAnalysis
  const errorAnalysis = [paragraphAnalysis, optionAnalysis].filter(Boolean).join('\n\n')
  const correctSolution = correctAnswer || cleanMarkdown(extractSection(text, '正确解法'))
  const solvingTips = cleanMarkdown(rawSolvingTips)

  const knowledgePoints = rawKnowledgePoints
    .split(/[\n,，]/)
    .map(s => cleanMarkdown(s).replace(/^[-•*]\s*/, ''))
    .filter(s => s.length > 2)

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
  
  // Try to extract "分析错因" first, fallback to "巩固知识点" for correct answers
  let rawErrorCause = extractSection(text, '第二步：分析错因')
  if (!rawErrorCause) {
    rawErrorCause = extractSection(text, '第二步：巩固知识点')
  }
  
  const rawOptionAnalysis = extractSection(text, '第三步：对比选项')
  const rawCorrectAnswer = extractSection(text, '正确答案')
  
  // Try to extract "避坑口诀" first, fallback to "巩固口诀" for correct answers
  let rawMantra = extractSection(text, '第四步：提炼避坑口诀')
  if (!rawMantra) {
    rawMantra = extractSection(text, '第四步：巩固口诀')
  }
  
  // Try to extract "同类题标记" first, fallback to "举一反三" for correct answers
  let rawSimilarTag = extractSection(text, '第五步：同类题标记')
  if (!rawSimilarTag) {
    rawSimilarTag = extractSection(text, '第五步：举一反三')
  }
  
  const rawKnowledgePoints = extractSection(text, '核心知识点')
  const rawSolvingTips = extractSection(text, '解题技巧')

  const cleanErrorType = cleanMarkdown(rawErrorType)
  const cleanStructure = cleanMarkdown(rawStructure)
  const cleanCorrectAnswer = cleanMarkdown(rawCorrectAnswer)
  
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

export { extractSection }
