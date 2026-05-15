import React, { useState } from 'react'
import QuestionForm from '../components/QuestionForm'
import { useQuestionStore } from '../stores/questionStore'

const InputPage: React.FC = () => {
  const { fetchQuestions, fetchStats } = useQuestionStore()
  const [editingContent, setEditingContent] = useState('')

  const handleSuccess = () => {
    fetchQuestions()
    fetchStats()
    setEditingContent('')
  }

  const panelStyle: React.CSSProperties = {
    flex: 1,
    background: 'white',
    borderRadius: 8,
    padding: 24,
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 160px)'
  }

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 112px)' }}>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>录入新错题</h2>
        <QuestionForm onSuccess={handleSuccess} onContentChange={(content) => setEditingContent(content)} />
      </div>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>原题目</h2>
        <div style={{ 
          padding: 16, 
          background: '#f5f5f5', 
          borderRadius: 6, 
          lineHeight: 2,
          minHeight: 200,
          whiteSpace: 'pre-wrap'
        }}>
          {editingContent || '请在左侧输入题目内容...'}
        </div>
      </div>
    </div>
  )
}

export default InputPage