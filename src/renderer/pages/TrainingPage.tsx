import React, { useState } from 'react'
import { Card, Button, message, Select, Space } from 'antd'
import { useQuestionStore } from '../stores/questionStore'
import { api } from '../services/api'
import { SimilarQuestion } from '../../shared/types'

const TrainingPage: React.FC = () => {
  const { questions } = useQuestionStore()
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
