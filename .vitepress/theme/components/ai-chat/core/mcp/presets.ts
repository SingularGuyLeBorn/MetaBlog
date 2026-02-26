/**
 * MCP 预设配置
 * 
 * 提供常见平台的 MCP Server 预设
 */

import type { MCPPreset } from './types'

/** 代码平台预设 */
export const codePlatformPresets: MCPPreset[] = [
  {
    id: 'github-official',
    name: 'GitHub (官方)',
    description: 'GitHub API 官方 MCP Server，支持 Issues、PRs、仓库管理等',
    icon: 'github',
    category: 'code',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@github/mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        label: 'GitHub Personal Access Token',
        type: 'password',
        description: '从 https://github.com/settings/tokens 创建'
      }
    ]
  },
  {
    id: 'gitlab-official',
    name: 'GitLab (官方)',
    description: 'GitLab API MCP Server，支持仓库、Issues、MR 管理',
    icon: 'gitlab',
    category: 'code',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@gitlab/mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'GITLAB_TOKEN',
        label: 'GitLab Access Token',
        type: 'password',
        description: '从 GitLab Profile > Access Tokens 创建'
      },
      {
        key: 'GITLAB_URL',
        label: 'GitLab URL',
        type: 'string',
        description: 'GitLab 实例地址，默认为 https://gitlab.com',
        defaultValue: 'https://gitlab.com'
      }
    ]
  },
  {
    id: 'github-custom',
    name: 'GitHub (HTTP)',
    description: '通过 HTTP 接入 GitHub API',
    icon: 'github',
    category: 'code',
    config: {
      transport: 'http',
      url: 'https://api.github.com',
      headers: {}
    },
    requiredConfig: [
      {
        key: 'Authorization',
        label: 'GitHub Token',
        type: 'password',
        description: 'Bearer token 格式: Bearer ghp_xxxxx'
      }
    ]
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    description: 'Bitbucket API MCP Server',
    icon: 'bitbucket',
    category: 'code',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@bitbucket/mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'BITBUCKET_TOKEN',
        label: 'Bitbucket Access Token',
        type: 'password'
      }
    ]
  }
]

/** 社交媒体预设 */
export const socialMediaPresets: MCPPreset[] = [
  {
    id: 'zhihu-mcp',
    name: '知乎',
    description: '知乎 MCP Server，支持搜索问题、获取回答、收藏夹管理等',
    icon: 'zhihu',
    category: 'social',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'zhihu-mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'ZHIHU_COOKIE',
        label: '知乎 Cookie',
        type: 'password',
        description: '登录知乎后从浏览器开发者工具获取 Cookie'
      }
    ]
  },
  {
    id: 'xiaohongshu-mcp',
    name: '小红书',
    description: '小红书 MCP Server，支持搜索笔记、获取详情、评论等',
    icon: 'xiaohongshu',
    category: 'social',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'xiaohongshu-mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'XIAOHONGSHU_COOKIE',
        label: '小红书 Cookie',
        type: 'password',
        description: '登录小红书后从浏览器开发者工具获取 Cookie'
      }
    ]
  },
  {
    id: 'weibo-mcp',
    name: '微博',
    description: '微博 MCP Server，支持搜索微博、获取用户信息、评论等',
    icon: 'weibo',
    category: 'social',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'weibo-mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'WEIBO_COOKIE',
        label: '微博 Cookie',
        type: 'password'
      }
    ]
  },
  {
    id: 'twitter-mcp',
    name: 'Twitter/X',
    description: 'Twitter API MCP Server',
    icon: 'twitter',
    category: 'social',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'twitter-mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'TWITTER_BEARER_TOKEN',
        label: 'Twitter Bearer Token',
        type: 'password',
        description: '从 Twitter Developer Portal 获取'
      }
    ]
  }
]

/** 开发工具预设 */
export const devToolPresets: MCPPreset[] = [
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: '浏览器自动化 MCP Server，支持网页截图、PDF 生成、爬虫等',
    icon: 'chrome',
    category: 'dev',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      env: {}
    },
    requiredConfig: []
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Playwright MCP Server，浏览器自动化测试',
    icon: 'playwright',
    category: 'dev',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@executeautomation/playwright-mcp-server'],
      env: {}
    },
    requiredConfig: []
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'PostgreSQL 数据库 MCP Server',
    icon: 'database',
    category: 'dev',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'DATABASE_URL',
        label: 'Database URL',
        type: 'string',
        description: '格式: postgresql://user:pass@host:port/db',
        defaultValue: 'postgresql://localhost:5432/mydb'
      }
    ]
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'SQLite 数据库 MCP Server',
    icon: 'database',
    category: 'dev',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'DB_PATH',
        label: 'Database Path',
        type: 'string',
        description: 'SQLite 数据库文件路径',
        defaultValue: './data.db'
      }
    ]
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Docker MCP Server，管理容器和镜像',
    icon: 'docker',
    category: 'dev',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-docker'],
      env: {}
    },
    requiredConfig: []
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'K8s MCP Server，管理集群资源',
    icon: 'kubernetes',
    category: 'dev',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-kubernetes'],
      env: {}
    },
    requiredConfig: []
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'Redis MCP Server',
    icon: 'redis',
    category: 'dev',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'redis-mcp-server'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'REDIS_URL',
        label: 'Redis URL',
        type: 'string',
        defaultValue: 'redis://localhost:6379'
      }
    ]
  }
]

/** 生产力工具预设 */
export const productivityPresets: MCPPreset[] = [
  {
    id: 'filesystem',
    name: '文件系统',
    description: '本地文件系统 MCP Server，支持文件读写、目录浏览',
    icon: 'folder',
    category: 'productivity',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
      env: {}
    },
    requiredConfig: []
  },
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'HTTP 请求 MCP Server',
    icon: 'globe',
    category: 'productivity',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-fetch'],
      env: {}
    },
    requiredConfig: []
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Brave 搜索引擎 MCP Server',
    icon: 'search',
    category: 'productivity',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'BRAVE_API_KEY',
        label: 'Brave API Key',
        type: 'password',
        description: '从 https://brave.com/search/api/ 获取'
      }
    ]
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Slack MCP Server，发送消息、管理频道',
    icon: 'slack',
    category: 'productivity',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'SLACK_BOT_TOKEN',
        label: 'Slack Bot Token',
        type: 'password'
      },
      {
        key: 'SLACK_TEAM_ID',
        label: 'Slack Team ID',
        type: 'string'
      }
    ]
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Notion MCP Server，管理页面和数据库',
    icon: 'notion',
    category: 'productivity',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-notion'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'NOTION_TOKEN',
        label: 'Notion Integration Token',
        type: 'password'
      }
    ]
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Google Drive MCP Server',
    icon: 'drive',
    category: 'productivity',
    config: {
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gdrive'],
      env: {}
    },
    requiredConfig: [
      {
        key: 'GOOGLE_CLIENT_ID',
        label: 'Google Client ID',
        type: 'string'
      },
      {
        key: 'GOOGLE_CLIENT_SECRET',
        label: 'Google Client Secret',
        type: 'password'
      },
      {
        key: 'GOOGLE_REFRESH_TOKEN',
        label: 'Google Refresh Token',
        type: 'password'
      }
    ]
  }
]

/** 所有预设 */
export const allMCPPresets: MCPPreset[] = [
  ...codePlatformPresets,
  ...socialMediaPresets,
  ...devToolPresets,
  ...productivityPresets
]

/** 按分类获取预设 */
export function getPresetsByCategory(category: MCPPreset['category']): MCPPreset[] {
  return allMCPPresets.filter(p => p.category === category)
}

/** 根据 ID 获取预设 */
export function getPresetById(id: string): MCPPreset | undefined {
  return allMCPPresets.find(p => p.id === id)
}
