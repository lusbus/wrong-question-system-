import React, { useState } from 'react'
import { Form, Select, Input, Button, message } from 'antd'
import { WrongQuestion, ErrorType } from '../../shared/types'
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
