import React, { useState, useEffect } from 'react'
import { useQuestionStore } from '../stores/questionStore'
import { createRendererLogger } from '../utils/logger'
import { api } from '../services/api'

const log = createRendererLogger('SettingsPage')

interface AIConfig {
  id?: number
  provider: string
  apiKey: string
  model: string
  baseUrl: string
  isActive: boolean
}

const SettingsPage: React.FC = () => {
  const { fetchQuestions, fetchStats } = useQuestionStore()
  const [config, setConfig] = useState<AIConfig>({
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    isActive: true
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    log.logComponentMount()
    loadConfig()
    return () => log.logComponentUnmount()
  }, [])

  const loadConfig = async () => {
    log.info('Loading saved config...')
    try {
      const savedConfig = await api.getConfig()
      if (savedConfig) {
        log.info('Config loaded from database', { provider: savedConfig.provider })
        setConfig({
          id: savedConfig.id,
          provider: savedConfig.provider,
          apiKey: savedConfig.apiKey,
          model: savedConfig.model,
          baseUrl: savedConfig.baseUrl,
          isActive: savedConfig.isActive
        })
      } else {
        log.info('No saved config found, using defaults')
      }
    } catch (error) {
      log.error('Failed to load config', error)
    }
  }

  const handleSave = async () => {
    log.logUserAction('save_config', { provider: config.provider, model: config.model })
    
    if (!config.apiKey.trim()) {
      setMessage({ type: 'error', text: 'API Key 不能为空' })
      log.warn('Save failed: API Key is empty')
      return
    }

    if (!config.baseUrl.trim()) {
      setMessage({ type: 'error', text: 'Base URL 不能为空' })
      log.warn('Save failed: Base URL is empty')
      return
    }

    try {
      setSaving(true)
      setMessage(null)
      
      const startTime = Date.now()
      await window.electronAPI.invoke('config:save', config)
      const duration = Date.now() - startTime
      
      log.logApiResponse('config:save', { success: true }, duration)
      setMessage({ type: 'success', text: '配置保存成功！' })
      
      fetchQuestions()
      fetchStats()
    } catch (error) {
      log.error('Failed to save config', error)
      setMessage({ type: 'error', text: '配置保存失败，请重试' })
    } finally {
      setSaving(false)
    }
  }

  const providers = [
    { value: 'deepseek', label: 'DeepSeek - 深度求索', defaultModel: 'deepseek-chat', defaultUrl: 'https://api.deepseek.com' },
    { value: 'aliyun', label: '阿里云 - 通义千问', defaultModel: 'qwen-plus', defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    { value: 'zhipu', label: '智谱 AI - 清言', defaultModel: 'glm-4-plus', defaultUrl: 'https://open.bigmodel.cn/api/paas/v4' },
    { value: 'baidu', label: '百度 - 文心一言', defaultModel: 'ernie-4.0-8k', defaultUrl: 'https://qianfan.baidubce.com/v2' },
    { value: 'moonshot', label: '月之暗面 - Kimi', defaultModel: 'moonshot-v1-8k', defaultUrl: 'https://api.moonshot.cn/v1' },
    { value: 'minimax', label: 'MiniMax - 海螺', defaultModel: 'abab6.5-chat', defaultUrl: 'https://api.minimax.chat/v1' },
    { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-3.5-turbo', defaultUrl: 'https://api.openai.com/v1' },
    { value: 'anthropic', label: 'Anthropic - Claude', defaultModel: 'claude-3-sonnet-20240229', defaultUrl: 'https://api.anthropic.com/v1' },
    { value: 'custom', label: '自定义', defaultModel: '', defaultUrl: '' }
  ]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>⚙️ AI 服务配置</h2>
        
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 4,
            marginBottom: 16,
            background: message.type === 'success' ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${message.type === 'success' ? '#b7eb8f' : '#ffccc7'}`,
            color: message.type === 'success' ? '#52c41a' : '#ff4d4f'
          }}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            AI 服务商
          </label>
          <select
            value={config.provider}
            onChange={(e) => {
              const provider = providers.find(p => p.value === e.target.value)
              if (provider) {
                setConfig({
                  ...config,
                  provider: e.target.value,
                  model: provider.defaultModel,
                  baseUrl: provider.defaultUrl
                })
              }
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              fontSize: 14
            }}
          >
            {providers.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            API Key <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="请输入 API Key"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              fontSize: 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            模型名称 <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            placeholder="例如: gpt-3.5-turbo"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              fontSize: 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Base URL <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
            placeholder="例如: https://api.openai.com/v1"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              fontSize: 14,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px',
            background: saving ? '#d9d9d9' : '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 14,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 8, padding: 24, marginTop: 24 }}>
        <h3>📖 配置说明</h3>
        <div style={{ lineHeight: 2, color: '#666' }}>
          <p><strong>DeepSeek - 深度求索：</strong>推荐模型 deepseek-v4-flash 或 deepseek-coder，推理和编程能力强，性价比高</p>
          <p><strong>阿里云 - 通义千问：</strong>推荐模型 qwen-plus 或 qwen-max，中文理解能力强</p>
          <p><strong>智谱 AI - 清言：</strong>推荐模型 glm-4-plus 或 glm-4-air，国产大模型代表</p>
          <p><strong>百度 - 文心一言：</strong>推荐模型 ernie-4.0-8k，适合中文场景</p>
          <p><strong>月之暗面 - Kimi：</strong>推荐模型 moonshot-v1-8k，长文本理解优秀</p>
          <p><strong>MiniMax - 海螺：</strong>推荐模型 abab6.5-chat，多模态能力强</p>
          <p><strong>OpenAI：</strong>使用 OpenAI 官方 API，推荐模型 gpt-3.5-turbo 或 gpt-4</p>
          <p><strong>Anthropic - Claude：</strong>使用 Claude API，推荐模型 claude-3-sonnet</p>
          <p><strong>自定义：</strong>兼容 OpenAI 格式的 API（如国内镜像、本地模型）</p>
          <p><strong>Base URL：</strong>API 的基础地址，需要包含 /v1 后缀</p>
          <p><strong>API Key：</strong>从服务商获取的 API 密钥，请妥善保管</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 8, padding: 24, marginTop: 24 }}>
        <h3>🔒 安全提示</h3>
        <div style={{ lineHeight: 2, color: '#666' }}>
          <p>• API Key 仅存储在本地数据库中</p>
          <p>• 不会上传到任何服务器</p>
          <p>• 建议定期更换 API Key</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 8, padding: 24, marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>📖 使用说明</h3>
        <div style={{ lineHeight: 2, color: '#555' }}>
          <h4>1️⃣ 录入新错题</h4>
          <p>• 点击左侧菜单"录入错题"，进入录入页面</p>
          <p>• 填写科目（行测/申论）、题型、题目内容、你的答案和来源</p>
          <p>• 点击"开始分析"，AI 将自动分析题目并生成解析</p>
          <p>• 查看左侧 AI 分析结果，包括错误分析、核心知识、解题思路等</p>
          <p>• 右侧面板显示原题目，方便对照查看</p>

          <h4>2️⃣ 错题管理</h4>
          <p>• 点击左侧菜单"错题列表"，查看已录入的所有错题</p>
          <p>• 支持按科目、题型、来源筛选错题</p>
          <p>• 点击具体题目可查看详细的 AI 分析结果</p>

          <h4>3️⃣ 数据分析</h4>
          <p>• 点击左侧菜单"数据分析"，查看学习统计数据</p>
          <p>• 统计信息包括：错题总数、各科目分布、各题型分布</p>
          <p>• 根据统计结果调整学习重点和策略</p>

          <h4>4️⃣ AI 服务配置</h4>
          <p>• 点击左侧菜单"设置"，配置 AI 服务商和 API Key</p>
          <p>• 支持 DeepSeek、阿里云、智谱 AI、百度等多家国内 AI 服务商</p>
          <p>• 选择服务商后会自动填充推荐模型和 Base URL</p>
          <p>• 填写 API Key 后点击"保存配置"即可使用</p>

          <h4>💡 使用技巧</h4>
          <p>• 题目内容尽量完整，包括题干和选项，有助于 AI 准确分析</p>
          <p>• 分析结果会高亮显示题目中的关键信息，鼠标悬停可查看原文</p>
          <p>• 建议配置多个 AI 服务商，以便在主服务不可用时切换</p>
          <p>• 定期查看数据分析，了解自己的薄弱知识点</p>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
