import React, { useState } from 'react'
import { WrongQuestion, ErrorType, QuestionType } from '../../shared/types'
import { api } from '../services/api'
import { createRendererLogger } from '../utils/logger'

const log = createRendererLogger('QuestionForm')

interface QuestionFormProps {
  onSuccess?: () => void
  questionContent?: string
  onContentChange?: (content: string) => void
}

const questionTypeOptions: Record<string, string[]> = {
  '行测': ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析'],
  '申论': ['归纳概括', '综合分析', '贯彻执行', '文章写作']
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onSuccess, questionContent = '', onContentChange }) => {
  const [subject, setSubject] = useState('行测')
  const [questionType, setQuestionType] = useState('言语理解')
  const [rawContent, setRawContent] = useState('')
  const [parsedQuestion, setParsedQuestion] = useState<{
    questionStem: string
    options: Record<string, string>
    correctAnswer: string
  } | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'parsing' | 'analyzing' | 'review' | 'confirm'>('input')
  const [aiResult, setAiResult] = useState<any>(null)
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionAnswer, setCorrectionAnswer] = useState('')

  const handleParseQuestion = async () => {
    if (!rawContent.trim()) {
      alert('请粘贴题目内容')
      return
    }

    log.logUserAction('parse_question', { contentLength: rawContent.length })
    setStep('parsing')
    setLoading(true)

    try {
      const result = await api.parseQuestion(rawContent)
      setParsedQuestion(result)
      setStep('analyzing')
      log.logApiResponse('ai:parseQuestion', { success: true }, 0)
    } catch (e) {
      log.error('Parse question failed', e as Error)
      alert('题目解析失败，请检查内容格式后重试')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeReview = async () => {
    if (!parsedQuestion || !userAnswer.trim()) {
      alert('请选择你的答案')
      return
    }

    log.logUserAction('analyze_review', { userAnswer, correctAnswer: parsedQuestion.correctAnswer })
    setStep('analyzing')
    setLoading(true)

    try {
      const startTime = Date.now()
      const result = await api.analyzeReview(
        parsedQuestion.questionStem,
        parsedQuestion.options,
        userAnswer.trim(),
        parsedQuestion.correctAnswer || userAnswer.trim(),
        questionType
      )
      const duration = Date.now() - startTime
      log.logApiResponse('ai:analyzeReview', { success: true }, duration)

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

  const handleConfirm = async () => {
    if (!aiResult || !parsedQuestion) return

    log.logUserAction('confirm_and_save_review', {
      errorType: aiResult.errorType,
      errorCauseType: aiResult.errorCauseType
    })
    setLoading(true)

    try {
      const similar = await api.generateSimilar(
        parsedQuestion.questionStem,
        (aiResult.knowledgePoints || []).join(', ')
      )

      const question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
        subject: subject as '行测' | '申论',
        questionType: questionType as QuestionType,
        questionContent: rawContent,
        userAnswer,
        correctAnswer: parsedQuestion.correctAnswer || '',
        errorType: aiResult.errorType as ErrorType,
        errorAnalysis: aiResult.structureAnalysis || aiResult.errorAnalysis || '',
        correctSolution: aiResult.correctSolution,
        knowledgePoints: aiResult.knowledgePoints || [],
        similarQuestions: similar,
        status: 'pending',
        source: source || '未知',
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

      setRawContent('')
      setParsedQuestion(null)
      setUserAnswer('')
      setSource('')
      setAiResult(null)
      setShowCorrection(false)
      setStep('input')
      onSuccess?.()
    } catch (e) {
      log.error('Save review failed', e as Error)
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleLegacyConfirm = async () => {
    if (!aiResult) return

    log.logUserAction('confirm_and_save_legacy', {
      errorType: aiResult.errorType
    })
    setLoading(true)

    try {
      const similar = await api.generateSimilar(
        questionContent || rawContent,
        (aiResult.knowledgePoints || []).join(', ')
      )

      const question: Omit<WrongQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
        subject: subject as '行测' | '申论',
        questionType: questionType as QuestionType,
        questionContent: questionContent || rawContent,
        userAnswer,
        correctAnswer: aiResult.correctSolution || '',
        errorType: aiResult.errorType as ErrorType,
        errorAnalysis: aiResult.errorAnalysis || '',
        correctSolution: aiResult.correctSolution,
        knowledgePoints: aiResult.knowledgePoints || [],
        similarQuestions: similar,
        status: 'pending',
        source: source || '未知',
      }

      await api.createQuestion(question)
      log.info('Question saved successfully')

      setUserAnswer('')
      setSource('')
      setAiResult(null)
      setStep('input')
      onSuccess?.()
    } catch (e) {
      log.error('Save failed', e as Error)
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    log.logUserAction('cancel_analysis')
    setAiResult(null)
    setParsedQuestion(null)
    setRawContent('')
    setUserAnswer('')
    setStep('input')
  }

  return (
    <div style={{ maxWidth: 800 }}>
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
              请粘贴包含题干和选项的题目内容（不要包含正确答案），AI 将自动解析并给出答案
            </p>
            <textarea
              value={rawContent}
              onChange={(e) => {
                setRawContent(e.target.value)
                onContentChange?.(e.target.value)
              }}
              placeholder={`请粘贴题目内容，例如：\n文段首先指出...\nA. xxx\nB. xxx\nC. xxx\nD. xxx`}
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
            {loading ? 'AI 解析中...' : ' AI 智能解析题目'}
          </button>
        </>
      )}

      {step === 'parsing' && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3>AI 正在解析题目内容...</h3>
          <p style={{ color: '#666' }}>请稍候，正在识别题干、选项和正确答案</p>
        </div>
      )}

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
              <strong>AI 给出的正确答案：</strong>
              <span style={{
                padding: '4px 12px',
                background: '#52c41a',
                color: 'white',
                borderRadius: 4,
                marginLeft: 8
              }}>
                {parsedQuestion.correctAnswer || '未识别'}
              </span>
              <p style={{ fontSize: 12, color: '#666', marginTop: 8, marginBottom: 0 }}>
                请在下方选择你自己的答案，AI 将对比分析你的错因
              </p>
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
              placeholder="如：2024国考行测真题"
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
            {loading ? 'AI 分析中...' : ' 开始 AI 五步复盘'}
          </button>
        </>
      )}

      {step === 'analyzing' && !parsedQuestion && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h3>AI 正在分析你的错题...</h3>
          <p style={{ color: '#666' }}>请稍候，这可能需要几秒钟</p>
        </div>
      )}

      {step === 'review' && aiResult && (
        <>
          <div style={{ marginBottom: 24, padding: 20, background: '#f0f9ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
            <h3 style={{ marginTop: 0, color: '#096dd9', borderBottom: '2px solid #91d5ff', paddingBottom: 12 }}>📊 AI 五步复盘结果</h3>

            <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
              <strong style={{ color: '#cf1322' }}>🔍 错误类型：</strong>
              <span style={{ marginLeft: 8, color: '#cf1322', fontWeight: 600 }}>{aiResult.errorType}</span>
            </div>

            {aiResult.structureAnalysis && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>📊 第一步：拆结构</h4>
                <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #e8e8e8' }}>
                  {(aiResult.structureAnalysis || '').split('\n').filter(Boolean).map((line: string, i: number) => (
                    <div key={i} style={{ marginBottom: 8 }}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {(aiResult.errorCauseType || aiResult.errorCauseDetail) && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>🎯 第二步：分析错因</h4>
                <div style={{ padding: '12px 16px', background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7', marginBottom: 12 }}>
                  <strong style={{ color: '#cf1322' }}>错因类型：</strong>
                  <span style={{ marginLeft: 8, color: '#cf1322', fontWeight: 600 }}>{aiResult.errorCauseType}</span>
                </div>
                {aiResult.errorCauseDetail && (
                  <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #e8e8e8' }}>
                    <strong>具体原因：</strong>
                    <div style={{ marginTop: 8 }}>
                      {(aiResult.errorCauseDetail || '').split('\n').filter(Boolean).map((line: string, i: number) => (
                        <div key={i} style={{ marginBottom: 4 }}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {aiResult.optionAnalysis && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>📝 第三步：对比选项</h4>
                <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #e8e8e8' }}>
                  {(aiResult.optionAnalysis || '').split('\n').filter(Boolean).map((line: string, i: number) => (
                    <div key={i} style={{ marginBottom: 8 }}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {aiResult.correctSolution && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#52c41a', margin: '0 0 12px 0' }}>✅ 正确答案</h4>
                <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #b7eb8f', color: '#389e0d' }}>
                  {aiResult.correctSolution}
                </div>
              </div>
            )}

            {aiResult.knowledgePoints && aiResult.knowledgePoints.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#722ed1', margin: '0 0 12px 0' }}>🎓 核心知识点</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {aiResult.knowledgePoints.map((kp: string, i: number) => {
                    const [name, extension] = kp.split(/→|->/)
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '12px 16px',
                          background: 'white',
                          borderRadius: 6,
                          border: '1px solid #d9d9d9',
                          borderLeft: '4px solid #722ed1'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#722ed1', marginBottom: 4 }}>
                          {String.fromCharCode(9312 + i)} {name?.trim()}
                        </div>
                        {extension && (
                          <div style={{ color: '#666', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                            💡 {extension.trim()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {aiResult.avoidPitfallMantra && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#722ed1', margin: '0 0 12px 0' }}>💡 第四步：避坑口诀</h4>
                <div style={{ padding: 16, background: '#f9f0ff', borderRadius: 6, lineHeight: 2, border: '1px solid #d3adf7', color: '#531dab' }}>
                  {aiResult.avoidPitfallMantra}
                </div>
              </div>
            )}

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
                onClick={handleCancel}
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

      {step === 'confirm' && aiResult && !parsedQuestion && (
        <>
          <div style={{ marginBottom: 24, padding: 20, background: '#f0f9ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
            <h3 style={{ marginTop: 0, color: '#096dd9', borderBottom: '2px solid #91d5ff', paddingBottom: 12 }}>🤖 AI 分析结果</h3>

            <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
              <strong style={{ color: '#cf1322' }}> 错误类型：</strong>
              <span style={{ marginLeft: 8, color: '#cf1322', fontWeight: 600 }}>{aiResult.errorType}</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>📋 错误分析：</h4>
              <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #e8e8e8' }}>
                {(aiResult.errorAnalysis || '').split('\n').filter(Boolean).map((line: string, i: number) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: line.replace(/^(\d+[.、])/, '<strong>$1</strong>').replace(/^([①②③④⑤])/, '<strong>$1</strong>')
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: '#52c41a', margin: '0 0 12px 0' }}>✅ 正确答案：</h4>
              <div style={{ padding: 16, background: 'white', borderRadius: 6, lineHeight: 2, border: '1px solid #b7eb8f', color: '#389e0d' }}>
                {(aiResult.correctSolution || '').split('\n').filter(Boolean).map((line: string, i: number) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: line.replace(/^(\d+[.、])/, '<strong style="color:#1890ff">$1</strong>').replace(/→/, '<span style="color:#faad14">→</span>')
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: '#722ed1', margin: '0 0 12px 0' }}> 核心知识点：</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiResult.knowledgePoints.map((kp: string, i: number) => {
                  const [name, extension] = kp.split(/→|->/)
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '12px 16px',
                        background: 'white',
                        borderRadius: 6,
                        border: '1px solid #d9d9d9',
                        borderLeft: '4px solid #722ed1'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#722ed1', marginBottom: 4 }}>
                        {String.fromCharCode(9312 + i)} {name?.trim()}
                      </div>
                      {extension && (
                        <div style={{ color: '#666', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                          💡 {extension.trim()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {aiResult.solvingTips && (
              <div style={{ marginBottom: 0 }}>
                <h4 style={{ color: '#fa8c16', margin: '0 0 12px 0' }}>💡 解题技巧：</h4>
                <div style={{ padding: 16, background: '#fff7e6', borderRadius: 6, lineHeight: 1.8, border: '1px solid #ffd591', color: '#d46b08' }}>
                  {aiResult.solvingTips}
                </div>
              </div>
            )}
          </div>

          {!showCorrection && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
                <h4 style={{ color: '#096dd9', margin: '0 0 12px 0' }}>🤔 AI 给的答案对吗？</h4>
                <p style={{ color: '#666', margin: '0 0 16px 0', fontSize: 14 }}>
                  如果你觉得 AI 给出的答案不对，可以输入官方正确答案，AI 将重新分析。
                </p>
                <button
                  onClick={() => setShowCorrection(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                   我要纠错
                </button>
              </div>
            </div>
          )}

          {showCorrection && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#fa8c16' }}>
                📝 输入官方正确答案
              </label>
              <input
                type="text"
                value={correctionAnswer}
                onChange={(e) => setCorrectionAnswer(e.target.value)}
                placeholder="如：C"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  onClick={async () => {
                    if (!correctionAnswer.trim()) { alert('请输入正确答案'); return }
                    setStep('analyzing')
                    setLoading(true)
                    try {
                      const result = await api.reanalyzeWithCorrectAnswer(
                        questionContent || rawContent,
                        userAnswer,
                        correctionAnswer.trim(),
                        questionType
                      )
                      setAiResult(result)
                      setShowCorrection(true)
                      setStep('confirm')
                    } catch (e) {
                      alert((e as Error).message)
                      setStep('confirm')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !correctionAnswer.trim()}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: loading || !correctionAnswer.trim() ? '#d9d9d9' : '#fa8c16',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: loading || !correctionAnswer.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '重新分析中...' : '🔄 提交正确答案，重新分析'}
                </button>
                <button
                  onClick={() => { setShowCorrection(false); setCorrectionAnswer('') }}
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    color: '#666',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleLegacyConfirm}
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
                {loading ? '保存中...' : '✓ 分析正确，保存'}
              </button>
              <button
                onClick={handleCancel}
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
                ✗ 重新编辑
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default QuestionForm
