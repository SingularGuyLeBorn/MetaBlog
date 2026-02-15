import { createContentLoader } from 'vitepress'
import fs from 'fs'
import path from 'path'

interface KnowledgeBase {
  title: string
  url: string
  description: string
}

declare const data: KnowledgeBase[]
export { data }

export default createContentLoader('sections/knowledge/**/*.md', {
  transform(raw): KnowledgeBase[] {
    const bases = new Map<string, KnowledgeBase>()
    
    // Load manifest
    const manifestPath = path.resolve(process.cwd(), 'docs/sections/knowledge/manifest.json')
    let manifest: Record<string, any> = {}
    try {
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      }
    } catch (e) {
      console.error('[Knowledge Data] Failed to load manifest', e)
    }

    raw.forEach(({ url, frontmatter }) => {
      const parts = url.split('/')
      // url format: /sections/knowledge/base-name/sub/path/file.html
      // We want to group by the top-level 'base-name' inside knowledge
      if (parts.length >= 4) {
        const baseName = parts[3]
        
        // Skip the index file of the knowledge section itself if it exists
        if (baseName === 'index.html' || baseName === '') return

        if (!bases.has(baseName)) {
           const meta = manifest[baseName] || {}
           const entry: KnowledgeBase = {
             title: meta.title || baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/-/g, ' '),
             url: url,
             description: meta.description || '知识库合集'
           }
           bases.set(baseName, entry)
        } else {
            // Priority: index file of the base folder is the preferred entry point link
            // e.g. /sections/knowledge/aibisa/index.html
            if (url === `/sections/knowledge/${baseName}/index.html` || url === `/sections/knowledge/${baseName}/`) {
                bases.get(baseName)!.url = url
            }
        }
      }
    })

    return Array.from(bases.values())
  }
})
