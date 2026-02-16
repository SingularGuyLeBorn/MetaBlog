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

/**
 * Format a name for breadcrumb display
 */
function formatBreadcrumbName(name: string): string {
  let formatted = name.replace(/[_-]/g, ' ')
  formatted = formatted.replace(/^(\d+)\s*/, '$1 ')
  return formatted.split(' ').map(word => {
    if (!word) return ''
    if (/^\d+$/.test(word)) return word
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ').trim()
}

/**
 * Generate all rewrites for the strict nest architecture
 * This handles the "pair rule": folder-name/folder-name.md -> folder-name/index.md
 */
function generateRewrites(): Record<string, string> {
  const rewrites: Record<string, string> = {}
  const sectionsPath = path.resolve(__dirname, '../sections')
  
  if (!fs.existsSync(sectionsPath)) return rewrites
  
  // Scan all sections
  const sections = fs.readdirSync(sectionsPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
  
  for (const section of sections) {
    const sectionPath = path.join(sectionsPath, section.name)
    scanForRewrites(sectionPath, `sections/${section.name}`, rewrites)
  }
  
  return rewrites
}

/**
 * Recursively scan directory for rewrites
 */
function scanForRewrites(dirPath: string, relativePath: string, rewrites: Record<string, string>): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const dirName = path.basename(dirPath)
  
  // Check for same-name.md (pair rule)
  const sameNameMd = path.join(dirPath, `${dirName}.md`)
  const indexMd = path.join(dirPath, 'index.md')
  
  if (fs.existsSync(sameNameMd)) {
    // Rewrite: folder-name/folder-name.md -> folder-name/index.md
    // This makes /folder-name/ work correctly
    const source = `${relativePath}/${dirName}.md`
    const target = `${relativePath}/index.md`
    rewrites[source] = target
  }
  
  // Recurse into subdirectories
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      scanForRewrites(
        path.join(dirPath, entry.name),
        `${relativePath}/${entry.name}`,
        rewrites
      )
    }
  }
}

export default defineConfig({
  lang: 'zh-CN',
  title: "MetaUniverse Blog",
  description: "数字孪生级知识管理系统",
  base: '/',
  cleanUrls: true,

  // Generate rewrites dynamically
  rewrites: generateRewrites(),
  
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
    outline: { 
      label: '页面导航',
      level: [2, 4] // Show headers from h2 to h4
    },
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
            
            // Skip asset requests
            if (url.includes('_assets') || url.includes('@fs') || url.includes('?') || url.includes('.')) {
              next()
              return
            }
            
            // Redirect paths without trailing slash to have trailing slash
            // This is crucial for the pair rule to work correctly
            if (url.startsWith('/sections/') && !url.endsWith('/')) {
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
                      execSync(`git commit -m "content: 更新 ${path.basename(fullPath)}"`)
                   } catch (e) {}
                   res.end('Saved')
                })
             } else next()
          })

          // ============================================
          // Agent API Routes - AI-Native Operations
          // ============================================

          // Agent 任务提交（区分人工操作）
          server.middlewares.use('/api/agent/task', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Buffer[] = []
              req.on('data', chunk => chunks.push(chunk))
              req.on('end', () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString())
                  const { taskId, content: fileContent, path: filePath, metadata } = body
                  
                  const fullPath = path.resolve(process.cwd(), 'docs', filePath.replace(/^\//, ''))
                  fs.writeFileSync(fullPath, fileContent)
                  
                  // Agent 特定的 Git 提交格式
                  const commitMessage = `agent(${taskId}): ${metadata?.description || 'Auto update'}${metadata?.skill ? ` [${metadata.skill}]` : ''}
>
> Author: agent
> Model: ${metadata?.model || 'unknown'}
> Skill: ${metadata?.skill || 'unknown'}
> Tokens: ${metadata?.tokens || 0}
> Cost: $${metadata?.cost || 0}
> Parent-Task: ${taskId}`

                  try {
                    execSync(`git add "${fullPath}"`)
                    execSync(`git commit -m "${commitMessage}"`)
                  } catch (e) {
                    console.error('Git commit failed:', e)
                  }
                  
                  // 保存任务状态到 memory/tasks/
                  const taskDir = path.resolve(process.cwd(), 'docs/.vitepress/agent/memory/tasks')
                  if (!fs.existsSync(taskDir)) {
                    fs.mkdirSync(taskDir, { recursive: true })
                  }
                  const taskFile = path.join(taskDir, `${taskId}.json`)
                  fs.writeFileSync(taskFile, JSON.stringify({
                    id: taskId,
                    status: 'completed',
                    path: filePath,
                    metadata,
                    timestamp: new Date().toISOString()
                  }, null, 2))
                  
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: true, taskId }))
                } catch (e) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: String(e) }))
                }
              })
            } else next()
          })

          // Agent 上下文初始化
          server.middlewares.use('/api/agent/context/init', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Buffer[] = []
              req.on('data', chunk => chunks.push(chunk))
              req.on('end', () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString())
                  const { path: filePath } = body
                  
                  // 读取文件历史和相关实体
                  const contextDir = path.resolve(process.cwd(), 'docs/.vitepress/agent/memory')
                  let entities: any[] = []
                  let history: any[] = []
                  
                  // 尝试读取实体
                  const entitiesPath = path.join(contextDir, 'entities/concepts.json')
                  if (fs.existsSync(entitiesPath)) {
                    const entitiesData = JSON.parse(fs.readFileSync(entitiesPath, 'utf-8'))
                    entities = Object.values(entitiesData).filter((e: any) => 
                      e.sources?.includes(filePath)
                    )
                  }
                  
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({
                    success: true,
                    context: {
                      path: filePath,
                      entities: entities.slice(0, 5),
                      relatedArticles: entities.length
                    }
                  }))
                } catch (e) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: String(e) }))
                }
              })
            } else next()
          })

          // Agent 任务状态查询
          server.middlewares.use('/api/agent/task/status', (req, res, next) => {
            if (req.method === 'GET') {
              const url = new URL(req.url || '', `http://${req.headers.host}`)
              const taskId = url.searchParams.get('id')
              
              if (!taskId) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing task ID' }))
                return
              }
              
              const taskFile = path.resolve(process.cwd(), 'docs/.vitepress/agent/memory/tasks', `${taskId}.json`)
              
              if (fs.existsSync(taskFile)) {
                const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf-8'))
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(taskData))
              } else {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Task not found' }))
              }
            } else next()
          })

          // Git 日志 API（区分人工和 Agent）
          server.middlewares.use('/api/git/log', (req, res, next) => {
            if (req.method === 'GET') {
              try {
                const logOutput = execSync('git log --pretty=format:\'{"hash":"%H","message":"%s","date":"%ai","author":"%an"}\' -20', 
                  { encoding: 'utf-8', cwd: process.cwd() }
                )
                const logs = logOutput.split('\n')
                  .filter(line => line.trim())
                  .map(line => {
                    try {
                      return JSON.parse(line)
                    } catch {
                      return null
                    }
                  })
                  .filter(Boolean)
                
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(logs))
              } catch (e) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to get git log' }))
              }
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
    
    // Generate breadcrumbs from the actual file path
    const relativePath = pageData.relativePath
    const parts = relativePath.split('/')
    const breadcrumbs: { title: string, link?: string }[] = []
    
    let accumulatedPath = ''
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i]
      if (!part) continue
      
      // Remove .md extension
      if (part.endsWith('.md')) {
        part = part.replace('.md', '')
      }
      
      // Skip index files in breadcrumb (they represent the folder itself)
      if (part === 'index') {
        continue
      }
      
      accumulatedPath += '/' + part
      
      // Format the breadcrumb name
      const title = formatBreadcrumbName(part)
      
      // Check if this is the last meaningful part
      const remainingParts = parts.slice(i + 1).filter(p => p && p !== 'index.md' && !p.endsWith('.md'))
      const isLastItem = remainingParts.length === 0
      
      breadcrumbs.push({
        title,
        link: isLastItem ? undefined : accumulatedPath + '/'
      })
    }
    
    pageData.frontmatter.breadcrumb = breadcrumbs
    pageData.title = pageData.frontmatter.title || (breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].title : '')
  }
})
