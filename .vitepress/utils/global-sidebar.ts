import { readdirSync, existsSync, readFileSync, statSync } from 'fs'
import { join, relative, resolve, dirname, extname, basename } from 'path'

interface SidebarNode {
  text: string
  link?: string
  items?: SidebarNode[]
  collapsed?: boolean
  id?: string
  isLeaf?: boolean
}

const manifestCache = new Map<string, Record<string, any>>()

function getManifest(dir: string): Record<string, any> {
  const manifestPath = join(dir, 'manifest.json')
  if (manifestCache.has(manifestPath)) return manifestCache.get(manifestPath)!
  
  if (existsSync(manifestPath)) {
    try {
      const content = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      manifestCache.set(manifestPath, content)
      return content
    } catch {}
  }
  return {}
}

export function generateSectionSidebar(sectionsPath: string, sectionName: string): SidebarNode[] {
  const sectionDir = join(sectionsPath, sectionName)
  const root = resolve(process.cwd(), 'docs')
  
  if (!existsSync(sectionDir)) return []
  
  const entries = readdirSync(sectionDir, { withFileTypes: true })
  const nodes: SidebarNode[] = []
  
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'manifest.json') continue
    
    const entryPath = join(sectionDir, entry.name)
    
    if (entry.isDirectory()) {
      const node = scanNode(entryPath, entry.name, root, 0)
      if (node) nodes.push(node)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const node = createLeafNode(entryPath, entry.name, root)
      if (node) nodes.push(node)
    }
  }
  
  return nodes.sort((a, b) => sortNodes(a, b))
}

function scanNode(dirPath: string, nodeName: string, rootDocPath: string, level: number): SidebarNode | null {
  const sameNameMd = join(dirPath, `${nodeName}.md`)
  const indexMd = join(dirPath, 'index.md')
  
  let folderLink: string | undefined
  let folderNotePath: string | undefined
  
  if (existsSync(sameNameMd)) {
    folderNotePath = sameNameMd
    folderLink = '/' + relative(rootDocPath, dirPath).replace(/\\/g, '/') + '/'
  } else if (existsSync(indexMd)) {
    folderNotePath = indexMd
    folderLink = '/' + relative(rootDocPath, dirPath).replace(/\\/g, '/') + '/'
  }
  
  const parentDir = dirname(dirPath)
  const manifest = getManifest(parentDir)
  let title = manifest[nodeName]?.title
  
  if (!title && folderNotePath) {
    title = extractTitle(folderNotePath)
  }
  if (!title) {
    title = formatDisplayName(nodeName)
  }
  
  const nodeId = '/' + relative(rootDocPath, dirPath).replace(/\\/g, '/') + '/'
  
  const entries = readdirSync(dirPath, { withFileTypes: true })
  const children: SidebarNode[] = []
  
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'manifest.json') continue
    
    const entryPath = join(dirPath, entry.name)
    
    if (entryPath === folderNotePath) continue
    
    if (entry.isDirectory()) {
      const childNode = scanNode(entryPath, entry.name, rootDocPath, level + 1)
      if (childNode) children.push(childNode)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const leafNode = createLeafNode(entryPath, entry.name, rootDocPath, level + 1)
      if (leafNode) children.push(leafNode)
    }
  }
  
  const node: SidebarNode = {
    text: title,
    id: nodeId,
    collapsed: level >= 1,
    isLeaf: false
  }
  
  if (folderLink) node.link = folderLink
  if (children.length > 0) node.items = children.sort((a, b) => sortNodes(a, b))
  
  if (!folderLink && children.length === 0) return null
  
  return node
}

function createLeafNode(filePath: string, fileName: string, rootDocPath: string, level: number = 0): SidebarNode | null {
  const baseName = fileName.replace(/\.md$/i, '')
  // 优先从文件 frontmatter 或 H1 提取标题
  const extractedTitle = extractTitle(filePath)
  const title = extractedTitle || formatDisplayName(baseName)
  const relativePath = relative(rootDocPath, filePath)
  const link = '/' + relativePath.replace(/\\/g, '/').replace(/\.md$/, '')
  
  return {
    text: title,
    link: link,
    id: link,
    collapsed: false,
    isLeaf: true
  }
}

function sortNodes(a: SidebarNode, b: SidebarNode): number {
  const aText = a.text || ''
  const bText = b.text || ''
  
  const aMatch = aText.match(/^(\d+)/)
  const bMatch = bText.match(/^(\d+)/)
  
  if (aMatch && bMatch) {
    const aNum = parseInt(aMatch[1], 10)
    const bNum = parseInt(bMatch[1], 10)
    if (aNum !== bNum) return aNum - bNum
  }
  
  return aText.localeCompare(bText)
}

function formatDisplayName(name: string): string {
  let formatted = name.replace(/_/g, ' ')
  formatted = formatted.replace(/^(\d+)([A-Za-z])/, '$1 $2')
  
  return formatted.split(' ').map(word => {
    if (!word) return ''
    if (/^\d+$/.test(word)) return word
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ')
}

function extractTitle(mdPath: string): string {
  try {
    const content = readFileSync(mdPath, 'utf-8')
    const fmMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m)
    if (fmMatch) return fmMatch[1].trim()
    
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) return h1Match[1].trim()
  } catch {}
  return ''
}
