/**
 * 平台解析工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const parseZhihuDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parse_zhihu',
    description: '解析知乎文章或回答的内容，提取标题、作者、正文等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '知乎文章或回答的完整 URL，如 https://zhuanlan.zhihu.com/p/xxxx'
        }
      },
      required: ['url']
    }
  }
}

export const parseXiaohongshuDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parse_xiaohongshu',
    description: '解析小红书笔记内容，提取描述、图片等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '小红书分享链接'
        }
      },
      required: ['url']
    }
  }
}

export const parseWechatDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parse_wechat',
    description: '解析微信公众号文章内容，提取标题、公众号名称、正文等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '微信公众号文章链接，如 https://mp.weixin.qq.com/s/xxx'
        }
      },
      required: ['url']
    }
  }
}

export const parsePlatformLinkDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parse_platform_link',
    description: `通用平台链接解析，支持多种平台的内容提取。

支持的平台：
- 社交媒体：知乎、小红书、微博
- 技术社区：GitHub、CSDN、掘金
- 新闻资讯：公众号、今日头条
- 其他：任何有公开元数据的网页

自动识别平台类型并调用相应的解析器。`,
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
        }
      },
      required: ['url']
    }
  }
}

export const ocrImageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'ocr_image',
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
    name: 'process_image',
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
