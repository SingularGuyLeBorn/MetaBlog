/**
 * 示例工作流：社交平台内容 → Google Docs
 * 
 * 展示如何结合使用：
 * - AgentReach (browser-automation): 浏览社交平台
 * - Google Workspace: 创建和管理文档
 * - MetaAgent: 编排整个流程
 */

import { browserAutomation } from '../mcp-tools/browser-automation'
import { googleWorkspace } from '../mcp-tools/google-workspace'

export interface SocialToDocWorkflow {
  id: string
  name: string
  sources: {
    platform: 'xiaohongshu' | 'bilibili' | 'twitter' | 'zhihu'
    urls: string[]
  }[]
  output: {
    type: 'doc' | 'sheet'
    title: string
    folderId?: string
  }
  options: {
    takeScreenshots: boolean
    scrollCount: number
    includeStats: boolean
    format: 'detailed' | 'summary'
  }
}

export interface WorkflowExecutionResult {
  workflowId: string
  success: boolean
  documents: {
    source: string
    platform: string
    title: string
    url: string
    contentLength: number
    screenshot?: string
  }[]
  summary: {
    totalSources: number
    successCount: number
    failedCount: number
    googleDocUrl?: string
  }
  executedAt: string
}

/**
 * 示例：让 Agent 刷小红书，然后自动创建 Google 文档
 */
export async function demoXiaohongshuToGoogle() {
  console.log('🚀 启动工作流：小红书 → Google Docs\n')

  // Step 1: 配置 Google Workspace（演示模式）
  googleWorkspace.setAuth({
    email: 'agent@metablog.ai',
    // 没有 accessToken，会使用 browser 模式
  })

  console.log('📧 Google Workspace 认证状态:', googleWorkspace.getAuthStatus())

  // Step 2: 刷小红书（AgentReach）
  const xhsUrl = 'https://www.xiaohongshu.com/explore/65a1b2c3d4e5f6g7h8i9j0k1'
  
  console.log('👁️ Agent 开始浏览小红书:', xhsUrl)
  
  const browseResult = await browserAutomation.execute({
    url: xhsUrl,
    platform: 'xiaohongshu',
    takeScreenshots: true,
    scrollCount: 3,
    waitTime: 2000,
  })

  if (!browseResult.success) {
    console.error('❌ 浏览失败:', browseResult.error)
    return
  }

  console.log('✅ 浏览完成')
  console.log('📸 截图数量:', browseResult.screenshots.length)
  console.log('📝 提取内容:', {
    title: browseResult.content?.title,
    author: browseResult.content?.author,
    textLength: browseResult.content?.text.length,
    images: browseResult.content?.images.length,
  })

  // Step 3: 自动创建 Google 文档
  console.log('\n📝 创建 Google 文档...')
  
  const docResult = await googleWorkspace.collectSocialToDoc(
    xhsUrl,
    'xiaohongshu',
    `小红书采集 - ${browseResult.content?.title?.slice(0, 30)}...`
  )

  if (docResult.success) {
    console.log('✅ Google 文档创建成功!')
    console.log('📄 文档标题:', docResult.data.document.title)
    console.log('🔗 文档链接:', docResult.data.document.url)
  } else {
    console.error('❌ 创建文档失败:', docResult.error)
  }

  return {
    browseResult,
    docResult,
  }
}

/**
 * 示例：批量采集多个平台到 Google Sheets
 */
export async function demoMultiPlatformToSheets() {
  console.log('🚀 启动工作流：多平台采集 → Google Sheets\n')

  const sources = [
    { platform: 'xiaohongshu' as const, url: 'https://xhslink.com/xxx' },
    { platform: 'bilibili' as const, url: 'https://b23.tv/yyy' },
    { platform: 'twitter' as const, url: 'https://twitter.com/user/status/zzz' },
  ]

  // 创建表格
  console.log('📊 创建 Google Sheets...')
  const sheetResult = await googleWorkspace.createSpreadsheet({
    title: `多平台内容采集 ${new Date().toLocaleDateString()}`,
    sheets: ['小红书', 'B站', 'Twitter', '汇总'],
  })

  if (!sheetResult.success) {
    console.error('❌ 创建表格失败')
    return
  }

  console.log('✅ 表格创建成功:', sheetResult.data.url)
  const spreadsheetId = sheetResult.data.id

  // 添加表头
  await googleWorkspace.appendToSheet({
    spreadsheetId,
    sheetName: '汇总',
    values: ['平台', '标题', '作者', '点赞', '评论', '链接', '采集时间'],
  })

  // 采集每个平台
  for (const source of sources) {
    console.log(`\n👁️ 采集 ${source.platform}...`)
    
    const result = await browserAutomation.execute({
      url: source.url,
      platform: source.platform,
      takeScreenshots: false,
      scrollCount: 2,
    })

    if (result.success && result.content) {
      // 写入汇总表
      await googleWorkspace.appendToSheet({
        spreadsheetId,
        sheetName: '汇总',
        values: [
          source.platform,
          result.content.title,
          result.content.author || 'Unknown',
          result.content.stats?.likes || 0,
          result.content.stats?.comments || 0,
          source.url,
          new Date().toISOString(),
        ],
      })

      console.log(`✅ ${source.platform} 已写入表格`)
    } else {
      console.error(`❌ ${source.platform} 采集失败`)
    }
  }

  console.log('\n🎉 批量采集完成!')
  console.log('📊 表格链接:', sheetResult.data.url)

  return {
    spreadsheetId,
    url: sheetResult.data.url,
  }
}

/**
 * 示例：定时监控（MetaAgent 调度）
 */
export function setupScheduledCollection() {
  console.log('⏰ 设置定时采集任务\n')

  // 这是一个示例配置，展示如何用 MetaAgent 调度
  const scheduleConfig = {
    name: '每日小红书热门采集',
    cron: '0 9 * * *',  // 每天上午9点
    workflow: {
      sources: [
        { platform: 'xiaohongshu', keyword: 'AI工具', limit: 10 },
        { platform: 'xiaohongshu', keyword: '效率神器', limit: 10 },
      ],
      output: {
        type: 'sheet' as const,
        title: `小红书热门 ${new Date().toLocaleDateString()}`,
      },
    },
  }

  console.log('📅 定时任务配置:', scheduleConfig)
  console.log('🤖 MetaAgent 将在每天 9:00 自动执行')
  console.log('🔍 搜索关键词:', scheduleConfig.workflow.sources.map(s => s.keyword).join(', '))

  return scheduleConfig
}

/**
 * 完整的 Agent 配置示例
 */
export const agentConfigurationExample = {
  // Agent 身份
  identity: {
    name: 'Social Content Collector',
    email: 'collector@metablog.ai',
    permissions: {
      canBrowse: true,
      canWrite: true,
      allowedPlatforms: ['xiaohongshu', 'bilibili', 'twitter', 'zhihu'],
    },
  },

  // 工具配置
  tools: {
    browser: {
      useBrowserMode: true,
      takeScreenshots: true,
      scrollCount: 3,
      waitTime: 2000,
    },
    googleWorkspace: {
      useBrowserMode: true,  // 通过浏览器自动登录
      defaultFolder: 'MetaBlog/自动采集',
    },
  },

  // 工作流配置
  workflows: [
    {
      name: '小红书每日精选',
      trigger: 'schedule',  // schedule | manual | webhook
      cron: '0 9 * * *',
      steps: [
        { tool: 'browser', action: 'browse', platform: 'xiaohongshu' },
        { tool: 'browser', action: 'extract' },
        { tool: 'googleWorkspace', action: 'createDoc' },
      ],
    },
  ],
}

// 导出使用示例
console.log(`
╔══════════════════════════════════════════════════════════════╗
║  AgentReach + Google Workspace 组合使用示例                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. 单条内容采集 → Google Doc                               ║
║     demoXiaohongshuToGoogle()                               ║
║                                                              ║
║  2. 批量采集 → Google Sheets                                ║
║     demoMultiPlatformToSheets()                             ║
║                                                              ║
║  3. 设置定时任务                                            ║
║     setupScheduledCollection()                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`)
