---
title: AI 工具完整参考手�?
description: 所�?AI Agent 可用工具的详细说�?
date: 2026-02-27
tags: [tools, reference, api]
---

# AI 工具完整参考手�?

> 本文档列�?MetaBlog AI Agent 系统中所有可用工具的详细信息、使用方法和注意事项�?

---

## 📊 工具统计

| 指标 | 数�?|
|------|------|
| 总工具数 | 41 |
| 完全实现 | 25 (61%) |
| Mock 数据 | 11 (27%) |
| 部分实现 | 5 (12%) |

---

## 📚 文章管理工具

### getArticleContent
读取指定文章的完整内容,支持行号范围和元数据提取�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | �?| 文章路径,支�?URL 格式或文件路�?|
| max_length | number | �?| 最大返回字符数,默�?8000 |
| start_line | number | �?| 起始行号(从 1 开始)|
| end_line | number | �?| 结束行号 |
| include_metadata | boolean | �?| 是否包含 frontmatter 元数�?|

**示例�?*
```javascript
getArticleContent({
  path: "/sections/posts/hello-world/",
  start_line: 1,
  end_line: 50,
  include_metadata: true
})
```

**状�?*: �?完整实现

---

### searchArticles
根据关键词搜索文章,支持全文检索和分类筛选�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | �?| 搜索关键�?|
| section | string | �?| 限定搜索的分�?|
| limit | number | �?| 返回结果数量限制,默�?5 |
| include_folders | boolean | �?| 是否包含文件夹结�?|

**示例�?*
```javascript
searchArticles({
  query: "Docker",
  section: "knowledge",
  limit: 10
})
```

**状�?*: �?完整实现

---

### listArticles
列出文章目录,支持分类筛选、文件夹浏览和递归展开�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| section | string | �?| 按分类筛�?|
| folder_path | string | �?| 指定文件夹路�?|
| limit | number | �?| 返回数量限制,默�?20 |
| recursive | boolean | �?| 是否递归列出子文件夹 |
| sort_by | string | �?| 排序方式：name/date/category |

**状�?*: �?完整实现

---

### createArticle
创建新文章,自动创建父文件夹,支�?frontmatter�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | �?| 文章标题 |
| path | string | �?| 文章路径 |
| content | string | �?| 文章内容 |
| tags | array | �?| 文章标签数组 |
| category | string | �?| 文章分类 |
| overwrite | boolean | �?| 是否覆盖已存在文�?|

**状�?*: �?完整实现

---

### updateArticle
更新文章内容,支持多种更新模式(replace/append/prepend/insert)�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | �?| 文章路径 |
| content | string | �?| 新内�?|
| mode | string | �?| 更新模式：replace/append/prepend/insert |
| search_text | string | �?| 搜索定位文本(insert 模式需要)|

**状�?*: �?完整实现

---

### deleteArticle
删除文章,支持备份到回收站�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | �?| 文章路径 |
| confirm | boolean | �?| 是否确认删除 |
| backup_first | boolean | �?| 删除前是否备�?|

**状�?*: �?完整实现

---

## 🗄�?知识库工�?

### kb_list
列出所有知识库�?

**参数�?* �?

**返回�?* 知识库列表,包含名称、描述、文档数�?

**状�?*: �?完整实现(内存存储)

---

### kb_create
创建新知识库�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | �?| 知识库名称(仅字母数字下划线连字符)|
| description | string | �?| 知识库描�?|

**状�?*: �?完整实现

---

### kb_delete
删除知识库及其所有文档�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | �?| 知识库名�?|

**⚠️ 警告**: 删除后数据不可恢�?

**状�?*: �?完整实现

---

### kb_query
在知识库中搜索相关文档�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| knowledge_base_name | string | �?| 知识库名�?|
| query | string | �?| 搜索关键�?|
| limit | number | �?| 返回数量限制,默�?5 |

**状�?*: �?完整实现(关键词匹配,非向量搜索�?

---

### kb_list_documents
列出知识库中的所有文档�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| knowledge_base_name | string | �?| 知识库名�?|

**状�?*: �?完整实现

---

### kb_document_add
向知识库添加新文档�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| knowledge_base_name | string | �?| 知识库名�?|
| title | string | �?| 文档标题 |
| content | string | �?| 文档内容 |
| tags | array | �?| 文档标签列表 |

**状�?*: �?完整实现

---

### kb_document_delete
从知识库删除文档�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| knowledge_base_name | string | �?| 知识库名�?|
| document_id | string | �?| 文档 ID |

**状�?*: �?完整实现

---

## 🌐 GitHub 工具

### github_get_repo
获取 GitHub 仓库信息、统计、README 预览�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | �?| 仓库所有�?|
| repo | string | �?| 仓库名称 |
| include_readme | boolean | �?| 是否包含 README 预览,默�?true |

**状�?*: �?完整实现

**限制**: 未认证请�?60�?小时

---

### github_list_repo_contents
列出 GitHub 仓库的文件和目录内容�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | �?| 仓库所有�?|
| repo | string | �?| 仓库名称 |
| path | string | �?| 目录路径,默认根目录 |
| ref | string | �?| 分支、标签或 commit SHA |

**状�?*: �?完整实现

---

### github_get_file_content
获取 GitHub 仓库中特定文件的内容�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | �?| 仓库所有�?|
| repo | string | �?| 仓库名称 |
| path | string | �?| 文件路径 |
| ref | string | �?| 分支、标签或 commit SHA |
| max_length | number | �?| 最大返回字符数,默�?10000 |

**状�?*: �?完整实现

---

### github_search_code
�?GitHub 上搜索开源代码示例�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | �?| 搜索关键�?|
| language | string | �?| 限定编程语言 |
| limit | number | �?| 返回数量限制,默�?5 |

**状�?*: �?完整实现

---

### github_get_commit_history
查看 GitHub 仓库的提交历史�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | �?| 仓库所有�?|
| repo | string | �?| 仓库名称 |
| path | string | �?| 限定文件路径 |
| per_page | number | �?| 返回数量,默�?10 |

**状�?*: �?完整实现

---

### github_get_issues
查看 GitHub 仓库�?Issues 和讨论�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | �?| 仓库所有�?|
| repo | string | �?| 仓库名称 |
| state | string | �?| Issue 状态：open/closed/all,默�?open |
| per_page | number | �?| 返回数量,默�?10 |

**状�?*: �?完整实现

---

## 🌍 网络工具

### fetchUrl
通用 HTTP 请求工具,支持自定义 Method、Header、Body�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | �?| 目标 URL |
| method | string | �?| HTTP 方法：GET/POST/PUT/DELETE,默�?GET |
| headers | object | �?| HTTP 请求�?|
| body | string | �?| 请求体(POST/PUT 时使用)|
| timeout | number | �?| 超时时间(毫秒),默�?10000 |
| max_length | number | �?| 返回内容最大长度,默认 15000 |

**示例�?*
```javascript
fetchUrl({
  url: "https://api.github.com/users/octocat",
  method: "GET",
  headers: { "Accept": "application/json" }
})
```

**状�?*: �?完整实现

**⚠️ 限制**: 不支�?JS 渲染的页�?

---

### webSearch
网络搜索工具�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | �?| 搜索关键�?|
| num_results | number | �?| 返回结果数量,默�?5 |

**状�?*: �?Mock 数据(需接入真实搜索引擎 API�?

**建议**: 接入 SerpAPI、Google Custom Search �?Bing Search API

---

### fetchArxiv
获取 ArXiv 论文信息、摘要、PDF 链接�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| paper_id | string | �?| ArXiv 论文 ID(如 2401.12345)|
| include_abstract | boolean | �?| 是否包含摘要,默�?true |
| include_pdf | boolean | �?| 是否返回 PDF 链接,默�?true |

**状�?*: �?完整实现

---

## 📁 文件工具

### readFile
读取指定文件的内容�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | �?| 文件路径 |

**状�?*: �?完整实现

---

### writeFile
写入内容到指定文件�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | �?| 文件路径 |
| content | string | �?| 文件内容 |

**状�?*: �?完整实现

---

### listFiles
列出指定目录中的文件和文件夹�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | �?| 目录路径,默认当前目�?|
| recursive | boolean | �?| 是否递归列出子目�?|

**状�?*: �?完整实现

---

## 📝 文本处理工具

### summarizeText
对给定文本生成简短摘要�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | �?| 需要摘要的文本 |
| max_length | number | �?| 摘要最大长�?|

**状�?*: �?完整实现

---

### formatText
将文本格式化为指定格式�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | �?| 原始文本 |
| format | string | �?| 目标格式：markdown/json/yaml/html/table |

**状�?*: �?完整实现

---

### translateText
翻译文本到指定语言�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| text | string | �?| 要翻译的文本 |
| target_language | string | �?| 目标语言代码(zh/en/ja/ko/fr/de)|
| source_language | string | �?| 源语言代码(可选,自动检测)|

**状�?*: ⚠️ 依赖 AI 自身翻译能力(建议接入翻�?API�?

---

## 💻 代码工具

### executeCode
执行代码片段并返回结果�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | �?| 要执行的代码 |
| language | string | �?| 编程语言(python/javascript/bash)|

**状�?*: ⚠️ 仅在浏览器环境执行(建议后端沙箱执行�?

**⚠️ 安全警告**: 当前实现有安全风险,不应执行不受信任的代�?

---

### analyzeCode
分析代码质量、潜在问题和改进建议�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | �?| 要分析的源代�?|
| language | string | �?| 编程语言 |

**状�?*: ⚠️ 简单规则分析(建议接入 ESLint/Prettier�?

---

## 🔧 系统工具

### getCurrentTime
获取当前系统时间�?

**参数�?* �?

**返回�?* 当前时间戳、ISO 格式、本地格式化时间

**状�?*: �?完整实现

---

### getWeather
获取指定城市的天气信息�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| location | string | �?| 城市名称 |
| days | number | �?| 预报天数,默�?3 |

**状�?*: �?Mock 数据(需接入真实天气 API�?

**建议**: 接入和风天气、心知天气或 OpenWeatherMap API

---

### calculate
执行数学计算�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| expression | string | �?| 数学表达�?|

**状�?*: �?完整实现

---

### testEcho
回声测试工具,用于验证工具系统是否正常工作�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | �?| 要回显的消息 |
| repeat_count | number | �?| 重复次数,默�?1 |

**状�?*: �?完整实现

---

## 🖼�?平台解析工具

### parseZhihu
解析知乎文章内容�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | �?| 知乎文章 URL |
| max_length | number | �?| 最大返回字符数 |

**状�?*: �?完整实现

---

### parseXiaohongshu
解析小红书笔记内容�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | �?| 小红书笔�?URL |

**状�?*: �?完整实现

---

### parseWechat
解析微信公众号文章内容�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | �?| 微信文章 URL |

**状�?*: �?完整实现

---

### ocrImage
OCR 识别图片中的文字�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | �?| 图片 URL |
| base64 | string | �?| Base64 编码的图片数�?|
| language | string | �?| 识别语言,默�?auto |

**状�?*: �?Mock 数据(需接入 OCR 服务�?

**建议**: 接入百度 OCR、腾�?OCR �?PaddleOCR

---

## 📝 笔记工具

### createNote
创建一条笔记�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | �?| 笔记标题 |
| content | string | �?| 笔记内容 |
| tags | array | �?| 标签列表 |

**状�?*: �?完整实现

---

### listNotes
列出所有笔记�?

**参数�?*
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tag | string | �?| 按标签筛�?|

**状�?*: �?完整实现

---

## 📋 工具开发计�?

### 高优先级(近期实现)

| 工具 | 描述 | 预计工时 |
|------|------|----------|
| `webSearch` | 接入真实搜索引擎 API | 1 �?|
| `getWeather` | 接入天气 API | 0.5 �?|
| `ocrImage` | 接入 OCR 服务 | 1 �?|
| `compress_image` | 图片压缩 | 1 �?|
| `read_pdf` | PDF 内容提取 | 1 �?|

### 中优先级(中期实现)

| 工具 | 描述 | 预计工时 |
|------|------|----------|
| `query_database` | SQL 数据库查�?| 2 �?|
| `git_clone` | Git 克隆仓库 | 0.5 �?|
| `send_email` | 发送邮�?| 1 �?|
| `fetch_rss` | RSS 订阅获取 | 0.5 �?|
| `generate_chart` | 生成数据图表 | 1 �?|

### 低优先级(远期实现)

| 工具 | 描述 | 预计工时 |
|------|------|----------|
| `generate_image` | AI 生成图片 | 1 �?|
| `post_twitter` | 发布推文 | 0.5 �?|
| `create_calendar_event` | 创建日历事件 | 1 �?|
| `encrypt_file` | 文件加密 | 1 �?|

---

**更新日期**: 2026-02-27  
**工具版本**: v1.0.0  
**维护�?*: MetaBlog Team
