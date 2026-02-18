/**
 * VditorBridge Tool - 编辑器桥接工具
 * 连接 Agent 与 Vditor 编辑器，实现内容操作
 */

export interface Position {
  line: number
  ch: number
}

export interface Range {
  start: Position
  end: Position
}

export interface Suggestion {
  id: string
  type: 'completion' | 'link' | 'grammar' | 'style'
  content: string
  position: Position
  confidence: number
}

export class VditorBridge {
  private vditor: any = null
  private listeners: Map<string, Function[]> = new Map()

  constructor(vditorInstance?: any) {
    if (vditorInstance) {
      this.attach(vditorInstance)
    }
  }

  // ============================================
  // 连接管理
  // ============================================

  /**
   * 附加到 Vditor 实例
   */
  attach(vditorInstance: any): void {
    this.vditor = vditorInstance
    this.setupEventListeners()
  }

  /**
   * 分离编辑器
   */
  detach(): void {
    this.vditor = null
    this.listeners.clear()
  }

  /**
   * 检查是否已连接
   */
  isAttached(): boolean {
    return this.vditor !== null
  }

  // ============================================
  // 内容操作
  // ============================================

  /**
   * 获取完整内容
   */
  getContent(): string {
    if (!this.vditor) throw new Error('Vditor not attached')
    return this.vditor.getValue()
  }

  /**
   * 设置完整内容
   */
  setContent(content: string): void {
    if (!this.vditor) throw new Error('Vditor not attached')
    this.vditor.setValue(content)
  }

  /**
   * 在光标位置插入文本
   */
  insertAtCursor(text: string): void {
    if (!this.vditor) throw new Error('Vditor not attached')
    this.vditor.insertValue(text)
  }

  /**
   * 在指定位置插入文本
   */
  insertText(text: string, position?: Position): void {
    if (!this.vditor) throw new Error('Vditor not attached')

    if (position) {
      // 获取当前内容
      const content = this.getContent()
      const lines = content.split('\n')
      
      // 确保行存在
      while (lines.length <= position.line) {
        lines.push('')
      }
      
      // 在指定位置插入
      const line = lines[position.line]
      lines[position.line] = line.slice(0, position.ch) + text + line.slice(position.ch)
      
      this.setContent(lines.join('\n'))
    } else {
      this.insertAtCursor(text)
    }
  }

  /**
   * 替换选中的文本
   */
  replaceSelection(text: string): void {
    if (!this.vditor) throw new Error('Vditor not attached')
    
    const selection = this.getSelection()
    if (selection.text) {
      const content = this.getContent()
      const newContent = content.substring(0, selection.start) + text + content.substring(selection.end)
      this.setContent(newContent)
    } else {
      this.insertAtCursor(text)
    }
  }

  /**
   * 获取选中的文本
   */
  getSelection(): { text: string; start: number; end: number } {
    if (!this.vditor) throw new Error('Vditor not attached')
    
    // Vditor 的选区 API
    const editor = this.vditor.vditor.ir?.element
    if (!editor) return { text: '', start: 0, end: 0 }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return { text: '', start: 0, end: 0 }
    }

    const range = selection.getRangeAt(0)
    const text = range.toString()
    
    // 计算在整体内容中的位置
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editor)
    preCaretRange.setEnd(range.startContainer, range.startOffset)
    const start = preCaretRange.toString().length
    
    return {
      text,
      start,
      end: start + text.length
    }
  }

  /**
   * 获取光标位置
   */
  getCursorPosition(): Position {
    const content = this.getContent()
    const selection = this.getSelection()
    
    // 计算行号和列号
    const textBefore = content.substring(0, selection.start)
    const lines = textBefore.split('\n')
    
    return {
      line: lines.length - 1,
      ch: lines[lines.length - 1].length
    }
  }

  /**
   * 设置光标位置
   */
  setCursorPosition(position: Position): void {
    // Vditor 的选区操作较为复杂，需要操作 DOM
    // 这里提供一个简化版本
    console.warn('[VditorBridge] setCursorPosition not fully implemented')
  }

  // ============================================
  // 内容分析
  // ============================================

  /**
   * 获取当前行的内容
   */
  getCurrentLine(): { line: number; content: string } {
    const pos = this.getCursorPosition()
    const content = this.getContent()
    const lines = content.split('\n')
    
    return {
      line: pos.line,
      content: lines[pos.line] || ''
    }
  }

  /**
   * 获取当前段落的内容
   */
  getCurrentParagraph(): string {
    const content = this.getContent()
    const pos = this.getCursorPosition()
    const lines = content.split('\n')
    
    // 找到段落边界（空行分隔）
    let start = pos.line
    while (start > 0 && lines[start - 1].trim() !== '') {
      start--
    }
    
    let end = pos.line
    while (end < lines.length - 1 && lines[end + 1].trim() !== '') {
      end++
    }
    
    return lines.slice(start, end + 1).join('\n')
  }

  /**
   * 提取 WikiLinks
   */
  extractWikiLinks(): Array<{ text: string; line: number; ch: number }> {
    const content = this.getContent()
    const links: Array<{ text: string; line: number; ch: number }> = []
    const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
    
    const lines = content.split('\n')
    
    for (let line = 0; line < lines.length; line++) {
      let match
      while ((match = regex.exec(lines[line])) !== null) {
        links.push({
          text: match[1].split('|')[0].trim(),
          line,
          ch: match.index
        })
      }
    }
    
    return links
  }

  /**
   * 检查是否已有某篇文章
   */
  hasArticle(linkText: string): boolean {
    const links = this.extractWikiLinks()
    return links.some(l => l.text.toLowerCase() === linkText.toLowerCase())
  }

  // ============================================
  // 建议与提示
  // ============================================

  /**
   * 显示内联建议
   */
  showInlineSuggestion(suggestion: Suggestion): void {
    if (!this.vditor) return
    
    // 创建建议元素
    const hintEl = document.createElement('span')
    hintEl.className = `vditor-agent-suggestion vditor-agent-suggestion-${suggestion.type}`
    hintEl.textContent = suggestion.content
    hintEl.dataset.suggestionId = suggestion.id
    
    // 定位到编辑器中
    // 注意：这需要知道编辑器内部的 DOM 结构
    const editor = this.vditor.vditor.ir?.element
    if (editor) {
      // 简化的定位逻辑
      console.log('[VditorBridge] Showing suggestion:', suggestion)
    }
  }

  /**
   * 清除所有建议
   */
  clearSuggestions(): void {
    document.querySelectorAll('.vditor-agent-suggestion').forEach(el => el.remove())
  }

  /**
   * 高亮文本
   */
  highlightText(range: Range, className: string = 'vditor-agent-highlight'): void {
    // 需要操作 DOM，这里提供简化版本
    console.log('[VditorBridge] Highlight:', range, className)
  }

  /**
   * 清除高亮
   */
  clearHighlights(): void {
    document.querySelectorAll('.vditor-agent-highlight').forEach(el => {
      el.classList.remove('vditor-agent-highlight')
    })
  }

  // ============================================
  // 事件监听
  // ============================================

  /**
   * 监听内容变化
   */
  onChange(callback: (content: string) => void): () => void {
    return this.addListener('change', callback)
  }

  /**
   * 监听保存
   */
  onSave(callback: () => void): () => void {
    return this.addListener('save', callback)
  }

  /**
   * 监听选区变化
   */
  onSelectionChange(callback: () => void): () => void {
    return this.addListener('selectionchange', callback)
  }

  /**
   * 监听光标移动
   */
  onCursorMove(callback: (position: Position) => void): () => void {
    return this.addListener('cursormove', callback)
  }

  private addListener(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
    
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) callbacks.splice(index, 1)
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.vditor) return

    // 监听 Vditor 的 change 事件
    const originalInput = this.vditor.vditor.ir?.element?.addEventListener
    if (originalInput) {
      this.vditor.vditor.ir.element.addEventListener('input', () => {
        this.emit('change', this.getContent())
      })
    }

    // 监听键盘事件
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        this.emit('save')
      }
    })

    // 监听选区变化
    document.addEventListener('selectionchange', () => {
      this.emit('selectionchange')
    })
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(...args)
        } catch (e) {
          console.error('[VditorBridge] Event handler error:', e)
        }
      })
    }
  }

  // ============================================
  // 便捷方法
  // ============================================

  /**
   * 插入 WikiLink
   */
  insertWikiLink(target: string, displayText?: string): void {
    const link = displayText 
      ? `[[${target}|${displayText}]]`
      : `[[${target}]]`
    this.insertAtCursor(link)
  }

  /**
   * 插入代码块
   */
  insertCodeBlock(code: string, language?: string): void {
    const wrapped = language 
      ? `\`\`\`${language}\n${code}\n\`\`\``
      : `\`\`\`\n${code}\n\`\`\``
    this.insertAtCursor('\n' + wrapped + '\n')
  }

  /**
   * 在当前位置插入 Front Matter
   */
  insertFrontMatter(frontMatter: Record<string, any>): void {
    const yaml = Object.entries(frontMatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`
        }
        return `${key}: ${value}`
      })
      .join('\n')
    
    const content = this.getContent()
    
    // 检查是否已有 front matter
    if (content.startsWith('---')) {
      // 替换现有 front matter
      const match = content.match(/^---\n([\s\S]*?)\n---/)
      if (match) {
        this.setContent(content.replace(match[0], `---\n${yaml}\n---`))
        return
      }
    }
    
    // 在开头插入
    this.setContent(`---\n${yaml}\n---\n\n${content}`)
  }
}

// 导出单例
let vditorBridgeInstance: VditorBridge | null = null

export function getVditorBridge(): VditorBridge {
  if (!vditorBridgeInstance) {
    vditorBridgeInstance = new VditorBridge()
  }
  return vditorBridgeInstance
}

export function createVditorBridge(vditorInstance: any): VditorBridge {
  return new VditorBridge(vditorInstance)
}
