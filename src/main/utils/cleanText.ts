/**
 * 清理 AI 响应中的 Markdown 语法符号
 */
export function cleanMarkdown(text: string): string {
  if (!text) return ''
  
  return text
    // 移除 ** 加粗标记
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // 移除 * 斜体标记
    .replace(/\*(.*?)\*/g, '$1')
    // 移除 # 标题标记
    .replace(/^#+\s*/gm, '')
    // 移除 --- 分隔线
    .replace(/^---+$/gm, '')
    // 移除 ``` 代码块标记
    .replace(/```[\s\S]*?```/g, '')
    // 移除 > 引用标记
    .replace(/^>\s*/gm, '')
    // 移除 [link](url) 链接格式
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // 移除 HTML 标签（保留必要的换行）
    .replace(/<[^>]+>/g, '')
    // 清理多余空格
    .replace(/\s+/g, ' ')
    // 清理行首行尾空格
    .trim()
}
