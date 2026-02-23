/**
 * 工具定义
 * 
 * 所有工具的 schema 定义，用于告诉 AI 每个工具的用途和参数
 */
import type { ToolDefinition } from './types'

// ============ 文章相关工具定义 ============

export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的内容。仅在用户要求"查看某篇文章"、"读取某篇文章"或需要基于已有文章内容回答时使用。不要主动调用此工具。',
    parameters: {
      type: 'object',
      properties: { 
        path: { 
          type: 'string', 
          description: '文章路径，例如 "knowledge/getting-started.md"' 
        },
        max_length: {
          type: 'number',
          description: '最大返回字符数，默认8000，避免消息过长'
        }
      },
      required: ['path']
    }
  }
}

export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '根据关键词搜索文章',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: '搜索关键词，例如 "深度学习"' 
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认5条' 
        }
      },
      required: ['query']
    }
  }
}

export const listArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_articles',
    description: '列出文章列表，可按分类筛选。仅在用户询问"有哪些文章"、"文章列表"或需要查找特定文章时使用。不要主动调用此工具。',
    parameters: {
      type: 'object',
      properties: {
        section: { 
          type: 'string', 
          description: '可选：按分类筛选，例如 "knowledge"、"posts"' 
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认20，最大50' 
        }
      },
      required: []
    }
  }
}

export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_article',
    description: `创建一篇新文章。当用户明确要求创建文章、写博客、新建文档时使用。

重要提示：
- path 参数必须包含文件夹和文件名，格式为 "section/filename.md"
- 例如："knowledge/transformer-detailed.md" 会在 knowledge 文件夹下创建 transformer-detailed.md
- 如果用户没有指定 section，默认使用 "knowledge" 或 "posts"
- 标题应该简洁明了，反映文章主题
- 不要主动调用此工具，除非用户明确要求创建文章`,
    parameters: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: '文章标题，例如 "Transformer 详解"' 
        },
        path: { 
          type: 'string', 
          description: '文章完整路径，格式为 "section/filename.md"，例如 "knowledge/transformer-detailed.md"' 
        },
        content: { 
          type: 'string', 
          description: '文章内容（支持 Markdown），可以包含标题、段落、代码块等' 
        }
      },
      required: ['title', 'path']
    }
  }
}

export const updateArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_article',
    description: '更新/修改已有文章的内容。当用户要求编辑、修改、更新文章时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '文章路径，例如 "posts/existing-article.md"' 
        },
        content: { 
          type: 'string', 
          description: '新的文章内容（完整替换）' 
        }
      },
      required: ['path', 'content']
    }
  }
}

export const deleteArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'delete_article',
    description: '删除文章。当用户要求删除、移除文章时使用。此操作不可逆！',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '要删除的文章路径' 
        }
      },
      required: ['path']
    }
  }
}

// ============ 系统工具定义 ============

export const getCurrentTimeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: '获取当前系统时间。当用户询问"现在几点"、"当前时间"、"今天日期"等时间相关问题时，必须调用此工具获取准确时间。',
    parameters: { type: 'object', properties: {} }
  }
}

export const testEchoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'test_echo',
    description: '【测试专用】回声工具，验证工具调用是否正常工作。当用户说"测试工具"时使用。',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '要回显的消息' },
        repeat_count: { type: 'number', description: '重复次数' }
      },
      required: ['message']
    }
  }
}

// ============ 文本处理工具定义 ============

export const summarizeTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'summarize_text',
    description: '对给定文本生成简短摘要。当用户要求"总结"、"摘要"、"概括"或文本过长需要精简时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '需要摘要的原始文本'
        },
        max_length: {
          type: 'number',
          description: '摘要最大长度（字符数），默认200'
        }
      },
      required: ['text']
    }
  }
}

export const formatTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'format_text',
    description: '将文本格式化为指定格式（Markdown、JSON、YAML、表格等）。当用户需要格式化输出或示例时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '原始文本内容'
        },
        format: {
          type: 'string',
          description: '目标格式：markdown、json、yaml、table，默认markdown',
          enum: ['markdown', 'json', 'yaml', 'table']
        }
      },
      required: ['text']
    }
  }
}

// ============ 文件操作工具定义 ============

export const readFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'read_file',
    description: '读取指定文件的内容。当用户需要查看文件内容、检查配置文件或读取代码文件时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径，例如 "docs/readme.md" 或 "src/config.ts"'
        }
      },
      required: ['path']
    }
  }
}

export const writeFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'write_file',
    description: '写入内容到指定文件。当用户需要创建新文件或覆盖现有文件时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径'
        },
        content: {
          type: 'string',
          description: '要写入的文件内容'
        }
      },
      required: ['path', 'content']
    }
  }
}

export const listFilesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_files',
    description: '列出指定目录中的文件和文件夹。当用户需要查看目录结构或浏览文件时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '目录路径，默认为当前目录'
        },
        recursive: {
          type: 'boolean',
          description: '是否递归列出子目录，默认 false'
        }
      },
      required: []
    }
  }
}

// ============ Web 与搜索工具定义 ============

export const webSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '执行网络搜索获取最新信息。当用户询问时事、需要最新数据或查询不在知识库中的信息时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        num_results: {
          type: 'number',
          description: '返回结果数量，默认 5'
        }
      },
      required: ['query']
    }
  }
}

export const fetchUrlDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_url',
    description: '获取指定 URL 的网页内容。当用户需要提供特定网页的摘要或分析网页内容时使用。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要获取的网页 URL'
        }
      },
      required: ['url']
    }
  }
}

// ============ 数学与计算工具定义 ============

export const calculateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calculate',
    description: '执行数学计算。当用户需要复杂计算、数学公式求解或单位转换时使用。',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，例如 "2 + 2 * 3" 或 "sin(30)"'
        }
      },
      required: ['expression']
    }
  }
}

// ============ 语言与翻译工具定义 ============

export const translateTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'translate_text',
    description: '翻译文本到指定语言。当用户需要翻译内容或理解外语文本时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '要翻译的文本'
        },
        target_language: {
          type: 'string',
          description: '目标语言代码，如 "zh"（中文）、"en"（英文）、"ja"（日文）、"ko"（韩文）、"fr"（法文）、"de"（德文）等'
        },
        source_language: {
          type: 'string',
          description: '源语言代码（可选，自动检测）'
        }
      },
      required: ['text', 'target_language']
    }
  }
}

// ============ 代码相关工具定义 ============

export const executeCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'execute_code',
    description: '执行代码片段并返回结果。支持 Python、JavaScript、Shell 等语言。当用户需要运行代码、测试算法或执行脚本时使用。',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要执行的代码'
        },
        language: {
          type: 'string',
          description: '编程语言，如 "python", "javascript", "bash" 等'
        }
      },
      required: ['code', 'language']
    }
  }
}

export const analyzeCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'analyze_code',
    description: '分析代码质量、潜在问题和改进建议。当用户需要代码审查、性能分析或安全检查时使用。',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要分析的源代码'
        },
        language: {
          type: 'string',
          description: '编程语言'
        }
      },
      required: ['code', 'language']
    }
  }
}

// ============ 数据与知识管理工具定义 ============

export const queryKnowledgeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'query_knowledge',
    description: '查询知识库中的信息。当用户询问项目知识、技术文档或概念解释时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '查询内容'
        }
      },
      required: ['query']
    }
  }
}

// ============ 天气与时间工具定义 ============

export const getWeatherDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: '获取指定城市的天气信息。当用户询问天气、出行建议或需要了解气候条件时使用。',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，如 "北京"、"上海"、"New York"'
        },
        days: {
          type: 'number',
          description: '预报天数，默认 3 天'
        }
      },
      required: ['city']
    }
  }
}

// ============ 笔记与待办工具定义 ============

export const createNoteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_note',
    description: '创建一条笔记。当用户需要记录信息、保存想法或创建备忘录时使用。',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '笔记标题'
        },
        content: {
          type: 'string',
          description: '笔记内容'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表'
        }
      },
      required: ['title', 'content']
    }
  }
}

export const listNotesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_notes',
    description: '列出所有笔记。当用户需要查看笔记列表或查找特定笔记时使用。',
    parameters: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: '按标签筛选（可选）'
        }
      },
      required: []
    }
  }
}

// ============ 所有工具定义列表 ============

export const allToolDefinitions = [
  getArticleContentDef,
  searchArticlesDef,
  listArticlesDef,
  createArticleDef,
  updateArticleDef,
  deleteArticleDef,
  getCurrentTimeDef,
  testEchoDef,
  summarizeTextDef,
  formatTextDef,
  readFileDef,
  writeFileDef,
  listFilesDef,
  webSearchDef,
  fetchUrlDef,
  calculateDef,
  translateTextDef,
  executeCodeDef,
  analyzeCodeDef,
  queryKnowledgeDef,
  getWeatherDef,
  createNoteDef,
  listNotesDef
]
