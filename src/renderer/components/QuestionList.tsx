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
