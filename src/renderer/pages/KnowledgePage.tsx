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
