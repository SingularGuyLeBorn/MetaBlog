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
import { getStructuredLogger } from '../runtime/StructuredLogger'
import { CostTrackerImpl } from '../runtime/CostTracker'
import { createLLMManager } from '../llm'
import { createLLMConfigFromEnv } from '../config/env'
import { eventBus, AgentEvents } from './EventBus'
import { fileLockManager } from './FileLockManager'
import { FileStorage } from '../memory/FileStorage'

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
  private activeTasks: Map<string, TaskState> = new Map()
  private activeControllers: Map<string, AbortController> = new Map()  // P1-AG: 任务取消控制器
  private sessionId: string
  private skills: Map<string, Skill> = new Map()
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private initialized = false  // P1-INIT-X2: 幂等守卫标志
  
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
    // P1-R1 修复：统一使用 StructuredLogger
    this.logger = getStructuredLogger();
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
    // P1-INIT-X2: 幂等守卫，防止重复初始化
    if (this.initialized) {
      this.logger.debug('Agent Runtime already initialized, skipping')
      return
    }
    
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
    
    this.initialized = true  // P1-INIT-X2: 标记已初始化
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
    
    try {
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
    } catch (error) {
      this.logger.error('processInput failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      this.setState('ERROR')
      return this.createAssistantMessage(
        messageId,
        `处理请求时出现内部错误：${error instanceof Error ? error.message : '未知错误'}。请重试或换一种方式描述。`
      )
    }
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
    // 创建任务（支持并发，不覆盖前一个 task）
    const taskId = this.generateId()
    const task: TaskState = {
      id: taskId,
      state: 'PLANNING',
      currentStep: 0,
      totalSteps: 1,
      context: { intent, rawInput },
      checkpoint: null,
      startedAt: Date.now(),
      updatedAt: Date.now()
    }
    this.activeTasks.set(taskId, task)
    this.currentTask = task
    
    this.setState('PLANNING', task)
    
    // 查找匹配的技能
    const skill = this.intentRouter.findSkill(intent)
    
    if (!skill) {
      this.setState('ERROR', task)
      return this.createAssistantMessage(
        messageId,
        `抱歉，我暂时无法处理这个请求（${intent.type}）。您可以尝试更具体的描述。`
      )
    }
    
    // 执行技能
    this.setState('EXECUTING', task)
    
    // P1-AG: 创建 AbortController 支持任务取消
    const abortController = new AbortController()
    this.activeControllers.set(taskId, abortController)
    
    // P2-AG-2: 进度回调
    const updateProgress = (progress: { step: number; totalSteps: number; message: string; detail?: string }) => {
      task.currentStep = progress.step
      task.totalSteps = progress.totalSteps
      task.updatedAt = Date.now()
      
      this.emit('progress', {
        taskId,
        ...progress,
        percent: Math.round((progress.step / progress.totalSteps) * 100)
      })
      
      this.logger.debug('task.progress', progress.message, {
        taskId,
        step: progress.step,
        total: progress.totalSteps
      })
    }
    
    const skillContext: SkillContext = {
      taskId,
      memory: this.memory,
      logger: this.logger,
      costTracker: this.costTracker,
      currentFile: this.currentFile,
      sessionId: this.sessionId,
      fileLock: fileLockManager,
      signal: abortController.signal,
      onProgress: updateProgress  // P2-AG-2: 注入进度回调
    }
    
    try {
      // P1-AG: 检查是否已取消
      if (abortController.signal.aborted) {
        throw new Error('Task cancelled by user')
      }
      
      const result = await skill.handler(skillContext, intent.parameters)
      
      // 清理控制器
      this.activeControllers.delete(taskId)
      
      task.totalSteps = 1
      task.currentStep = 1
      this.setState('COMPLETED', task)
      
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
      this.activeTasks.delete(taskId)
      
      // 释放任务关联的所有文件锁
      fileLockManager.releaseTaskLocks(taskId)
      
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
      // P1-AG: 清理控制器
      this.activeControllers.delete(taskId)
      
      // 检查是否是取消错误
      const isCancelled = error instanceof Error && 
        (error.message === 'Task cancelled by user' || error.name === 'AbortError')
      
      if (isCancelled) {
        this.setState('CANCELLED', task)
        this.activeTasks.delete(taskId)
        fileLockManager.releaseTaskLocks(taskId)
        
        return this.createAssistantMessage(
          messageId,
          '任务已取消。'
        )
      }
      
      this.setState('ERROR', task)
      this.activeTasks.delete(taskId)
      
      // 出错时也要释放文件锁
      fileLockManager.releaseTaskLocks(taskId)
      
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
  
  private setState(state: AgentState, task?: TaskState): void {
    const target = task || this.currentTask
    if (target) {
      target.state = state
      target.updatedAt = Date.now()
    }
    this.stateMachine.transition(state)
    this.emit('stateChanged', { state, task: target })
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
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 4)}`
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
    
    // 展示降级提示（例如部分引用获取失败时）
    if (result.data?.fallback && result.data?.note) {
      message += `\n\n⚠️ ${result.data.note}`
    }
    
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
    // 将 WikiLink 文本转换为可能的路径
    const normalizedPath = linkText.toLowerCase().replace(/\s+/g, '-')
    const candidates = [
      `${normalizedPath}.md`,
      `sections/posts/${normalizedPath}.md`,
      `sections/knowledge/${normalizedPath}.md`,
      `${normalizedPath}/${normalizedPath}.md`,
      `sections/posts/${normalizedPath}/${normalizedPath}.md`
    ]
    
    for (const path of candidates) {
      try {
        const response = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`)
        if (response.ok) return true
      } catch {
        // 继续尝试下一个路径
      }
    }
    return false
  }
  
  // P1-CHK: checkpoint 文件存储
  private checkpointStorage = new FileStorage<{ tasks: TaskState[] }>({
    name: 'agent-checkpoints',
    defaultData: { tasks: [] }
  })

  private async loadCheckpoints(): Promise<void> {
    // P2-CHK-3: 从文件加载未完成的任务
    try {
      await this.checkpointStorage.load()
      const data = this.checkpointStorage.getData()
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24小时过期
      
      // 只恢复 24 小时内未完成的任务
      const validTasks = data.tasks.filter((task: TaskState) => {
        const isRecent = (now - task.startedAt) < maxAge
        const isIncomplete = task.state !== 'COMPLETED' && task.state !== 'ERROR' && task.state !== 'CANCELLED'
        return isRecent && isIncomplete
      })
      
      if (validTasks.length > 0) {
        this.logger.info('Loaded checkpoints', { count: validTasks.length })
        // P2-CHK-3: 恢复到 activeTasks，并标记为 PAUSED 等待恢复
        for (const task of validTasks) {
          task.state = 'PAUSED'  // 标记为暂停状态，等待用户恢复
          this.activeTasks.set(task.id, task)
        }
        
        // 发出事件通知 UI 有可恢复的任务
        this.emit('checkpointsLoaded', { 
          tasks: validTasks.map(t => ({ 
            id: t.id, 
            state: t.state, 
            startedAt: t.startedAt,
            description: t.context?.intent?.raw || '未知任务'
          }))
        })
      }
    } catch (error) {
      this.logger.warn('Failed to load checkpoints', { error: String(error) })
    }
  }
  
  /**
   * P2-CHK-3: 获取所有可恢复的任务（断点续作）
   */
  getResumableTasks(): Array<{ id: string; state: AgentState; startedAt: number; description: string }> {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000
    
    return Array.from(this.activeTasks.values())
      .filter(task => {
        const isRecent = (now - task.startedAt) < maxAge
        const isPaused = task.state === 'PAUSED'
        return isRecent && isPaused
      })
      .map(task => ({
        id: task.id,
        state: task.state,
        startedAt: task.startedAt,
        description: task.context?.intent?.raw || '未知任务'
      }))
  }
  
  /**
   * P2-CHK-3: 恢复指定任务（断点续作）
   */
  async resumeTask(taskId: string): Promise<ChatMessage | null> {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      this.logger.warn('Task not found for resume', { taskId })
      return null
    }
    
    if (task.state !== 'PAUSED') {
      this.logger.warn('Task is not in PAUSED state', { taskId, state: task.state })
      return null
    }
    
    const intent = task.context?.intent as ParsedIntent
    const rawInput = task.context?.rawInput as string
    
    if (!intent || !rawInput) {
      this.logger.error('Task context incomplete', { taskId })
      return null
    }
    
    this.logger.info('Resuming task from checkpoint', { taskId, intent: intent.type })
    
    // 更新任务状态
    task.state = 'PLANNING'
    task.updatedAt = Date.now()
    
    // 执行意图
    return this.executeIntent(intent, rawInput, `resume_${Date.now()}`)
  }
  
  /**
   * P2-CHK-3: 放弃指定任务（删除 checkpoint）
   */
  async abandonTask(taskId: string): Promise<boolean> {
    const task = this.activeTasks.get(taskId)
    if (!task) return false
    
    // 删除任务
    this.activeTasks.delete(taskId)
    
    // 从 checkpoint 存储中移除
    try {
      await this.checkpointStorage.load()
      this.checkpointStorage.updateData(data => {
        data.tasks = data.tasks.filter((t: TaskState) => t.id !== taskId)
      })
      await this.checkpointStorage.save()
    } catch (error) {
      this.logger.warn('Failed to remove checkpoint', { taskId, error: String(error) })
    }
    
    this.logger.info('Task abandoned', { taskId })
    this.emit('taskAbandoned', { taskId })
    return true
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
    // P1-CHK: 保存任务检查点到文件
    try {
      await this.checkpointStorage.load() // 确保已加载
      this.checkpointStorage.updateData(data => {
        // 移除旧的同任务检查点
        data.tasks = data.tasks.filter((t: TaskState) => t.id !== task.id)
        // 添加新检查点
        data.tasks.push({ ...task, updatedAt: Date.now() })
        // 只保留最近 50 个检查点
        if (data.tasks.length > 50) {
          data.tasks = data.tasks.slice(-50)
        }
      })
      await this.checkpointStorage.save()
      this.logger.debug('Checkpoint saved', { taskId: task.id, state: task.state })
    } catch (error) {
      this.logger.error('Failed to save checkpoint', { error: String(error), taskId: task.id })
    }
  }
  
  // ============================================
  // 公共 API
  // ============================================
  
  /**
   * 取消正在执行的任务 (P1-AG)
   * @param taskId 任务ID，如果不传则取消当前任务
   */
  abort(taskId?: string): boolean {
    const targetTaskId = taskId || this.currentTask?.id
    if (!targetTaskId) return false
    
    const controller = this.activeControllers.get(targetTaskId)
    if (controller) {
      controller.abort()
      this.logger.info('Task abort requested', { taskId: targetTaskId })
      return true
    }
    return false
  }
  
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
