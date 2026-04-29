/**
 * 通用文章读取工具定义与执行器
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

export const readArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'readArticle',
    description: `【强制：看到链接时的首选动作】当用户提供任何网页链接（文章、帖子、视频页面等）时，你的第一步必须是调用 readArticle(url=链接, fetch_image_files=true 或 embed_ocr=true)。不要先搜索，不要绕路。readArticle 一步就能获取完整内容+处理图片。

【工具做了什么】
1. 获取链接对应的 HTML 页面（自动选择 HTTP 或浏览器渲染）
2. 解析出标题、作者、正文（转为 Markdown 格式）
3. 提取文章中的所有图片 URL
4. 根据你传的参数，对图片做额外处理：
   - embed_ocr=true：后端逐张下载图片 → OCR 识别文字 → 将 OCR 结果以引用块形式插入到 Markdown 对应图片位置的下方。这样即使你看不到图，也能读到图中的文字。
   - fetch_image_files=true：后端逐张下载图片 → 上传到 Kimi API → 获取 file_id → 将 Markdown 中的图片 URL 替换为 ms://file_id。这样 vision 模型就能直接"看"到原图。
5. 给 Markdown 全文每行加上行号（格式："1 | 内容"），方便你定位具体位置。

【返回什么】
- title: 文章标题
- author: 作者
- content: 带行号的 Markdown 正文（已根据参数嵌入 OCR 或替换为 ms://file_id）
- images: 原始图片 URL 列表
- image_files: 仅当 fetch_image_files=true 时返回，[{file_id, url}] 对应关系
- platform: 识别出的平台类型

【怎么选参数】
这两个参数二选一，不要同时传 true：
- 如果 system prompt 中明确写了"你是 vision 多模态模型"→ 传 fetch_image_files=true
- 如果 system prompt 中明确写了"你是文本模型"→ 传 embed_ocr=true
- 二选一即可，不要同时传两个 true。

【readArticle 返回内容为空怎么办】
如果 readArticle 返回的正文明显不完整或为空（常见于微信、知乎等反爬强的网站），重新调用 readArticle 并加参数 method="playwright"：
readArticle({"url": "链接", "method": "playwright", "fetch_image_files": true})
这样后端会用真实浏览器打开页面，绕过反爬机制，然后继续走正常的解析和 OCR/图片处理流程。

支持的平台：微信公众号、知乎、小红书、B站、微博、抖音、GitHub、CSDN、掘金、今日头条、简书、博客园、InfoQ、SegmentFault、开源中国，以及任何通用网页。`,

    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要读取的文章链接 URL'
        },
        platform: {
          type: 'string',
          description: '可选。平台类型提示（如 wechat/zhihu/xiaohongshu/bilibili 等），帮助后端选择最佳获取策略。如果不传，后端会自动从 URL 判断。'
        },
        extract_content: {
          type: 'boolean',
          description: '是否提取完整内容',
          default: true
        },
        max_content_length: {
          type: 'number',
          description: '提取内容的最大字符数',
          default: 200000
        },
        extract_images: {
          type: 'boolean',
          description: '是否提取图片链接',
          default: true
        },
        extract_comments: {
          type: 'boolean',
          description: '是否提取评论(当前版本可能为空)',
          default: false
        },
        embed_ocr: {
          type: 'boolean',
          description: '是否对文章中的图片进行 OCR 并将结果嵌入 Markdown（非 vision 模型建议开启，让 AI 能"看到"图片中的文字内容）',
          default: false
        },
        fetch_image_files: {
          type: 'boolean',
          description: '是否将文章中的图片下载并上传到 Kimi 获取 file_id（vision 模型如 Kimi 建议开启，通过 ms://file_id 直接看原图。与 embed_ocr 互斥，通常二选一）',
          default: false
        },
        method: {
          type: 'string',
          description: '获取方式。默认空（后端自动选择）。当 readArticle 返回内容为空或不完整时，可传 "playwright" 强制使用浏览器渲染获取。',
          enum: ['', 'playwright'],
          default: ''
        }
      },
      required: ['url']
    }
  }
}

export const ocrImageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'ocrImage',
    description: 'OCR 识别图片中的文字内容。支持远程图片 URL 或 base64 图片数据。',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: '图片 URL（支持微信、知乎等防盗链图片，后端自动下载识别）'
        },
        imageData: {
          type: 'string',
          description: 'Base64 编码的图片数据（用于前端本地图片）'
        }
      }
    }
  }
}

const API_BASE = '/api'

/**
 * 通用文章读取（优先调用后端 /api/platform/parse）
 */
export const readArticle: ToolExecutor = async (args) => {
  const {
    url,
    platform,
    extract_content = true,
    max_content_length = 200000,
    extract_images = true,
    extract_comments = false,
    embed_ocr = false,
    fetch_image_files = false,
    method = ''
  } = args

  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供要读取的文章链接 URL',
      '示例: readArticle(url="https://example.com")'
    )
  }

  try {
    const response = await fetch(`${API_BASE}/platform/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        platform,
        method,
        options: {
          embedOcr: embed_ocr,
          fetchImageFiles: fetch_image_files
        }
      })
    })

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '文章读取服务请求失败',
        '请检查链接是否有效或稍后重试'
      )
    }

    const result = await response.json()
    if (!result.success) {
      return createErrorResult(result.error, '文章读取失败')
    }

    const data = result.data
    let content = data.content || ''
    if (content && max_content_length) {
      content = content.slice(0, max_content_length)
    }

    return createSuccessResult(
      {
        title: data.title,
        author: data.author,
        url: data.url,
        platform: data.platform,
        content: content || undefined,
        images: extract_images ? (data.images || []) : undefined,
        imageFiles: extract_images ? (data.imageFiles || []) : undefined,
        comments: extract_comments ? (data.comments || []) : undefined,
        metadata: data.metadata,
        method: data.method
      },
      `成功读取 [${data.platform}] ${data.title}`,
      'readArticle'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '文章读取失败',
      '请检查链接是否有效或稍后重试'
    )
  }
}

/**
 * OCR 识别图片中的文字（调用本地后端 /api/ocr）
 */
export const ocrImage: ToolExecutor = async (args): Promise<ToolResult> => {
  const { imageUrl, imageData } = args

  if (!imageUrl && !imageData) {
    return createErrorResult(
      'Missing image parameter',
      '请提供图片 URL 或图片数据',
      '示例: ocrImage(imageUrl="https://example.com/image.jpg")'
    )
  }

  try {
    let response: Response

    if (imageData) {
      const base64 = imageData.replace(/^data:image\/(\w+);base64,/, '')
      const ext = RegExp.$1 || 'png'
      const byteChars = atob(base64)
      const byteArray = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i)
      }
      const blob = new Blob([byteArray], { type: `image/${ext}` })
      const formData = new FormData()
      formData.append('file', blob, `image.${ext}`)
      formData.append('language', 'auto')
      response = await fetch(`${API_BASE}/ocr`, {
        method: 'POST',
        body: formData
      })
    } else {
      response = await fetch(`${API_BASE}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl, language: 'auto' })
      })
    }

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'OCR 服务请求失败',
        '请稍后重试或检查后端服务状态'
      )
    }

    const result = await response.json()
    if (!result.success) {
      return createErrorResult(result.error, 'OCR 识别失败')
    }

    const text = result.data?.text || ''
    const engine = result.data?.engine || 'PaddleOCR'

    return createSuccessResult(
      {
        text,
        engine,
        lines: result.data?.lines?.length || 0
      },
      text ? `OCR 识别完成 (${engine})，共 ${result.data?.lines?.length || 0} 行` : '未识别到文字',
      'ocrImage',
      text || undefined
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      'OCR 请求失败',
      '请检查网络连接或后端服务是否正常运行'
    )
  }
}

