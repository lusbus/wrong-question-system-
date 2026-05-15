import React from 'react'
import {
  EditOutlined,
  BookOutlined,
  ApartmentOutlined,
  TrophyOutlined,
  SettingOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import InputPage from './pages/InputPage'
import NotesPage from './pages/NotesPage'
import KnowledgePage from './pages/KnowledgePage'
import TrainingPage from './pages/TrainingPage'
import SettingsPage from './pages/SettingsPage'
import StatisticsPage from './pages/StatisticsPage'
import LogViewer from './components/LogViewer'

const App: React.FC = () => {
  const [current, setCurrent] = React.useState('input')

  const renderPage = () => {
    switch (current) {
      case 'input': return <InputPage />
      case 'notes': return <NotesPage />
      case 'knowledge': return <KnowledgePage />
      case 'training': return <TrainingPage />
      case 'statistics': return <StatisticsPage />
      case 'settings': return <SettingsPage />
      default: return <InputPage />
    }
  }

  const menuItems = [
    { key: 'input', icon: <EditOutlined />, label: '错题录入' },
    { key: 'notes', icon: <BookOutlined />, label: '错题笔记' },
    { key: 'knowledge', icon: <ApartmentOutlined />, label: '知识图谱' },
    { key: 'statistics', icon: <BarChartOutlined />, label: '学习统计' },
    { key: 'training', icon: <TrophyOutlined />, label: '训练中心' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' }
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', background: '#001529', height: 64 }}>
        <h1 style={{ color: 'white', margin: 0, marginRight: 40, fontSize: 18 }}>公考错题助手</h1>
        <nav style={{ display: 'flex', gap: 4 }}>
          {menuItems.map(item => (
            <button
              key={item.key}
              onClick={() => setCurrent(item.key)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: current === item.key ? '#1890ff' : 'transparent',
                color: current === item.key ? 'white' : 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main style={{ flex: 1, padding: 24, background: '#f0f2f5', overflow: 'auto' }}>
        {renderPage()}
      </main>
      <LogViewer />
    </div>
  )
}

export default App
