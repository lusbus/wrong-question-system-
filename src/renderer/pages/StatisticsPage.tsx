import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import { createRendererLogger } from '../utils/logger'

const log = createRendererLogger('StatisticsPage')

interface ReviewStats {
  totalQuestions: number
  masteredCount: number
  byErrorCause: Record<string, number>
  byQuestionType: Record<string, number>
  topWeakPoints: string[]
  mantrasCollected: number
}

const StatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [advice, setAdvice] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, adviceData] = await Promise.all([
        api.getReviewStats(),
        api.generateStudyAdvice()
      ])
      setStats(statsData)
      setAdvice(adviceData)
    } catch (e) {
      log.error('Failed to load statistics', e as Error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h3>加载统计数据中...</h3>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p>暂无统计数据</p>
      </div>
    )
  }

  const masteryRate = stats.totalQuestions > 0
    ? Math.round((stats.masteredCount / stats.totalQuestions) * 100)
    : 0

  const renderBarChart = (data: Record<string, number>, color: string, totalOverride?: number) => {
    const total = totalOverride || stats.totalQuestions
    return Object.entries(data).map(([key, count]) => {
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      return (
        <div key={key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>{key}</span>
            <span style={{ color: '#666' }}>{count}题 ({percentage}%)</span>
          </div>
          <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: color,
              borderRadius: 4,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )
    })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>📊 学习统计分析</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 8, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#1890ff' }}>{stats.totalQuestions}</div>
          <div style={{ color: '#666', marginTop: 8 }}>总错题数</div>
        </div>
        <div style={{ background: 'white', borderRadius: 8, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#52c41a' }}>{masteryRate}%</div>
          <div style={{ color: '#666', marginTop: 8 }}>掌握率</div>
        </div>
        <div style={{ background: 'white', borderRadius: 8, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 'bold', color: '#722ed1' }}>{stats.mantrasCollected}</div>
          <div style={{ color: '#666', marginTop: 8 }}>避坑口诀</div>
        </div>
      </div>

      {Object.keys(stats.byErrorCause).length > 0 && (
        <div style={{ background: 'white', borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, color: '#1890ff' }}>🎯 错因类型分布</h3>
          {renderBarChart(stats.byErrorCause, '#ff4d4f')}
        </div>
      )}

      {Object.keys(stats.byQuestionType).length > 0 && (
        <div style={{ background: 'white', borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, color: '#1890ff' }}>📚 题型错误分布</h3>
          {renderBarChart(stats.byQuestionType, '#1890ff')}
        </div>
      )}

      {stats.topWeakPoints.length > 0 && (
        <div style={{ background: 'white', borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, color: '#fa8c16' }}>⚠️ 薄弱知识点</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stats.topWeakPoints.map((point, i) => (
              <span key={i} style={{
                padding: '8px 16px',
                background: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 20,
                color: '#d46b08',
                fontSize: 14
              }}>
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {advice && (
        <div style={{ background: 'white', borderRadius: 8, padding: 24 }}>
          <h3 style={{ marginTop: 0, color: '#52c41a' }}>💡 AI 学习建议</h3>
          <div style={{ lineHeight: 2, color: '#333' }}>
            {advice.split('\n').filter(Boolean).map((line, i) => (
              <div key={i} style={{ marginBottom: 8 }}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatisticsPage
