import React, { useEffect } from 'react'
import { Card, Button, message } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import QuestionList from '../components/QuestionList'
import { useQuestionStore } from '../stores/questionStore'
import { api } from '../services/api'

const NotesPage: React.FC = () => {
  const { fetchQuestions, fetchStats, stats } = useQuestionStore()

  useEffect(() => {
    fetchQuestions()
    fetchStats()
  }, [])

  const handleSync = async () => {
    try {
      await api.syncMarkdown()
      message.success('错题本已同步')
    } catch (e) {
      message.error('同步失败')
    }
  }

  return (
    <Card
      title={`错题笔记 (${stats?.total || 0} 道)`}
      extra={
        <Button icon={<SyncOutlined />} onClick={handleSync}>
          同步错题本
        </Button>
      }
    >
      {stats && (
        <div style={{ marginBottom: 16 }}>
          <span>已掌握: {stats.mastered} | </span>
          <span>待复习: {stats.pending} | </span>
          <span>薄弱知识点: {stats.weakPoints.slice(0, 3).join(', ')}</span>
        </div>
      )}
      <QuestionList />
    </Card>
  )
}

export default NotesPage
