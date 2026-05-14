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
