import React, { useState, useEffect, useRef } from 'react'

interface LogMessage {
  id: number
  timestamp: string
  level: string
  source: string
  message: string
}

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }

    const addLog = (level: string, args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
      ).join(' ')

      const logMessage: LogMessage = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString().split('T')[1].replace('Z', '').substring(0, 12),
        level,
        source: 'Renderer',
        message: message.substring(0, 200)
      }

      setLogs(prev => [...prev.slice(-100), logMessage])
    }

    console.log = (...args) => {
      originalConsole.log(...args)
      addLog('INFO', args)
    }

    console.info = (...args) => {
      originalConsole.info(...args)
      addLog('INFO', args)
    }

    console.warn = (...args) => {
      originalConsole.warn(...args)
      addLog('WARN', args)
    }

    console.error = (...args) => {
      originalConsole.error(...args)
      addLog('ERROR', args)
    }

    console.debug = (...args) => {
      originalConsole.debug(...args)
      addLog('DEBUG', args)
    }

    return () => {
      console.log = originalConsole.log
      console.info = originalConsole.info
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.debug = originalConsole.debug
    }
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return '#ff4d4f'
      case 'WARN': return '#faad14'
      case 'DEBUG': return '#1890ff'
      default: return '#666'
    }
  }

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter)

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          zIndex: 9999,
          padding: '8px 16px',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        🔍 查看日志
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      right: 0,
      width: 500,
      maxHeight: 400,
      background: '#1e1e1e',
      color: '#d4d4d4',
      fontFamily: 'Consolas, Monaco, monospace',
      fontSize: 11,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #333',
      borderRadius: '4px 0 0 0'
    }}>
      <div style={{
        padding: 8,
        background: '#252526',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>📋 日志查看器 ({filteredLogs.length})</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              background: '#333',
              color: '#d4d4d4',
              border: '1px solid #555',
              padding: '2px 4px',
              fontSize: 11,
              borderRadius: 3
            }}
          >
            <option value="all">全部</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>
          <button
            onClick={() => setLogs([])}
            style={{
              background: '#444',
              color: '#fff',
              border: '1px solid #666',
              padding: '2px 8px',
              fontSize: 11,
              cursor: 'pointer',
              borderRadius: 3
            }}
          >
            清空
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: '#ff4d4f',
              color: '#fff',
              border: 'none',
              padding: '2px 8px',
              fontSize: 11,
              cursor: 'pointer',
              borderRadius: 3
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 8
      }}>
        {filteredLogs.map(log => (
          <div
            key={log.id}
            style={{
              marginBottom: 4,
              padding: '2px 4px',
              borderLeft: `3px solid ${getLevelColor(log.level)}`,
              paddingLeft: 8
            }}
          >
            <span style={{ color: '#888' }}>{log.timestamp}</span>
            {' '}
            <span
              style={{
                color: getLevelColor(log.level),
                fontWeight: 'bold',
                minWidth: 50,
                display: 'inline-block'
              }}
            >
              {log.level}
            </span>
            {' '}
            <span style={{ color: '#569cd6' }}>[{log.source}]</span>
            {' '}
            <span>{log.message}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}

export default LogViewer
