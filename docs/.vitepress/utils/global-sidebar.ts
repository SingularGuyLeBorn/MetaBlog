import { readdirSync, statSync, existsSync, readFileSync } from 'fs'
import { join, relative, resolve, dirname } from 'path'

interface SidebarNode {
  text: string
  link?: string
  items?: SidebarNode[]
  collapsed?: boolean
  id?: string
}

// Global cache for manifests to avoid repeated IO per recursive call
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
  const node = scanNestNode(sectionDir, sectionName, 0, root)
  // If we want the section root to be the top item, wrap it in an array
  return node ? [node] : []
}

export function generateGlobalSidebar(sectionsPath: string): SidebarNode[] {
  if (!existsSync(sectionsPath)) return []
  
  // Scan sections: knowledge, posts, resources, about
  const sections = readdirSync(sectionsPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => {
      const order = ['knowledge', 'posts', 'resources', 'about']
      const idxA = order.indexOf(a.name)
      const idxB = order.indexOf(b.name)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.name.localeCompare(b.name)
    })
  
  const root = resolve(process.cwd(), 'docs')

  return sections.map(section => {
    const sectionDir = join(sectionsPath, section.name)
    const sectionNode = scanNestNode(sectionDir, section.name, 0, root)
    
    if (sectionNode) {
      sectionNode.link = `/sections/${section.name}/`
      sectionNode.collapsed = false // Always expanded at root section level
    }
    
    return sectionNode
  }).filter(Boolean) as SidebarNode[]
}

function scanNestNode(dirPath: string, nodeName: string, level: number, rootDocPath: string): SidebarNode | null {
  const sameNameMd = join(dirPath, `${nodeName}.md`)
  const indexMd = join(dirPath, `index.md`)
  
  let folderlink = ''
  let folderNotePath = ''
  
  // Identify if this folder acts as a document node (has content)
  if (existsSync(sameNameMd)) {
    folderNotePath = sameNameMd
    folderlink = '/' + relative(rootDocPath, dirPath).replace(/\\/g, '/') + '/'
  } else if (existsSync(indexMd)) {
    folderNotePath = indexMd
    folderlink = '/' + relative(rootDocPath, dirPath).replace(/\\/g, '/') + '/'
  }
  
  // Clean up folder title: Priority 1. manifest.json 2. folderNote (frontmatter/H1) 3. Folder Name
  const manifest = getManifest(dirname(dirPath))
  let title = manifest[nodeName]?.title
  
  if (!title && folderNotePath) {
    title = extractTitle(folderNotePath)
  }
  
  if (!title) {
    title = nodeName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  
  const entries = readdirSync(dirPath, { withFileTypes: true })
  const children: SidebarNode[] = []
  
  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name)
    
    // 1. Handle Directories (Recursive)
    if (entry.isDirectory()) {
      const childNode = scanNestNode(
        entryPath,
        entry.name,
        level + 1,
        rootDocPath
      )
      if (childNode) {
        children.push(childNode)
      }
    } 
    // 2. Handle Markdown Files
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Skip if this file is the "folder note" for the current directory (already handled as the parent node's link)
      if (entryPath === folderNotePath) continue
      
      
      // User request: "index.md" is special (handled as parent), but for other files, 
      // strict filename (without .md) should be used as title to preserve ordering/naming.
      // Do NOT extract title from content.
      const childTitle = entry.name.replace(/\.md$/i, '')
      const childLink = '/' + relative(rootDocPath, entryPath).replace(/\\/g, '/').replace(/\.md$/, '')
      
      children.push({
        text: childTitle,
        link: childLink,
        id: childLink // Use link as ID for files
      })
    }
  }
  
  // A node is valid if it has a link (is a document) OR has children
  if (!folderlink && children.length === 0) {
      return null
  }

  // Generate a predictable ID for the folder node based on its path
  const uniqueNodeId = '/' + relative(rootDocPath, dirPath).replace(/\\/g, '/') + '/'

  const node: SidebarNode = {
    text: title,
    collapsed: level >= 1,
    id: uniqueNodeId
  }
  
  if (folderlink) node.link = folderlink
  
  if (children.length > 0) {
    // Sort: Folders first? Or Mix? Usually mix alphabetically or by some order. 
    // Let's keep alphabetical sort by text for now to be simple and predictable.
    node.items = children.sort((a, b) => a.text.localeCompare(b.text))
  } else {
     delete node.collapsed
  }
  
  return node
}

function extractTitle(mdPath: string): string {
  try {
    const content = readFileSync(mdPath, 'utf-8')
    // More robust frontmatter match (handles spaces, single/double quotes)
    const fmMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m)
    if (fmMatch) return fmMatch[1].trim()
    
    // Match first # header
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) return h1Match[1].trim()
  } catch {}
  return ''
}
