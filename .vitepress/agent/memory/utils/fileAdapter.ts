/**
 * FileAdapter - 文件操作适配�?
 * 
 * 在浏览器环境中通过 API 访问文件系统
 * 存储路径基于 docs/ 目录
 */

const API_BASE = '/api/files'
const MEMORY_BASE = '.vitepress/agent/memory/data'

/**
 * 获取文件内容
 */
export async function getFileContent(path: string): Promise<string | null> {
  try {
    // 转换�?API 路径
    const fullPath = path.startsWith('.vitepress') 
      ? path 
      : `${MEMORY_BASE}/${path}`
    
    const response = await fetch(`${API_BASE}/read?path=${encodeURIComponent(fullPath)}`)
    
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.status}`)
    }
    
    return await response.text()
  } catch (error) {
    console.warn(`[FileAdapter] 读取失败: ${path}`, error)
    return null
  }
}

/**
 * 保存文件内容
 */
export async function saveFileContent(path: string, content: string): Promise<void> {
  try {
    // 转换�?API 路径
    const fullPath = path.startsWith('.vitepress') 
      ? path 
      : `${MEMORY_BASE}/${path}`
    
    const response = await fetch(`${API_BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath, content })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to save file: ${response.status}`)
    }
  } catch (error) {
    console.error(`[FileAdapter] 保存失败: ${path}`, error)
    throw error
  }
}

/**
 * 删除文件
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const fullPath = path.startsWith('.vitepress') 
      ? path 
      : `${MEMORY_BASE}/${path}`
    
    const response = await fetch(`${API_BASE}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: fullPath, permanent: true })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.status}`)
    }
  } catch (error) {
    console.error(`[FileAdapter] 删除失败: ${path}`, error)
    throw error
  }
}

/**
 * 检查文件是否存�?
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const fullPath = path.startsWith('.vitepress') 
      ? path 
      : `${MEMORY_BASE}/${path}`
    
    const response = await fetch(`${API_BASE}/read?path=${encodeURIComponent(fullPath)}`)
    return response.ok
  } catch {
    return false
  }
}
