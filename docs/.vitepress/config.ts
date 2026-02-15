import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import MarkdownIt from 'markdown-it'
import mathjax3 from 'markdown-it-mathjax3'
import { generateGlobalSidebar, generateSectionSidebar } from './utils/global-sidebar'

// Helper to calculate word count
const getWordCount = (content: string) => {
  return content.split(/\s+/g).length
}

// Extract title from markdown content
function extractTitle(mdPath: string): string {
  try {
    const content = fs.readFileSync(mdPath, 'utf-8')
    const match = content.match(/^title:\s*(.+)$/m)
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
}

export default defineConfig({
  lang: 'zh-CN',
  title: "MetaUniverse Blog",
  description: "数字孪生级知识管理系统",
  base: '/',
  cleanUrls: true,

  // Rewrites for Strict Nest
  rewrites: {
    'sections/:section/:section.md': 'sections/:section/index.md',
    'sections/:section/:a/:a.md': 'sections/:section/:a/index.md',
    'sections/:section/:a/:b/:b.md': 'sections/:section/:a/:b/index.md',
    'sections/:section/:a/:b/:c/:c.md': 'sections/:section/:a/:b/:c/index.md',
    'sections/:section/:a/:b/:c/:d/:d.md': 'sections/:section/:a/:b/:c/:d/index.md',
    'sections/:section/:a/:b/:c/:d/:e/:e.md': 'sections/:section/:a/:b/:c/:d/:e/index.md'
  },
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '文章列表', link: '/sections/posts/', activeMatch: '/sections/posts/' },
      { text: '知识库', link: '/sections/knowledge/', activeMatch: '/sections/knowledge/' },
      { text: '公开资源', link: '/sections/resources/', activeMatch: '/sections/resources/' },
      { text: '关于我', link: '/sections/about/', activeMatch: '/sections/about/' }
    ],
    sidebar: {
      '/sections/knowledge/': generateSectionSidebar(path.resolve(__dirname, '../sections'), 'knowledge'),
      '/sections/posts/': generateSectionSidebar(path.resolve(__dirname, '../sections'), 'posts'),
      '/sections/resources/': generateSectionSidebar(path.resolve(__dirname, '../sections'), 'resources'),
      '/sections/about/': generateSectionSidebar(path.resolve(__dirname, '../sections'), 'about')
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],
    docFooter: { prev: false, next: false },
    outline: { label: '页面导航' },
    lastUpdated: { text: '最后更新于' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  },

  markdown: {
    config: (md: MarkdownIt) => {
      md.use(mathjax3)

      const defaultRender = md.renderer.rules.text || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };
      
      md.renderer.rules.text = function(tokens, idx, options, env, self) {
        let content = tokens[idx].content;
        const wikiLinkRegex = /\[\[(.*?)\]\]/g;
        if (wikiLinkRegex.test(content)) {
            return content.replace(wikiLinkRegex, (match, p1) => {
                const [link, text] = p1.split('|');
                const displayText = text || link;
                // Basic root-relative resolution for now
                const url = `/sections/posts/${link.trim().replace(/\s+/g, '-').toLowerCase()}/`;
                return `<a href="${url}">${displayText}</a>`;
            });
        }
        return defaultRender(tokens, idx, options, env, self);
      };
    }
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag: string) => tag.startsWith('mjx-')
      }
    }
  },
  vite: {
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./theme', import.meta.url)) }
      ]
    },
    plugins: [
      {
        name: 'meta-blog-routing',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || ''
            if (url.includes('_assets') || url.includes('@fs') || url.includes('?')) {
              next()
              return
            }
            if (url.startsWith('/sections/') && !url.endsWith('/') && !url.includes('.')) {
              res.statusCode = 301
              res.setHeader('Location', url + '/')
              res.end()
              return
            }
            next()
          })
        }
      },
      {
        name: 'meta-blog-bff',
        configureServer(server) {
          server.middlewares.use('/api/files/read', (req: any, res: any, next: any) => {
            if (req.method === 'GET') {
              const url = new URL(req.url || '', `http://${req.headers.host}`)
              const filePath = url.searchParams.get('path')
              if (!filePath) return next()

              const fullPath = path.resolve(process.cwd(), 'docs', filePath.replace(/^\//, ''))
              if (fs.existsSync(fullPath)) {
                res.setHeader('Content-Type', 'text/plain')
                res.end(fs.readFileSync(fullPath, 'utf-8'))
              } else {
                res.statusCode = 404
                res.end('File not found')
              }
            } else next()
          })

          server.middlewares.use('/api/files/save', (req, res, next) => {
             if (req.method === 'POST') {
                const chunks: Buffer[] = []
                req.on('data', chunk => chunks.push(chunk))
                req.on('end', () => {
                   const body = JSON.parse(Buffer.concat(chunks).toString())
                   const { path: filePath, content } = body
                   const fullPath = path.resolve(process.cwd(), 'docs', filePath.replace(/^\//, ''))
                   fs.writeFileSync(fullPath, content)
                   try {
                      execSync(`git add "${fullPath}"`)
                      execSync(`git commit -m "Auto-edit: ${path.basename(fullPath)}"`)
                   } catch (e) {}
                   res.end('Saved')
                })
             } else next()
          })
        }
      }
    ],
    define: {
      VDITOR_VERSION: JSON.stringify('3.11.2')
    }
  },
  
  async transformPageData(pageData: any) {
    pageData.frontmatter.wordCount = getWordCount(pageData.content || '')
    const relativePath = pageData.relativePath
    const parts = relativePath.split('/')
    const breadcrumbs: { title: string, link?: string }[] = []
    
    let accumulatedPath = ''
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i]
        if (part.endsWith('.md')) part = part.replace('.md', '')
        if (part === 'index' || !part) continue
        
        accumulatedPath += '/' + part
        const title = part.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        
        breadcrumbs.push({
            title,
            link: (i === parts.length - 1) ? undefined : accumulatedPath + '/'
        })
    }
    
    pageData.frontmatter.breadcrumb = breadcrumbs
    pageData.title = pageData.frontmatter.title || (breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].title : '')
  }
})
