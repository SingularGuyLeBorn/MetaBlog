/**
 * MetaUniverse Agent Configuration
 * Agent 系统配置文件 - 后台任务、信源、定时规则等
 * 
 * 修改此文件后需要重启服务生效
 */

/** @type {import('./config/types').AgentConfig} */
export const agentConfig = {
  /**
   * ============================================
   * Task 2C: 后台任务配置 (Background Tasks)
   * ============================================
   */
  tasks: {
    /**
     * Arxiv 论文摘要任务配置
     */
    arxivDigest: {
      enabled: true,
      
      /** Arxiv API 配置 */
      api: {
        baseUrl: 'http://export.arxiv.org/api/query',
        timeout: 30000,
        maxResults: 50
      },
      
      /** 抓取分类 (见 https://arxiv.org/category_taxonomy) */
      categories: [
        'cs.AI',      // 人工智能
        'cs.CL',      // 计算与语言 (NLP)
        'cs.LG',      // 机器学习
        'cs.CV',      // 计算机视觉
        'cs.IR',      // 信息检索
        'cs.DB'       // 数据库
      ],
      
      /** 抓取参数 */
      fetch: {
        maxPapers: 10,
        dateRange: 'last_week',  // last_day | last_week | last_month
        sortBy: 'submittedDate', // submittedDate | lastUpdatedDate | relevance
        sortOrder: 'descending'
      },
      
      /** 内容生成配置 */
      content: {
        targetPath: 'posts/ai-digest/',
        template: 'arxiv-digest',
        generateSummary: true,
        summaryMaxLength: 500,
        includeAbstract: true,
        includeAuthors: true,
        includeLinks: true
      },
      
      /** 定时规则 (cron 表达式，当前为手动触发预留) */
      schedule: {
        enabled: false,  // 当前手动触发，后续设为 true 启用定时
        cron: '0 9 * * 1'  // 每周一上午 9:00
      }
    },

    /**
     * RSS 新闻聚合任务配置
     */
    rssAggregator: {
      enabled: true,
      
      /** RSS 信源列表 */
      feeds: [
        {
          name: 'Hacker News',
          url: 'https://news.ycombinator.com/rss',
          category: 'tech-news',
          enabled: true,
          weight: 1.0
        },
        {
          name: 'Dev.to',
          url: 'https://dev.to/feed',
          category: 'dev-community',
          enabled: true,
          weight: 0.8
        },
        {
          name: 'CSS-Tricks',
          url: 'https://css-tricks.com/feed/',
          category: 'frontend',
          enabled: true,
          weight: 0.7
        },
        {
          name: 'Smashing Magazine',
          url: 'https://www.smashingmagazine.com/feed/',
          category: 'design',
          enabled: true,
          weight: 0.6
        }
      ],
      
      /** 内容筛选 */
      filter: {
        /** 关键词筛选 (为空则不过滤) */
        keywords: ['AI', 'LLM', 'Web Development', 'React', 'Vue', 'TypeScript'],
        /** 最少字符数 */
        minContentLength: 100,
        /** 排除的关键词 */
        excludeKeywords: ['NSFW', 'adult', 'gambling'],
        /** 去重窗口 (天数) */
        dedupWindowDays: 7
      },
      
      /** 抓取参数 */
      fetch: {
        timeout: 15000,
        maxRetries: 2,
        userAgent: 'MetaUniverse-Agent/1.0',
        concurrent: 3
      },
      
      /** 内容生成配置 */
      content: {
        targetPath: 'posts/news/',
        template: 'news-digest',
        maxArticles: 5,
        groupBySource: false,
        includeExcerpt: true,
        excerptLength: 200
      },
      
      /** 定时规则 */
      schedule: {
        enabled: false,
        cron: '0 */6 * * *'  // 每 6 小时
      }
    },

    /**
     * 代码文档生成任务配置
     */
    codeDocs: {
      enabled: true,
      
      /** 扫描路径 */
      source: {
        /** 代码库根目录 */
        basePath: './code/',
        /** 文件匹配模式 */
        include: ['**/*.py', '**/*.ts', '**/*.js', '**/*.vue'],
        /** 排除模式 */
        exclude: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*', '**/dist/**']
      },
      
      /** 解析配置 */
      parser: {
        extractComments: true,
        extractTypes: true,
        extractFunctions: true,
        extractClasses: true
      },
      
      /** 输出配置 */
      output: {
        targetPath: 'knowledge/code-docs/',
        format: 'markdown',
        singleFile: false,  // false = 每个源文件一个文档
        includeSourceLinks: true
      },
      
      /** 定时规则 */
      schedule: {
        enabled: false,
        cron: '0 2 * * 0'  // 每周日凌晨 2:00
      }
    },

    /**
     * 内容清理任务配置
     */
    contentCleanup: {
      enabled: true,
      
      /** 检查项目 */
      checks: {
        orphanLinks: true,      // 孤立链接
        emptyFolders: true,     // 空文件夹
        brokenImages: true,     // 损坏的图片引用
        duplicateTags: true,    // 重复标签
        unusedAssets: false     // 未使用的资源 (谨慎开启)
      },
      
      /** 修复选项 */
      repair: {
        autoFix: false,         // 自动修复 (需谨慎)
        moveToArchive: true,    // 将孤儿内容移到归档
        archivePath: '_archive/'
      },
      
      /** 定时规则 */
      schedule: {
        enabled: false,
        cron: '0 3 1 * *'  // 每月 1 日凌晨 3:00
      }
    }
  },

  /**
   * ============================================
   * 内容生成配置
   * ============================================
   */
  content: {
    /** 默认 frontmatter 模板 */
    defaultFrontmatter: {
      author: 'MetaUniverse Agent',
      tags: ['auto-generated']
    },
    
    /** 文章模板 */
    templates: {
      'arxiv-digest': {
        layout: 'post',
        tags: ['arxiv', 'ai', 'paper-digest'],
        category: 'ai-digest'
      },
      'news-digest': {
        layout: 'post',
        tags: ['news', 'tech'],
        category: 'news'
      }
    }
  },

  /**
   * ============================================
   * LLM 配置
   * ============================================
   */
  llm: {
    /** 默认模型 */
    defaultModel: 'deepseek-chat',
    
    /** 任务特定模型选择 */
    taskModels: {
      arxivDigest: 'deepseek-chat',
      rssAggregator: 'deepseek-chat',
      codeDocs: 'deepseek-coder'
    },
    
    /** 生成参数 */
    generation: {
      temperature: 0.7,
      maxTokens: 4000,
      topP: 0.9
    }
  }
}

/**
 * 获取合并后的任务配置
 * 支持从环境变量覆盖配置
 */
export function getTaskConfig(taskType) {
  const baseConfig = agentConfig.tasks[taskType]
  if (!baseConfig) {
    throw new Error(`Unknown task type: ${taskType}`)
  }

  // 环境变量覆盖 (格式: AGENT_TASK_ARXIVDIGEST_MAXPAPERS=20)
  const envPrefix = `AGENT_TASK_${taskType.toUpperCase()}_`
  const envOverrides = {}
  
  for (const [key, value] of Object.entries(process.env || {})) {
    if (key.startsWith(envPrefix)) {
      const configKey = key.slice(envPrefix.length).toLowerCase()
      try {
        envOverrides[configKey] = JSON.parse(value)
      } catch {
        envOverrides[configKey] = value
      }
    }
  }

  return {
    ...baseConfig,
    ...envOverrides
  }
}

export default agentConfig
