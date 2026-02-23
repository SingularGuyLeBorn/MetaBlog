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
    description: `获取指定文章的内容。仅在用户要求"查看某篇文章"、"读取某篇文章"时使用。

路径格式支持：
- URL格式："/sections/knowledge/folder/"（文件夹以/结尾，自动读取index.md）
- 文件格式："/sections/posts/article"（文件路径）
- 完整路径："sections/posts/article.md"

重要提示：
1. 使用此工具前，建议先调用 list_articles 或 search_articles 获取文章路径
2. 如果用户提供了文章标题，请先搜索获取正确的路径
3. 支持可选的起止行号参数，用于读取文章片段`,
    parameters: {
      type: 'object',
      properties: { 
        path: { 
          type: 'string', 
          description: '文章路径。支持：1）URL格式 "/sections/knowledge/folder/" 2）文件格式 "/sections/posts/article" 3）完整路径 "sections/posts/article.md"' 
        },
        max_length: {
          type: 'number',
          description: '最大返回字符数，默认8000，避免消息过长。如果文章超出此长度，会提示用户'
        },
        start_line: {
          type: 'number',
          description: '可选：起始行号（从1开始），用于读取文章片段。与 end_line 配合使用'
        },
        end_line: {
          type: 'number',
          description: '可选：结束行号，用于读取文章片段。不指定则读到文章末尾'
        },
        include_metadata: {
          type: 'boolean',
          description: '是否包含文章元数据（frontmatter），默认false'
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
    description: `根据关键词搜索文章，支持全文检索和分类筛选。

使用场景：
1. 用户想找特定主题的文章
2. 需要获取文章路径以便读取内容（配合 get_article_content 使用）
3. 在特定分类下搜索文章

返回结果包含文章路径，路径格式可直接用于 get_article_content 工具。`,
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: '搜索关键词，例如 "深度学习"、"Docker"、"Transformer"。支持模糊匹配' 
        },
        section: {
          type: 'string',
          description: '可选：限定搜索的分类，例如 "knowledge"、"posts"。不指定则搜索所有分类'
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认5条，最大20条' 
        },
        include_folders: {
          type: 'boolean',
          description: '是否包含文件夹结果，默认true。文件夹路径以/结尾'
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
    description: `列出文章列表，支持分类筛选和层级浏览。

使用场景：
1. 用户询问"有哪些文章"、"文章列表"
2. 需要获取文章路径以便读取内容（配合 get_article_content 使用）
3. 浏览知识库的层级结构
4. 查看特定分类下的所有文章

返回结果说明：
- 📄 表示文章文件，路径可直接用于 get_article_content
- 📂 表示文件夹，路径以/结尾，进入文件夹需再次调用 list_articles 或使用 get_article_content 读取其中的 index.md`,
    parameters: {
      type: 'object',
      properties: {
        section: { 
          type: 'string', 
          description: '可选：按分类筛选，例如 "knowledge"、"posts"。不指定则列出所有分类' 
        },
        folder_path: {
          type: 'string',
          description: '可选：指定文件夹路径，列出该文件夹下的内容。例如 "/sections/knowledge/ml/"'
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认20，最大100' 
        },
        recursive: {
          type: 'boolean',
          description: '是否递归列出子文件夹内容，默认false。设为true会展开所有层级'
        },
        sort_by: {
          type: 'string',
          enum: ['name', 'date', 'category'],
          description: '排序方式：name（名称）、date（修改时间）、category（分类）。默认按分类分组'
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
1. 路径格式："section/filename.md"，例如 "knowledge/transformer-detailed.md"
2. 如果指定路径的文件夹不存在，系统会自动创建
3. 支持 frontmatter 元数据，可通过 tags、category 等参数自动添加
4. 如果用户没有指定 section，默认使用 "knowledge" 或 "posts"
5. 不要主动调用此工具，除非用户明确要求创建文章
6. 创建后可返回文章路径供用户确认`,
    parameters: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: '文章标题，例如 "Transformer 详解"。会同时用于 frontmatter 和文档 H1 标题' 
        },
        path: { 
          type: 'string', 
          description: '文章完整路径，格式为 "section/filename.md"，例如 "knowledge/transformer-detailed.md"。支持嵌套路径如 "knowledge/ml/transformer.md"' 
        },
        content: { 
          type: 'string', 
          description: '文章内容（支持 Markdown）。如不提供，会创建带标题的模板内容' 
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '可选：文章标签数组，例如 ["AI", "深度学习", "Transformer"]。会添加到 frontmatter'
        },
        category: {
          type: 'string',
          description: '可选：文章分类，会添加到 frontmatter。例如 "技术", "随笔"'
        },
        author: {
          type: 'string',
          description: '可选：文章作者，默认当前用户'
        },
        create_parent_folders: {
          type: 'boolean',
          description: '是否自动创建父文件夹，默认true。如设为false且父文件夹不存在会报错'
        },
        overwrite: {
          type: 'boolean',
          description: '如果文件已存在是否覆盖，默认false。设为true会覆盖原有内容，请谨慎使用'
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
    description: `更新/修改已有文章的内容。当用户要求编辑、修改、更新文章时使用。

更新模式说明：
1. 完整替换（默认）：replace=true，用新内容完全替换旧内容
2. 增量更新：replace=false + position，在指定位置插入或追加内容
3. 部分修改：配合 start_line/end_line 实现行级替换

重要提示：
- 更新前建议先读取文章确认内容
- 大型文章更新建议先备份或分块修改
- 更新后会保留原有 frontmatter（除非显式修改）`,
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '文章路径。支持URL格式 "/sections/posts/article" 或文件路径 "sections/posts/article.md"' 
        },
        content: { 
          type: 'string', 
          description: '新的文章内容。根据 mode 参数决定是完整替换还是部分更新' 
        },
        mode: {
          type: 'string',
          enum: ['replace', 'append', 'prepend', 'insert'],
          description: '更新模式：replace（完整替换，默认）、append（追加到末尾）、prepend（插入到开头）、insert（插入到指定位置）'
        },
        position: {
          type: 'number',
          description: '插入位置（字符索引），仅在 mode=insert 时有效。0 表示开头，-1 表示末尾'
        },
        after_section: {
          type: 'string',
          description: '可选：指定在某个章节标题后插入内容。例如 "## 引言"，会找到该标题并在其后插入'
        },
        preserve_frontmatter: {
          type: 'boolean',
          description: '是否保留原有 frontmatter，默认true。设为false会用新内容的frontmatter替换'
        },
        dry_run: {
          type: 'boolean',
          description: '是否仅预览变更而不实际保存，默认false。设为true会返回预览内容供确认'
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
    description: `删除文章或文件夹。当用户要求删除、移除文章时使用。

重要警告：
1. 此操作不可逆，删除后无法恢复
2. 删除文件夹会同时删除其所有子文件和子文件夹
3. 支持安全模式，删除前会要求二次确认
4. 建议删除前先读取文章确认内容

使用建议：
- 删除单篇文章：提供文章路径
- 删除整个文件夹：提供文件夹路径（以/结尾）
- 批量删除：需多次调用或使用通配符（如支持）`,
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '要删除的文章或文件夹路径。支持：1）文章路径 "/sections/posts/article" 2）文件夹路径 "/sections/knowledge/old-folder/"' 
        },
        confirm: {
          type: 'boolean',
          description: '是否确认删除，默认false。作为安全机制，某些实现可能要求此参数为true才执行删除'
        },
        delete_empty_parent: {
          type: 'boolean',
          description: '删除后如果父文件夹为空，是否同时删除父文件夹，默认false'
        },
        backup_first: {
          type: 'boolean',
          description: '删除前是否创建备份，默认false。设为true会在删除前备份到 .trash 目录'
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
    description: `获取指定 URL 的网页内容。支持静态网页、API 接口、JSON 数据等。

使用场景：
1. 获取网页内容进行摘要分析
2. 调用 REST API 获取数据
3. 获取原始代码文件内容
4. 获取文档、博客、新闻等内容

支持自动内容类型识别：HTML、JSON、纯文本等。`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要获取的 URL，支持 http/https。例如：https://api.github.com/users/octocat'
        },
        method: {
          type: 'string',
          description: 'HTTP 方法：GET、POST、PUT、DELETE 等，默认 GET',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'GET'
        },
        headers: {
          type: 'object',
          description: '可选：自定义 HTTP 请求头，如 {"Authorization": "Bearer token"}'
        },
        body: {
          type: 'string',
          description: '可选：请求体内容，用于 POST/PUT/PATCH 请求'
        },
        timeout: {
          type: 'number',
          description: '请求超时时间（毫秒），默认 10000（10秒）'
        },
        max_length: {
          type: 'number',
          description: '返回内容最大长度（字符），默认 15000'
        }
      },
      required: ['url']
    }
  }
}

// ============ GitHub 工具定义 ============

export const githubGetRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_repo',
    description: `获取 GitHub 仓库信息。查看仓库详情、统计信息、最近更新等。

使用场景：
1. 了解一个开源项目的基本信息
2. 查看仓库的 Star 数、Fork 数、语言分布
3. 获取 README 内容摘要
4. 查看最近的提交活动

示例：
- 查看 React 仓库：owner="facebook", repo="react"
- 查看 VS Code：owner="microsoft", repo="vscode"`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者（用户名或组织名），例如 "facebook"、"microsoft"、"vercel"'
        },
        repo: {
          type: 'string',
          description: '仓库名称，例如 "react"、"vscode"、"next.js"'
        },
        include_readme: {
          type: 'boolean',
          description: '是否获取并返回 README 内容摘要，默认 true'
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListRepoContentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_repo_contents',
    description: `列出 GitHub 仓库的文件和目录内容。浏览代码结构、查找特定文件。

使用场景：
1. 浏览仓库的目录结构
2. 查找特定的源代码文件
3. 了解项目组织结构
4. 定位配置文件（package.json、tsconfig.json 等）

示例：
- 查看根目录：owner="facebook", repo="react", path=""
- 查看 src 目录：owner="facebook", repo="react", path="src"
- 查看特定文件：owner="facebook", repo="react", path="README.md"`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者'
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        path: {
          type: 'string',
          description: '目录或文件路径，默认空字符串（根目录）。例如 "src"、"docs"、"package.json"'
        },
        ref: {
          type: 'string',
          description: '分支、标签或 commit SHA，默认主分支（main/master）'
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubGetFileContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_file_content',
    description: `获取 GitHub 仓库中特定文件的内容。读取源代码、配置文件等。

使用场景：
1. 查看源代码实现
2. 读取配置文件（package.json、.gitignore 等）
3. 学习优秀的代码示例
4. 查看文档文件

注意：
- 文件路径需要包含完整的相对路径
- 支持获取文件的原始内容（自动解码 base64）
- 可以指定特定分支或 commit`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者'
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        path: {
          type: 'string',
          description: '文件路径，例如 "src/index.ts"、"package.json"、"README.md"'
        },
        ref: {
          type: 'string',
          description: '分支、标签或 commit SHA，默认主分支'
        },
        max_length: {
          type: 'number',
          description: '返回内容最大长度，默认 10000 字符'
        }
      },
      required: ['owner', 'repo', 'path']
    }
  }
}

export const githubSearchCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_search_code',
    description: `在 GitHub 上搜索代码。查找开源项目中的代码示例、特定实现。

使用场景：
1. 查找特定函数的代码实现示例
2. 搜索开源项目中的最佳实践
3. 查找特定语言/框架的使用示例
4. 学习如何解决特定问题

搜索语法：
- 关键词搜索："useState hook"
- 限定语言："quickSort language:python"
- 限定仓库："apiCall repo:facebook/react"
- 限定路径："config path:src"`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询，支持 GitHub 代码搜索语法。例如 "useEffect cleanup"、"language:typescript react hooks"'
        },
        language: {
          type: 'string',
          description: '可选：限定编程语言，例如 "javascript"、"python"、"typescript"、"go"'
        },
        limit: {
          type: 'number',
          description: '返回结果数量，默认 5，最大 10'
        }
      },
      required: ['query']
    }
  }
}

export const githubGetCommitHistoryDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_commit_history',
    description: `获取 GitHub 仓库的提交历史。查看最近的代码变更、提交信息。

使用场景：
1. 了解项目最近的发展动态
2. 查看特定功能的实现历史
3. 追踪 bug 修复记录
4. 了解贡献者活动`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者'
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        path: {
          type: 'string',
          description: '可选：限定特定文件或目录的提交历史'
        },
        per_page: {
          type: 'number',
          description: '返回的提交数量，默认 10，最大 30'
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubGetIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_issues',
    description: `获取 GitHub 仓库的 Issues。查看问题、bug 报告、功能请求。

使用场景：
1. 了解项目已知的问题
2. 查看功能请求和讨论
3. 了解社区反馈
4. 查看问题的解决方案`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者'
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        state: {
          type: 'string',
          description: 'Issue 状态：open（开放）、closed（已关闭）、all（全部），默认 open',
          enum: ['open', 'closed', 'all'],
          default: 'open'
        },
        per_page: {
          type: 'number',
          description: '返回数量，默认 10，最大 30'
        }
      },
      required: ['owner', 'repo']
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
  // GitHub 工具
  githubGetRepoDef,
  githubListRepoContentsDef,
  githubGetFileContentDef,
  githubSearchCodeDef,
  githubGetCommitHistoryDef,
  githubGetIssuesDef,
  // 其他工具
  calculateDef,
  translateTextDef,
  executeCodeDef,
  analyzeCodeDef,
  queryKnowledgeDef,
  getWeatherDef,
  createNoteDef,
  listNotesDef
]
