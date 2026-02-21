/**
 * Tools 模块索引
 * 统一导出所有工具
 */

export { WebSearchTool, getWebSearchTool } from './WebSearch'
export { GitOperator, getGitOperator } from './GitOperator'
export { VditorBridge, getVditorBridge, createVditorBridge } from './VditorBridge'

// 工具类型导出
export type { SearchOptions, SearchResult, Paper } from './WebSearch'
export type { GitCommitOptions, Checkpoint, GitStatus } from '../core/git.types'
export type { Position, Range, Suggestion } from './VditorBridge'

// 工具集合
import { WebSearchTool } from './WebSearch'
import { GitOperator } from './GitOperator'
import { VditorBridge } from './VditorBridge'

export interface ToolSet {
  webSearch: WebSearchTool
  git: GitOperator
  editor: VditorBridge
}

// 获取所有工具
export function getAllTools(): Partial<ToolSet> {
  return {
    webSearch: getWebSearchTool(),
    git: getGitOperator(),
    editor: getVditorBridge()
  }
}

// 辅助函数：获取 WebSearch
import { getWebSearchTool } from './WebSearch'

// 辅助函数：获取 GitOperator
import { getGitOperator } from './GitOperator'

// 辅助函数：获取 VditorBridge
import { getVditorBridge } from './VditorBridge'
