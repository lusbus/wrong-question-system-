import React from 'react'
import { Layout, Menu } from 'antd'
import {
  EditOutlined,
  BookOutlined,
  ApertureOutlined,
  TrophyOutlined,
  SettingOutlined
} from '@ant-design/icons'
import InputPage from './pages/InputPage'
import NotesPage from './pages/NotesPage'
import KnowledgePage from './pages/KnowledgePage'
import TrainingPage from './pages/TrainingPage'
import SettingsPage from './pages/SettingsPage'

const { Header, Content } = Layout

const App: React.FC = () => {
  const [current, setCurrent] = React.useState('input')

  const renderPage = () => {
    switch (current) {
      case 'input': return <InputPage />
      case 'notes': return <NotesPage />
      case 'knowledge': return <KnowledgePage />
      case 'training': return <TrainingPage />
      case 'settings': return <SettingsPage />
      default: return <InputPage />
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <h1 style={{ color: 'white', margin: 0, marginRight: 40 }}>公考错题助手</h1>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[current]}
          onClick={({ key }) => setCurrent(key)}
          items={[
            { key: 'input', icon: <EditOutlined />, label: '错题录入' },
            { key: 'notes', icon: <BookOutlined />, label: '错题笔记' },
            { key: 'knowledge', icon: <ApertureOutlined />, label: '知识图谱' },
            { key: 'training', icon: <TrophyOutlined />, label: '训练中心' },
            { key: 'settings', icon: <SettingOutlined />, label: '设置' }
          ]}
        />
      </Header>
      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        {renderPage()}
      </Content>
    </Layout>
  )
}

export default App
