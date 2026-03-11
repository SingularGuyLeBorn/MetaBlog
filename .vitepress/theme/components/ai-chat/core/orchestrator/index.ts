/**
 * Agent Orchestrator - 统一导出
 * 
 * 三级Agent权限系统:
 * - System Agent: 系统级服务，只能用户操作
 * - Manager Agent: 管理Worker，常驻后台自主决策
 * - Worker Agent: 执行任务，受Manager管理
 */

// 核心类
export { AgentOrchestrator, agentOrchestrator } from './orchestrator'
export { ManagerAgentEngine, managerEngineRegistry } from './manager-agent'

// 预设
export {
  // System Agents
  systemMonitorAgentPreset,
  systemLoggerAgentPreset,
  
  // Manager Agents
  mainManagerAgentPreset,
  contentManagerAgentPreset,
  
  // Worker Agents
  passiveWorkerPreset,
  scheduledContentCollectorPreset,
  researchWorkerPreset,
  readLaterWorkerPreset,
  
  // 初始化函数
  initializeDefaultAgents,
  createPassiveWorker,
  createScheduledCollector,
  createResearchWorker,
  createReadLaterWorker
} from './presets'

// 类型
export type {
  // 基础类型
  AgentTier,
  AgentMode,
  AgentRuntimeStatus,
  AgentOperation,
  PermissionRule,
  PermissionMatrix,
  
  // Agent类型
  EnhancedAgent,
  ScheduleConfig,
  RunningTask,
  TaskRecord,
  TaskType,
  TaskDefinition,
  TaskContext,
  ToolCallInfo,
  LogEntry,
  AgentStats,
  CapabilityScore,
  MonitoringConfig,
  
  // 系统类型
  SystemState,
  AgentStateSnapshot,
  SystemLoad,
  SystemEvent,
  SystemEventType,
  
  // 决策类型
  DecisionContext,
  DecisionResult,
  HistoricalMetrics,
  
  // 进化类型
  EvolutionStrategy,
  EvolutionRecord,
  
  // 面板类型
  ControlPanelData,
  NotificationMessage,
  NotificationAction,
  
  // 创建参数
  CreateSystemAgentParams,
  CreateManagerAgentParams,
  CreateWorkerAgentParams,
  OrchestratorConfig
} from './types'

// 常量
export { 
  DEFAULT_ORCHESTRATOR_CONFIG,
  DEFAULT_PERMISSION_MATRIX 
} from './types'
