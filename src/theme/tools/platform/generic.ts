/**
 * 通用平台工具定义与执行器
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

export const parsePlatformLinkDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parsePlatformLink',
    description: `通用平台链接解析，支持多种平台的内容提取。

支持的平台：
- 社交媒体：知乎、小红书、微博、抖音
- 技术社区：GitHub、CSDN、掘金、B站
- 新闻资讯：公众号、今日头条
- 其他：任何有公开元数据的网页

自动识别平台类型并调用相应的解析器。优先使用后端统一解析服务，获取更完整的结构化数据。`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要解析的平台链接 URL'
        },
        extract_content: {
          type: 'boolean',
          description: '是否提取完整内容',
          default: true
        },
        max_content_length: {
          type: 'number',
          description: '提取内容的最大长度',
          default: 5000
        },
        extract_images: {
          type: 'boolean',
          description: '是否提取图片链接',
          default: false
        },
        extract_comments: {
          type: 'boolean',
          description: '是否提取评论(当前版本可能为空)',
          default: false
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
    description: 'OCR 识别图片中的文字内容。',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: '图片 URL'
        },
        imageData: {
          type: 'string',
          description: 'Base64 编码的图片数据'
        }
      }
    }
  }
}

export const processImageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'processImage',
    description: `处理用户上传的图片。分析图片内容、提取文字、生成描述等。

支持的操作：
- describe: 描述图片内容
- ocr: 提取图片中的文字
- analyze: 深度分析图片

注意：深度分析需要配置 Vision API。`,
    parameters: {
      type: 'object',
      properties: {
        image_url: {
          type: 'string',
          description: '图片的 URL 或 base64 编码数据'
        },
        operation: {
          type: 'string',
          description: '处理方式',
          enum: ['describe', 'ocr', 'analyze'],
          default: 'describe'
        },
        prompt: {
          type: 'string',
          description: '额外的处理提示'
        }
      },
      required: ['image_url']
    }
  }
}

const API_BASE = '/api'

/**
 * 通用平台链接解析(优先调用后端 /api/platform/parse)
 */
export const parsePlatformLink: ToolExecutor = async (args) => {
  const { url, extract_content = true, max_content_length = 5000, extract_images = false, extract_comments = false } = args

  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供要解析的链接 URL',
      '示例: parsePlatformLink(url="https://example.com")'
    )
  }

  // 优先调用后端统一解析器
  try {
    const response = await fetch(`${API_BASE}/platform/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '平台解析服务请求失败',
        '请检查链接是否有效或稍后重试'
      )
    }

    const result = await response.json()
    if (!result.success) {
      return createErrorResult(result.error, '平台解析失败')
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
        comments: extract_comments ? (data.comments || []) : undefined,
        metadata: data.metadata,
        method: data.method
      },
      `成功解析 [${data.platform}] ${data.title}`,
      'parsePlatformLink'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '链接解析失败',
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
    let blob: Blob
    let filename = 'image.png'

    if (imageData) {
      // Base64 → Blob
      const base64 = imageData.replace(/^data:image\/(\w+);base64,/, '')
      const ext = RegExp.$1 || 'png'
      filename = `image.${ext}`
      const byteChars = atob(base64)
      const byteArray = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i)
      }
      blob = new Blob([byteArray], { type: `image/${ext}` })
    } else {
      // 从 URL 下载
      const resp = await fetch(imageUrl)
      if (!resp.ok) {
        return createErrorResult(
          `HTTP ${resp.status}`,
          '下载图片失败',
          '请检查图片 URL 是否有效'
        )
      }
      blob = await resp.blob()
      // 从 URL 或 Content-Type 推断扩展名
      const urlExt = imageUrl.split('?')[0].split('.').pop()
      if (urlExt && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(urlExt.toLowerCase())) {
        filename = `image.${urlExt}`
      } else {
        const ct = blob.type || 'image/png'
        const ext = ct.split('/')[1] || 'png'
        filename = `image.${ext}`
      }
    }

    const formData = new FormData()
    formData.append('file', blob, filename)
    formData.append('language', 'auto')

    const response = await fetch(`${API_BASE}/ocr`, {
      method: 'POST',
      body: formData
    })

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

/**
 * 处理图片
 */
export const processImage: ToolExecutor = async (args) => {
  const { image_url, operation = 'describe', prompt } = args

  if (!image_url) {
    return createErrorResult(
      'Missing image_url parameter',
      '请提供图片 URL',
      '示例: processImage(image_url="https://example.com/image.jpg", operation="describe")'
    )
  }

  try {
    // 获取图片信息
    const response = await fetch(image_url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type') || 'unknown'
    const contentLength = response.headers.get('content-length')
    const size = contentLength ? `${(parseInt(contentLength) / 1024).toFixed(1)} KB` : '未知'

    switch (operation) {
      case 'ocr':
        return await ocrImage({ imageUrl: image_url })

      case 'describe':
      case 'analyze':
      default:
        return createSuccessResult(
          {
            format: contentType,
            size,
            url: image_url,
            note: '深度图像分析需要接入 Vision API(如 GPT-4V、Claude 3 Vision)',
            capabilities: [
              '获取图片元数据(格式、尺寸、大小)',
              'OCR 文字识别(使用 ocr 操作)',
              '图片 URL 可以直接在对话中显示'
            ]
          },
          `图片信息: ${contentType}`,
          'processImage',
          '如需深度分析，请配置 Vision API'
        )
    }
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '图片处理失败',
      '请检查图片 URL 是否有效'
    )
  }
}
