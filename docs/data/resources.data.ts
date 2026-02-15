import { createContentLoader } from 'vitepress'
import fs from 'fs'
import path from 'path'

interface Resource {
  title: string
  url: string
  description: string
  tags?: string[]
}

declare const data: Resource[]
export { data }

export default createContentLoader('sections/resources/**/*.md', {
  transform(raw): Resource[] {
    // Load manifest
    const manifestPath = path.resolve(process.cwd(), 'docs/sections/resources/manifest.json')
    let manifest: Record<string, any> = {}
    try {
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      }
    } catch (e) {}

    return raw
      .map(({ url, frontmatter }) => {
        const parts = url.split('/')
        const baseName = parts[3]
        const meta = manifest[baseName] || {}

        return {
          title: meta.title || frontmatter.title || baseName,
          url,
          description: meta.description || frontmatter.description || '',
          tags: frontmatter.tags
        }
      })
  }
})
