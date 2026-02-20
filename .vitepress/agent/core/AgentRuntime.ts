/**
 * MetaUniverse Agent Runtime
 * 核心运行时 - 智能编排层的引擎
 */
import type {
  EditorMode,
  IntentType,
  ParsedIntent,
  Skill,
  SkillContext,
  SkillResult,
  AgentState,
  TaskState,
  MemoryManager,
  Logger,
  CostTracker,
  SessionMemory,
  ChatMessage
} from './types'
import { IntentRouter } from './IntentRouter'
import { StateMachine } from './StateMachine'
import { getMemoryManager } from '../memory'
import { LoggerImpl } from '../runtime/Logger'
import { CostTrackerImpl } from '../runtime/CostTracker'
import { createLLMManager } from '../llm'
import { createLLMConfigFromEnv } from '../config/env'
import { eventBus, AgentEvents } from './EventBus'

export interface AgentRuntimeConfig {
  mode: EditorMode
  apiKey?: string
  model?: string
  maxTokens?: number
  enableCostTracking?: boolean
  enableLogging?: boolean
}

export class AgentRuntime {
  private static instance: AgentRuntime
  
  // 核心组件
  private intentRouter: IntentRouter
  private stateMachine: StateMachine
  private memory: MemoryManager
  private logger: Logger
  private costTracker: CostTracker
  
  // 状态
  private config: AgentRuntimeConfig
  private currentTask: TaskState | null = null
  private sessionId: string
  private skills: Map<string, Skill> = new Map()
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  
  // 编辑器相关
  private editorMode: EditorMode = 'MANUAL'
  private currentFile: string = ''
  
  private constructor(config: AgentRuntimeConfig) {
    this.config = {
      maxTokens: 8192,
      enableCostTracking: true,
      enableLogging: true,
      ...config
    }
    
    this.sessionId = this.generateSessionId()
    this.intentRouter = new IntentRouter()
    this.stateMachine = new StateMachine()
    this.memory = getMemoryManager()
    this.logger = new LoggerImpl()
    this.costTracker = new CostTrackerImpl()
    
    this.setupEventListeners()
  }
  
  static getInstance(config?: AgentRuntimeConfig): AgentRuntime {
    if (!AgentRuntime.instance) {
      AgentRuntime.instance = new AgentRuntime(config || { mode: 'MANUAL' })
    }
    return AgentRuntime.instance
  }
  
  // ============================================
  // 初始化与配置
  // ============================================
  
  async initialize(): Promise<void> {
    this.logger.info('Agent Runtime initializing...', { sessionId: this.sessionId })
    
    // 初始化 LLM Manager
    try {
      const llmConfig = createLLMConfigFromEnv()
      createLLMManager(llmConfig)
      this.logger.info('LLM Manager initialized', { 
        defaultProvider: llmConfig.defaultProvider,
        availableProviders: Object.keys(llmConfig.providers)
      })
    } catch (e) {
      this.logger.warn('LLM Manager initialization failed, some features may not work', { error: String(e) })
    }
    
    // 初始化记忆系统
    await this.memory.initialize?.()
    
    // 加载已保存的任务状态（断点续作）
    await this.loadCheckpoints()
    
    this.logger.info('Agent Runtime initialized', { mode: this.config.mode })
    this.emit('initialized', { sessionId: this.sessionId, mode: this.config.mode })
  }
  
  setMode(mode: EditorMode): void {
    const oldMode = this.editorMode
    this.editorMode = mode
    this.config.mode = mode
    
    this.logger.info(`Editor mode changed: ${oldMode} -> ${mode}`)
    this.emit('modeChanged', { oldMode, newMode: mode })
    
    // 模式切换时的特殊处理
    if (mode === 'AGENT') {
      this.enterAgentMode()
    } else if (mode === 'COLLAB') {
      this.enterCollabMode()
    } else {
      this.enterManualMode()
    }
  }
  
  getMode(): EditorMode {
    return this.editorMode
  }
  
  setCurrentFile(path: string): void {
    this.currentFile = path
    this.logger.debug('Current file set', { path })
  }
  
  // ============================================
  // 技能管理
  // ============================================
  
  registerSkill(skill: Skill): void {
    this.skills.set(skill.name, skill)
    this.intentRouter.registerSkill(skill)
    this.logger.debug('Skill registered', { skill: skill.name })
  }
  
  getSkill(name: string): Skill | undefined {
    return this.skills.get(name)
  }
  
  listSkills(): Skill[] {
    return Array.from(this.skills.values())
  }
  
  // ============================================
  // 主要交互接口
  // ============================================
  
  /**
   * 处理用户输入（从 ChatOrb 调用）
   */
  async processInput(input: string, context?: {
    currentFile?: string
    selectedText?: string
  }): Promise<ChatMessage> {
    const messageId = this.generateId()
    
    this.logger.info('Processing user input', { 
      input: input.substring(0, 100),
      context 
    })
    
    // 1. 意图解析
    this.setState('UNDERSTANDING')
    const intent = await this.intentRouter.parse(input, context)
    
    this.logger.info('Intent parsed', { 
      type: intent.type, 
      confidence: intent.confidence,
      entities: intent.entities 
    })
    
    // 2. 如果是低置信度，询问用户确认
    if (intent.confidence < 0.6) {
      return this.createAssistantMessage(
        messageId,
        `我不太确定您的意图。您是想要：\n${this.formatIntentOptions(intent)}\n\n请告诉我更具体的指令。`
      )
    }
    
    // 3. 执行任务
    return this.executeIntent(intent, input, messageId)
  }
  
  /**
   * 分析编辑器内容（从 COLLAB 模式调用）
   */
  async analyzeEditorContent(content: string, cursorPosition: number): Promise<any[]> {
    if (this.editorMode !== 'COLLAB') {
      return []
    }
    
    this.logger.debug('Analyzing editor content', { 
      length: content.length,
      cursorPosition 
    })
    
    // 构建上下文
    const context = await this.memory.buildContext(
      content.substring(Math.max(0, cursorPosition - 500), cursorPosition),
      this.currentFile
    )
    
    // 检测 WikiLinks 并给出建议
    const suggestions = await this.detectWikiLinkSuggestions(content, cursorPosition, context)
    
    // 检测可能的补全
    const completions = await this.detectCompletions(content, cursorPosition, context)
    
    return [...suggestions, ...completions]
  }
  
  /**
   * 获取行内建议（实时协作）
   */
  async getInlineSuggestions(content: string, line: number, ch: number): Promise<any[]> {
    if (this.editorMode === 'MANUAL') {
      return []
    }
    
    // 简化版本：返回基于上下文的建议
    const context = await this.memory.buildContext(content, this.currentFile)
    
    // TODO: 调用 LLM 生成建议
    return context.slice(0, 3).map((result, index) => ({
      id: `suggestion-${Date.now()}-${index}`,
      type: 'link',
      content: `相关: [[${result.metadata.title || result.source}]]`,
      position: { line, ch },
      confidence: result.score
    }))
  }
  
  // ============================================
  // 任务执行
  // ============================================
  
  private async executeIntent(
    intent: ParsedIntent, 
    rawInput: string,
    messageId: string
  ): Promise<ChatMessage> {
    // 创建任务
    const taskId = this.generateId()
    this.currentTask = {
      id: taskId,
      state: 'PLANNING',
      currentStep: 0,
      totalSteps: 1,
      context: { intent, rawInput },
      checkpoint: null,
      startedAt: Date.now(),
      updatedAt: Date.now()
    }
    
    this.setState('PLANNING')
    
    // 查找匹配的技能
    const skill = this.intentRouter.findSkill(intent)
    
    if (!skill) {
      this.setState('ERROR')
      return this.createAssistantMessage(
        messageId,
        `抱歉，我暂时无法处理这个请求（${intent.type}）。您可以尝试更具体的描述。`
      )
    }
    
    // 执行技能
    this.setState('EXECUTING')
    
    const skillContext: SkillContext = {
      taskId,
      memory: this.memory,
      logger: this.logger,
      costTracker: this.costTracker,
      currentFile: this.currentFile,
      sessionId: this.sessionId
    }
    
    try {
      const result = await skill.handler(skillContext, intent.parameters)
      
      this.currentTask.totalSteps = 1
      this.currentTask.currentStep = 1
      this.setState('COMPLETED')
      
      // 记录成本
      if (this.config.enableCostTracking) {
        this.costTracker.record({
          timestamp: Date.now(),
          model: this.config.model || 'default',
          tokens: result.tokensUsed,
          cost: result.cost,
          taskId,
          skill: skill.name
        })
      }
      
      // 保存任务历史
      await this.saveTaskHistory(taskId, skill.name, intent, result)
      
      this.emit('taskCompleted', { taskId, skill: skill.name, result })
      
      // 触发 UI 事件通知（如果技能产生了文件）
      if (result.data?.path) {
        eventBus.emit('agent:taskCompleted', {
          path: result.data.path,
          title: result.data.title || this.extractFilename(result.data.path),
          section: this.extractSection(result.data.path),
          timestamp: Date.now(),
          tokensUsed: result.tokensUsed,
          cost: result.cost
        })
      }
      
      return this.createAssistantMessage(
        messageId,
        this.formatResult(result, skill.name),
        { tokens: result.tokensUsed, cost: result.cost }
      )
      
    } catch (error) {
      this.setState('ERROR')
      this.logger.error('Skill execution failed', { 
        skill: skill.name, 
        error: error instanceof Error ? error.message : String(error) 
      })
      
      return this.createAssistantMessage(
        messageId,
        `执行过程中出现错误：${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  
  // ============================================
  // 状态管理
  // ============================================
  
  private setState(state: AgentState): void {
    if (this.currentTask) {
      this.currentTask.state = state
      this.currentTask.updatedAt = Date.now()
    }
    this.stateMachine.transition(state)
    this.emit('stateChanged', { state, task: this.currentTask })
  }
  
  getCurrentState(): AgentState {
    return this.currentTask?.state || 'IDLE'
  }
  
  getCurrentTask(): TaskState | null {
    return this.currentTask
  }
  
  // ============================================
  // 事件系统
  // ============================================
  
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }
  
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data)
      } catch (e) {
        this.logger.error('Event listener error', { event, error: e })
      }
    })
  }
  
  // ============================================
  // 模式切换处理
  // ============================================
  
  private enterAgentMode(): void {
    this.logger.info('Entering AGENT mode')
    // Agent 模式下，用户主要输入指令，Agent 自动执行
    this.emit('agentModeEntered', {})
  }
  
  private enterCollabMode(): void {
    this.logger.info('Entering COLLAB mode')
    // 协作模式下，开始监听编辑器输入
    this.emit('collabModeEntered', {})
  }
  
  private enterManualMode(): void {
    this.logger.info('Entering MANUAL mode')
    // 人工模式下，停止 AI 辅助
    this.emit('manualModeEntered', {})
  }
  
  // ============================================
  // 辅助方法
  // ============================================
  
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private createAssistantMessage(
    id: string, 
    content: string, 
    metadata?: { tokens?: number; cost?: number }
  ): ChatMessage {
    return {
      id,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      metadata
    }
  }
  
  private formatIntentOptions(intent: ParsedIntent): string {
    const options = this.intentRouter.getSimilarIntents(intent, 3)
    return options.map((opt, i) => `${i + 1}. ${opt.description} (${Math.round(opt.confidence * 100)}%)`).join('\n')
  }
  
  private formatResult(result: SkillResult, skillName: string): string {
    if (!result.success) {
      return `执行失败：${result.error || '未知错误'}`
    }
    
    let message = result.data?.message || '任务已完成'
    
    if (result.nextSteps && result.nextSteps.length > 0) {
      message += '\n\n建议的下一步：\n' + result.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
    }
    
    return message
  }
  
  /**
   * 从文件路径提取文件名（不含扩展名）
   */
  private extractFilename(filePath: string): string {
    const basename = filePath.split(/[/\\]/).pop() || ''
    return basename.replace(/\.md$/, '')
  }
  
  /**
   * 从文件路径提取所属栏目
   * 例如：docs/sections/posts/article.md → posts
   */
  private extractSection(filePath: string): string {
    // 尝试匹配 sections/xxx 模式
    const match = filePath.match(/sections[/\\]([^/\\]+)/)
    if (match) {
      return match[1]
    }
    // 尝试匹配 docs/xxx 模式
    const docsMatch = filePath.match(/docs[/\\]([^/\\]+)/)
    if (docsMatch) {
      return docsMatch[1]
    }
    return 'unknown'
  }
  
  private async detectWikiLinkSuggestions(
    content: string, 
    position: number,
    context: any[]
  ): Promise<any[]> {
    // 检测孤立的 WikiLinks
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
    const suggestions: any[] = []
    
    let match
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const linkText = match[1].split('|')[0]
      // 检查是否已有对应的文章
      const exists = await this.checkArticleExists(linkText)
      
      if (!exists) {
        suggestions.push({
          type: 'missing_link',
          link: linkText,
          message: `[[${linkText}]] 尚无对应文章，是否创建？`,
          actions: ['创建文章', '搜索相关资料']
        })
      }
    }
    
    return suggestions
  }
  
  private async detectCompletions(
    content: string,
    position: number,
    context: any[]
  ): Promise<any[]> {
    // 基于上下文检测可能的补全
    // TODO: 实现更复杂的逻辑
    return []
  }
  
  private async checkArticleExists(linkText: string): Promise<boolean> {
    // 转换为 URL 格式检查
    const normalizedPath = linkText.toLowerCase().replace(/\s+/g, '-')
    // TODO: 实际检查文件是否存在
    return false
  }
  
  private async loadCheckpoints(): Promise<void> {
    // 加载断点续作的状态
    // TODO: 从 memory/tasks/ 加载未完成的任务
  }
  
  private async saveTaskHistory(
    taskId: string,
    skillName: string,
    intent: ParsedIntent,
    result: SkillResult
  ): Promise<void> {
    const history = {
      id: taskId,
      type: intent.type,
      description: intent.raw,
      steps: [{
        index: 1,
        skill: skillName,
        input: intent.parameters,
        output: result.data,
        tokens: result.tokensUsed,
        cost: result.cost,
        startedAt: this.currentTask?.startedAt || Date.now(),
        completedAt: Date.now()
      }],
      result: (result.success ? 'success' : 'failure') as 'success' | 'failure' | 'cancelled',
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      startedAt: this.currentTask?.startedAt || Date.now(),
      completedAt: Date.now()
    }
    
    await this.memory.tasks.save(history)
  }
  
  private setupEventListeners(): void {
    // 监听状态变化，实现断点续作
    this.stateMachine.on('PAUSED', async (data) => {
      if (this.currentTask) {
        await this.saveCheckpoint(this.currentTask)
      }
    })
  }
  
  private async saveCheckpoint(task: TaskState): Promise<void> {
    // 保存任务检查点
    // TODO: 实现检查点保存逻辑
  }
  
  // ============================================
  // 公共 API
  // ============================================
  
  getMemory(): MemoryManager {
    return this.memory
  }
  
  getLogger(): Logger {
    return this.logger
  }
  
  getCostTracker(): CostTracker {
    return this.costTracker
  }
  
  getSessionId(): string {
    return this.sessionId
  }
}
