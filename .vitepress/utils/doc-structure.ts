/**
 * 文档结构规范 - 定义文件夹结构与前端显示的映射关系
 * 
 * 规范:
 * 1. 叶子文档: {name}.md → 显示为文章
 * 2. Folder Note: {folder}/{folder}.md → 文件夹可点击,标题来自文件
 * 3. Index 模式: {folder}/index.md → 文件夹可点击,标题来自 index.md
 * 4. 混合模式: {folder}/{folder}.md + {folder}/child.md → 可展开父节点
 */

import { existsSync, readdirSync } from 'fs'
import { basename, join } from 'path'

/**
 * 自然排序：按数字和非数字分段比较
 * 示例：Lecture1 < Lecture2 < Lecture10
 */
function naturalSort(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const aParts = a.match(re) || []
  const bParts = b.match(re) || []
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aNum = parseInt(aParts[i], 10)
    const bNum = parseInt(bParts[i], 10)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum
    } else {
      const cmp = aParts[i].localeCompare(bParts[i])
      if (cmp !== 0) return cmp
    }
  }
  return aParts.length - bParts.length
}

export interface DocNode {
  id: string
  type: 'file' | 'folder'
  name: string           // 文件名/文件夹名
  title: string          // 显示标题
  path: string           // 相对路径 (sections/posts/xxx)
  link?: string          // URL 链接
  desc?: string          // 简介描述
  children?: DocNode[]
  isLeaf: boolean
  collapsed?: boolean
}

/**
 * 扫描 section 目录,生成规范化的文档树
 */
export function scanDocStructure(
  sectionPath: string,
  sectionName?: string
): DocNode[] {
  const nodes: DocNode[] = []

  // 如果没有提供 sectionName,从路径提取
  const secName = sectionName || basename(sectionPath)

  const entries = readdirSync(sectionPath, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && e.name !== 'manifest.json')
    .sort((a, b) => {
      // 文件夹在前,文件在后
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return naturalSort(a.name, b.name)
    })

  for (const entry of entries) {
    const fullPath = join(sectionPath, entry.name)
    // 路径包含 section 名称前缀
    const relativePath = `${secName}/${entry.name}`

    if (entry.isDirectory()) {
      // 尝试读取 manifest.json
      let manifest: any = {}
      try {
        const manifestPath = join(sectionPath, 'manifest.json')
        if (existsSync(manifestPath)) {
          manifest = JSON.parse(require('fs').readFileSync(manifestPath, 'utf-8'))
        }
      } catch (e) { }

      const folderNode = scanFolder(fullPath, entry.name, relativePath, secName, manifest)
      if (folderNode) nodes.push(folderNode)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // 跳过 section 首页文件 (如 posts.md)
      if (entry.name === `${secName}.md`) continue

      const fileNode = createFileNode(fullPath, entry.name, relativePath, secName)
      if (fileNode) nodes.push(fileNode)
    }
  }

  return nodes
}

/**
 * 扫描文件夹,识别 Folder Note 或 Index 模式
 */
function scanFolder(
  dirPath: string,
  folderName: string,
  relativePath: string,
  sectionName: string,
  manifest: any = {}
): DocNode | null {
  const folderNotePath = join(dirPath, `${folderName}.md`)
  const indexPath = join(dirPath, 'index.md')

  let title = folderName
  let desc = manifest[folderName]?.description || ''
  let link: string | undefined
  let folderNotePathUsed: string | undefined

  // 优先使用 Folder Note 模式 (folder/folder.md)
  if (existsSync(folderNotePath)) {
    title = extractTitle(folderNotePath) || manifest[folderName]?.title || formatDisplayName(folderName)
    desc = desc || extractDesc(folderNotePath) || ''
    link = `/sections/${relativePath}/`
    folderNotePathUsed = folderNotePath
  }
  // 其次使用 Index 模式 (folder/index.md)
  else if (existsSync(indexPath)) {
    title = extractTitle(indexPath) || manifest[folderName]?.title || formatDisplayName(folderName)
    desc = desc || extractDesc(indexPath) || ''
    link = `/sections/${relativePath}/`
    folderNotePathUsed = indexPath
  }

  // 扫描子项
  const children: DocNode[] = []
  const entries = readdirSync(dirPath, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && e.name !== 'manifest.json')
    .sort((a, b) => {
      // 文件夹在前,文件在后
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return naturalSort(a.name, b.name)
    })

  for (const entry of entries) {
    // 跳过 Folder Note 或 index.md 本身
    if (join(dirPath, entry.name) === folderNotePathUsed) continue

    const childRelativePath = `${relativePath}/${entry.name}`

    if (entry.isDirectory()) {
      const childNode = scanFolder(
        join(dirPath, entry.name),
        entry.name,
        childRelativePath,
        sectionName
      )
      if (childNode) children.push(childNode)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const childNode = createFileNode(
        join(dirPath, entry.name),
        entry.name,
        childRelativePath,
        sectionName
      )
      if (childNode) children.push(childNode)
    }
  }

  // 如果没有 Folder Note/Index 且没有子项,忽略此文件夹
  if (!link && children.length === 0) return null

  return {
    id: `/sections/${relativePath}/`,
    type: 'folder',
    name: folderName,
    title,
    desc,
    path: relativePath,
    link,
    children: children.length > 0 ? children : undefined,
    isLeaf: false,
    collapsed: true
  }
}

/**
 * 创建文件节点
 */
function createFileNode(
  filePath: string,
  fileName: string,
  relativePath: string,
  sectionName: string
): DocNode | null {
  const baseName = fileName.replace(/\.md$/i, '')
  const title = extractTitle(filePath) || formatDisplayName(baseName)
  const desc = extractDesc(filePath) || ''
  const link = `/sections/${relativePath.replace(/\.md$/i, '')}`

  return {
    id: link,
    type: 'file',
    name: baseName,
    title,
    desc,
    path: relativePath.replace(/\.md$/i, ''),
    link,
    isLeaf: true
  }
}

/**
 * 从文件提取标题
 *
 * 优先级：frontmatter title > H1 标题
 *
 * 修复：原正则有缺陷,`[\s\S]*?\r?\n` 会吞掉包含 `title:` 的那一行,
 * 导致 frontmatter title 永远提取失败. 现改为先提取 frontmatter 块,再在块内搜索 title. 
 */
function extractTitle(filePath: string): string | null {
  try {
    const content = require('fs').readFileSync(filePath, 'utf-8')

    // 1. 从 frontmatter 提取(先提取 --- ... --- 块,再在块内匹配 title 行)
    const fmBlockMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (fmBlockMatch) {
      const titleMatch = fmBlockMatch[1].match(/^title:\s*(.+?)\r?$/m)
      if (titleMatch) return titleMatch[1].trim().replace(/^["']|["']$/g, '')
    }

    // 2. 从 H1 提取
    const h1Match = content.match(/^#\s+(.+)\r?$/m)
    if (h1Match) return h1Match[1].trim()

    return null
  } catch {
    return null
  }
}

/**
 * 从文件提取描述
 *
 * 修复：同 extractTitle,原正则有缺陷. 现改为先提取 frontmatter 块,再在块内搜索 description. 
 */
function extractDesc(filePath: string): string | null {
  try {
    const content = require('fs').readFileSync(filePath, 'utf-8')
    const fmBlockMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (fmBlockMatch) {
      const descMatch = fmBlockMatch[1].match(/^description:\s*(.+?)\r?$/m)
      if (descMatch) return descMatch[1].trim().replace(/^["']|["']$/g, '')
    }
    return null
  } catch {
    return null
  }
}

/**
 * 格式化显示名称
 *
 * 直接原样返回文件名,不做任何格式化(不替换分隔符、不大写首字母). 
 * 标题优先从 frontmatter title 或 H1 提取,本函数仅作为无标题时的 fallback. 
 */
function formatDisplayName(name: string): string {
  return name
}

/**
 * 转换为 Sidebar 格式(兼容 VitePress)
 */
export function toSidebarFormat(nodes: DocNode[]): any[] {
  return nodes.map(node => {
    const result: any = {
      text: node.title,
      id: node.id,
      collapsed: node.collapsed ?? false,
      isLeaf: node.isLeaf,
      description: node.desc
    }

    // 确保链接格式一致性：文件夹以 / 结尾,文件不以 / 结尾
    if (node.link) {
      result.link = node.type === 'folder'
        ? (node.link.endsWith('/') ? node.link : `${node.link}/`)
        : node.link.replace(/\/$/, '')
    }
    if (node.children) result.items = toSidebarFormat(node.children)

    return result
  })
}

/**
 * 转换为前端目录树格式
 */
export function toDirectoryTree(nodes: DocNode[]): any[] {
  return nodes.map(node => {
    if (node.type === 'folder') {
      return {
        type: 'directory',
        path: node.id,
        name: node.name,
        displayName: node.title,
        children: node.children ? toDirectoryTree(node.children) : []
      }
    }
    return {
      type: 'article',
      path: node.link,
      name: node.name,
      title: node.title,
      displayName: node.title
    }
  })
}
