# 📋 日志系统说明文档

## 概述

本应用已集成完整的日志系统，覆盖主进程、渲染进程、IPC通信、AI服务、数据库操作等所有关键模块。

## 日志级别

| 级别 | 符号 | 说明 | 使用场景 |
|------|------|------|----------|
| DEBUG | 🔍 | 详细调试信息 | 函数调用、参数、返回值 |
| INFO | ℹ️ | 一般信息 | 操作完成、状态变更 |
| WARN | ⚠️ | 警告信息 | 非致命异常、性能问题 |
| ERROR | ❌ | 错误信息 | 操作失败、异常 |
| CRITICAL | 🔥 | 严重错误 | 系统崩溃、初始化失败 |

## 日志存储位置

### 主进程日志文件
```
%APPDATA%/gwy-wrong-question-system/logs/gwy-YYYY-MM-DD.log
```

例如 Windows:
```
C:\Users\你的用户名\AppData\Roaming\gwy-wrong-question-system\logs\gwy-2026-05-14.log
```

### 日志特性
- **按日期分割**：每天生成一个新的日志文件
- **自动清理**：保留最近 5 个日志文件
- **大小限制**：单个文件最大 10MB，超过后自动备份

## 日志查看方式

### 1. 应用内日志查看器
- 右下角点击"🔍 查看日志"按钮
- 支持按级别过滤（全部/INFO/WARN/ERROR/DEBUG）
- 实时显示渲染进程的所有日志输出
- 可以清空日志

### 2. DevTools 控制台
- 自动打开 DevTools 查看控制台日志
- 包含主进程、渲染进程、IPC 的完整日志
- 支持颜色区分不同级别的日志

### 3. 日志文件
- 使用任意文本编辑器打开日志文件
- 适合长时间运行的问题排查
- 包含完整的时间戳和详细信息

## 日志格式

### 控制台日志格式
```
🔍 12:34:56.789 DEBUG    [MainProcess]        Creating main window...
ℹ️ 12:34:56.790 INFO     [AIService]          analyzeError started { "questionType": "数量关系" }
⚠️ 12:34:56.791 WARN     [IPC]                [question:create] slow response { "duration": "1500ms" }
❌ 12:34:56.792 ERROR    [Database]           Failed to execute query { "error": "..." }
```

### 日志文件内容示例
```
🔍 12:34:56.789 DEBUG    [MainProcess]        Creating main window...
  Data: {
    "width": 1400,
    "height": 900,
    "show": false,
    "nodeIntegration": false,
    "contextIsolation": true
  }

ℹ️ 12:34:56.800 INFO     [MainProcess]        Environment info
  Data: {
    "VITE_DEV_SERVER_URL": "http://localhost:5173",
    "__dirname": "D:\\workspace\\program\\GWY\\dist\\main",
    "nodeEnv": "development"
  }
```

## 模块日志覆盖

### 主进程 (MainProcess)
- ✅ 应用启动和初始化
- ✅ 窗口创建和加载
- ✅ 页面加载事件（成功/失败）
- ✅ 崩溃和未响应事件

### IPC 通信 (IPC)
- ✅ 每个 IPC 调用的请求和响应
- ✅ 执行时间和参数
- ✅ 错误信息和堆栈跟踪

### AI 服务 (AIService)
- ✅ API 请求 URL、模型、参数
- ✅ 响应状态码和耗时
- ✅ 解析结果和错误处理

### 数据库 (Database)
- ✅ 连接和初始化
- ✅ 文件加载和保存
- ✅ 操作耗时

### 题库 (QuestionRepository)
- ✅ CRUD 操作
- ✅ 查询结果统计
- ✅ 状态变更

### Markdown 服务 (MarkdownService)
- ✅ 目录初始化
- ✅ 文件生成和更新
- ✅ 写入性能

### 渲染进程 (Renderer)
- ✅ React 应用启动
- ✅ 组件加载
- ✅ 用户操作

### Preload 脚本 (Preload)
- ✅ 脚本加载
- ✅ API 暴露
- ✅ IPC 调用

## 常见问题排查

### 问题 1：应用启动后白屏
**查看日志关键词**：
- `[MainProcess] Failed to load page!` - 页面加载失败
- `[Renderer] Root element not found` - HTML 结构问题
- `[Vite]` - 开发服务器问题

### 问题 2：AI 分析失败
**查看日志关键词**：
- `[AIService] AI request failed` - API 请求失败
- `[AIService] Failed to parse AI response` - 响应格式问题
- `[AIService] No active AI config found` - 配置问题

### 问题 3：数据丢失
**查看日志关键词**：
- `[Database] Error closing database` - 数据库保存失败
- `[QuestionRepository] Failed` - 操作失败

### 问题 4：Markdown 文件未生成
**查看日志关键词**：
- `[MarkdownService] Failed` - 文件写入失败
- `[MarkdownService] Directories initialized` - 检查路径

## 日志性能优化

### 开发环境
- 显示所有级别的日志（DEBUG 及以上）
- 控制台详细输出
- 文件完整记录

### 生产环境（未来优化）
- 可配置日志级别
- 仅显示 INFO 及以上级别
- 可选择性禁用文件日志

## 工具函数

### 日志类提供的方法

```typescript
// 基础日志
logger.debug(message, data?)
logger.info(message, data?)
logger.warn(message, data?)
logger.error(message, error?, data?)
logger.critical(message, error?, data?)

// 辅助方法
logger.logFunctionCall(fnName, args?)
logger.logFunctionResult(fnName, result?, duration?)
logger.logError(message, error, context?)
logger.logPerformance(operation, duration, extra?)
```

## 维护建议

1. **定期清理**：日志文件会自动保留 5 个，但建议定期手动清理
2. **问题报告**：提交 bug 时附上对应日期的日志文件
3. **性能监控**：关注日志中的 `duration` 字段，识别性能瓶颈
4. **错误追踪**：搜索 `ERROR` 和 `CRITICAL` 级别日志

## 未来优化方向

- [ ] 日志级别动态配置（设置页面）
- [ ] 日志搜索和过滤功能
- [ ] 日志导出功能
- [ ] 性能分析报告
- [ ] 异常自动上报
