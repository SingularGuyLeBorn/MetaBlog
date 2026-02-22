/**
 * Agent Control Center - 控制中心模块
 * 
 * 导出：
 * - AgentControlCenter: 主组件
 * - useAgentControl: 组合式函数
 */

export { default as AgentControlCenter } from './AgentControlCenter.vue'
export { useAgentControl, generateAvatarUrl, getRandomAvatarId } from '../../../core/composables/useAgentControl'
export type { 
  Agent, 
  AgentStatus, 
  Trigger, 
  TriggerType,
  AgentCreateParams 
} from '../../../core/composables/useAgentControl'
