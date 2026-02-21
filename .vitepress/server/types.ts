/**
 * Server Types
 */

export interface ServerResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
  meta?: Record<string, any>
}

export interface FileOperationRequest {
  path: string
  content?: string
  newPath?: string
}

export interface ArticleCreateRequest {
  title: string
  section?: string
  tags?: string[]
  content?: string
  parentPath?: string
  isChildDoc?: boolean
}
