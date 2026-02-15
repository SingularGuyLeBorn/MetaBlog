import { createContentLoader } from 'vitepress'
import fs from 'fs'
import path from 'path'

interface Post {
  title: string
  url: string
  date: {
    time: number
    string: string
  }
  excerpt: string | undefined
}

declare const data: Post[]
export { data }

export default createContentLoader('sections/posts/**/*.md', {
  excerpt: true,
  transform(raw): Post[] {
    // Load manifest
    const manifestPath = path.resolve(process.cwd(), 'docs/sections/posts/manifest.json')
    let manifest: Record<string, any> = {}
    try {
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      }
    } catch (e) {}

    return raw
      .map(({ url, frontmatter, excerpt }) => {
        const parts = url.split('/')
        const baseName = parts[3]
        const meta = manifest[baseName] || {}

        return {
          title: meta.title || frontmatter.title || baseName,
          url,
          excerpt,
          date: formatDate(frontmatter.date)
        }
      })
      .sort((a, b) => b.date.time - a.date.time)
  }
})

function formatDate(raw: string): Post['date'] {
  const date = new Date(raw || Date.now())
  date.setUTCHours(12)
  return {
    time: +date,
    string: date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}
