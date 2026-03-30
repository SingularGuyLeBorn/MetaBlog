/**
 * 危险操作确认管理
 * 
 * 统一管理需要用户确认的危险操作：
 * - 删除文章
 * - 覆盖文件
 * - 批量删除
 * - 执行代码
 */

import { ref } from 'vue'

export interface DangerActionConfig {
  toolName: string
  title: string
  message: string
  getDetails: (args: Record<string, any>) => { label: string; value: string }[]
}

// 危险操作配置
const DANGEROUS_ACTIONS: DangerActionConfig[] = [
  {
    toolName: 'delete_article',
    title: '删除文章',
    message: '您即将删除一篇文章。此操作不可恢复，文件将被移至回收站。',
    getDetails: (args) => [
      { label: '路径', value: args.path || '未知' },
      { label: '备份', value: args.backup_first !== false ? '是' : '否' }
    ]
  },
  {
    toolName: 'delete_file',
    title: '删除文件',
    message: '您即将删除一个文件。此操作不可恢复。',
    getDetails: (args) => [
      { label: '路径', value: args.path || '未知' },
      { label: '永久删除', value: args.permanent ? '是' : '否（移至回收站）' }
    ]
  },
  {
    toolName: 'update_article',
    title: '更新文章',
    message: '您即将修改文章内容。原有内容将被替换。',
    getDetails: (args) => [
      { label: '路径', value: args.path || '未知' },
      { label: '模式', value: args.mode || 'replace' }
    ]
  },
  {
    toolName: 'execute_code',
    title: '执行代码',
    message: '您即将执行代码片段。请确保代码来源可信。',
    getDetails: (args) => [
      { label: '语言', value: args.language || '未知' },
      { label: '代码长度', value: args.code ? `${args.code.length} 字符` : '未知' }
    ]
  }
]

// 确认对话框状态
const showConfirm = ref(false)
const currentAction = ref<DangerActionConfig | null>(null)
const currentArgs = ref<Record<string, any>>({})
let resolveCallback: ((value: boolean) => void) | null = null

/**
 * 检查是否需要确认
 */
export function needsConfirmation(toolName: string): boolean {
  return DANGEROUS_ACTIONS.some(a => a.toolName === toolName)
}

/**
 * 请求用户确认
 */
export async function requestConfirmation(
  toolName: string,
  args: Record<string, any>
): Promise<boolean> {
  const config = DANGEROUS_ACTIONS.find(a => a.toolName === toolName)
  
  if (!config) {
    return true // 不需要确认
  }
  
  // 检查参数中是否已有确认标记
  if (args.confirm === true) {
    return true
  }
  
  return new Promise((resolve) => {
    currentAction.value = config
    currentArgs.value = args
    resolveCallback = resolve
    showConfirm.value = true
  })
}

/**
 * 确认操作
 */
export function confirmAction() {
  if (resolveCallback) {
    resolveCallback(true)
    resolveCallback = null
  }
  showConfirm.value = false
}

/**
 * 取消操作
 */
export function cancelAction() {
  if (resolveCallback) {
    resolveCallback(false)
    resolveCallback = null
  }
  showConfirm.value = false
}

/**
 * 使用危险确认
 */
export function useDangerAction() {
  return {
    showConfirm,
    currentAction,
    currentArgs,
    needsConfirmation,
    requestConfirmation,
    confirmAction,
    cancelAction
  }
}
