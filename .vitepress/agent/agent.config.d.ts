/**
 * Type declarations for agent.config.js
 */

interface ArxivDigestConfig {
  enabled: boolean
  api: { baseUrl: string; timeout: number; maxResults: number }
  categories: string[]
  fetch: { maxPapers: number; dateRange: string; sortBy: string; sortOrder: string }
  content: { targetPath: string; template: string; generateSummary: boolean; summaryMaxLength: number; includeAbstract: boolean; includeAuthors: boolean; includeLinks: boolean }
  schedule: { enabled: boolean; cron: string }
}

interface RSSFeed {
  name: string
  url: string
  category: string
  enabled: boolean
  weight: number
}

interface RSSAggregatorConfig {
  enabled: boolean
  feeds: RSSFeed[]
  filter: { keywords: string[]; minContentLength: number; excludeKeywords: string[]; dedupWindowDays: number }
  fetch: { timeout: number; maxRetries: number; userAgent: string; concurrent: number }
  content: { targetPath: string; template: string; maxArticles: number; groupBySource: boolean; includeExcerpt: boolean; excerptLength: number }
  schedule: { enabled: boolean; cron: string }
}

interface CodeDocsConfig {
  enabled: boolean
  source: { basePath: string; include: string[]; exclude: string[] }
  parser: { extractComments: boolean; extractTypes: boolean; extractFunctions: boolean; extractClasses: boolean }
  output: { targetPath: string; format: string; singleFile: boolean; includeSourceLinks: boolean }
  schedule: { enabled: boolean; cron: string }
}

interface ContentCleanupConfig {
  enabled: boolean
  checks: { orphanLinks: boolean; emptyFolders: boolean; brokenImages: boolean; duplicateTags: boolean; unusedAssets: boolean }
  repair: { autoFix: boolean; moveToArchive: boolean; archivePath: string }
  schedule: { enabled: boolean; cron: string }
}

interface AgentConfigType {
  tasks: {
    arxivDigest: ArxivDigestConfig
    rssAggregator: RSSAggregatorConfig
    codeDocs: CodeDocsConfig
    contentCleanup: ContentCleanupConfig
    [key: string]: any
  }
  content: {
    defaultFrontmatter: { author: string; tags: string[] }
    templates: Record<string, { layout: string; tags: string[]; category: string }>
  }
  llm: {
    defaultModel: string
    taskModels: Record<string, string>
    generation: { temperature: number; maxTokens: number; topP: number }
  }
}

export declare const agentConfig: AgentConfigType
export declare function getTaskConfig(taskType: string): Record<string, any>
export default agentConfig
