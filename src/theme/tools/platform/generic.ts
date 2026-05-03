/**
 * ============================================================================
 * 通用文章读取与 OCR 工具
 * ============================================================================
 *
 * 提供通用网页文章读取(readArticle)和图片 OCR 识别(ocrImage)能力. 
 * readArticle 支持多种平台(微信、知乎、小红书、B站等),后端自动检测平台
 * 并选择最佳解析策略. ocrImage 支持远程图片 URL 和 Base64 编码图片. 
 *
 * @module src/theme/tools/platform/generic
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/**
 * 通用文章读取工具定义
 */
export const readArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'readArticle',
    description: `读取指定网页链接的文章内容,提取标题、作者、正文(转为 Markdown),并可选择处理文章中的图片. \n\n【什么时候调用】\n- 用户提供了任何网页链接并要求"看看这篇文章"、"总结一下"、"分析这个帖子"\n- 用户要求读取微信公众号、知乎、小红书、B站专栏、CSDN、掘金等平台内容\n- 需要基于网页内容回答用户问题\n\n【核心流程】\n1. 获取网页 HTML(自动选择 HTTP 抓取或浏览器渲染)\n2. 解析标题、作者、正文(转为带行号的 Markdown)\n3. 提取图片 URL\n4. 根据参数对图片做额外处理(见下方参数说明)\n\n【图片处理参数(二选一,不要同时传 true)】\n- fetch_image_files=true：下载图片上传到 Kimi API → 图片替换为 ms://file_id(vision 模型可用)\n- embed_ocr=true：下载图片 OCR 识别文字 → 将文字插入 Markdown 图片下方(文本模型可用)\n\n【内容为空或不完整怎么办】\n微信、知乎等反爬强的网站可能返回空内容,此时重新调用并加 method="playwright"：\nreadArticle(url="链接", method="playwright", fetch_image_files=true)\n\n【支持平台】\n微信公众号、知乎、小红书、B站、微博、抖音、GitHub、CSDN、掘金、今日头条、简书、博客园、InfoQ、SegmentFault、开源中国及通用网页. `,

    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要读取的文章/网页链接 URL. 要求：完整的 http:// 或 https:// 链接. 示例："https://zhuanlan.zhihu.com/p/123456"'
        },
        platform: {
          type: 'string',
          description: '平台类型提示(可选). 帮助后端选择最佳解析策略. 后端会自动从 URL 判断,通常无需手动指定. 可选值：wechat、zhihu、xiaohongshu、bilibili、weibo、douyin、github、csdn、juejin 等. '
        },
        extract_content: {
          type: 'boolean',
          description: '是否提取完整正文内容. 默认 true. ',
          default: true
        },
        max_content_length: {
          type: 'number',
          description: '提取正文的最大字符数限制. 默认 200000. 如文章极长可适当调高,但可能影响性能. ',
          default: 200000
        },
        extract_images: {
          type: 'boolean',
          description: '是否提取文章中的图片链接列表. 默认 true. ',
          default: true
        },
        extract_comments: {
          type: 'boolean',
          description: '是否提取评论区内容. 默认 false(当前版本可能返回空). ',
          default: false
        },
        embed_ocr: {
          type: 'boolean',
          description: '是否对图片进行 OCR 并将识别结果嵌入 Markdown 正文(文本模型建议开启). 与 fetch_image_files 互斥. 默认 false. ',
          default: false
        },
        fetch_image_files: {
          type: 'boolean',
          description: '是否下载图片并替换为 ms://file_id(vision 模型建议开启). 与 embed_ocr 互斥. 默认 false. ',
          default: false
        },
        method: {
          type: 'string',
          description: '获取方式. 默认空字符串(后端自动选择). 当内容为空或不完整时,传 "playwright" 强制使用浏览器渲染绕过反爬. 可选值："" 或 "playwright". 默认 "". ',
          enum: ['', 'playwright'],
          default: ''
        }
      },
      required: ['url']
    }
  }
}

/**
 * OCR 图片识别工具定义
 */
export const ocrImageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'ocrImage',
    description: `对图片进行 OCR 文字识别,提取图片中的文本内容. \n\n【什么时候调用】\n- 用户提供了图片并要求"识别图中文字"、"这张图写了什么"\n- 用户发送了包含文字的图片(截图、海报、文档扫描件等)\n- 文章中的图片包含重要文字信息,需要提取出来\n\n【支持输入方式】\n- 远程图片 URL(支持微信、知乎等防盗链图片,后端自动处理)\n- Base64 编码的图片数据(用于前端本地图片)\n\n【示例用法】\n- ocrImage(imageUrl="https://example.com/image.jpg")\n- ocrImage(imageData="data:image/png;base64,iVBORw0KGgo...")\n\n【注意事项】\n- imageUrl 和 imageData 至少提供一个\n- 识别结果包含文本内容和按行分割的结果\n- 对复杂排版(如表格、多栏)识别效果可能有限\n- 图片质量过低或文字过小会影响识别准确率`,
    parameters: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: '远程图片的 URL 地址. 支持微信、知乎等防盗链图片,后端会自动下载并识别. 示例："https://mmbiz.qpic.cn/xxx/123.jpg"'
        },
        imageData: {
          type: 'string',
          description: 'Base64 编码的图片数据(含 data:image/xxx;base64, 前缀). 用于前端本地选择的图片文件. 与 imageUrl 二选一. '
        }
      }
    }
  }
}

/** 后端 API 基础路径 */
const API_BASE = '/api'

/**
 * 通用文章读取执行器
 *
 * 优先调用后端 /api/platform/parse 进行文章解析,支持多种平台和解析策略. 
 * 对反爬强的网站可指定 method="playwright" 使用浏览器渲染. 
 *
 * @param args - 包含 url、platform、extract_content、max_content_length 等参数
 * @returns 文章解析结果,包含标题、作者、正文、图片等
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
 * OCR 识别图片中的文字
 *
 * 调用本地后端 /api/ocr 进行文字识别. 
 * 支持远程图片 URL 和 Base64 编码图片两种输入方式. 
 *
 * @param args - 包含 imageUrl、imageData 参数
 * @returns OCR 识别结果,包含文本、引擎、行数
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
      // 将 Base64 转换为 Blob 后通过 FormData 上传
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
      text ? `OCR 识别完成 (${engine}),共 ${result.data?.lines?.length || 0} 行` : '未识别到文字',
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
