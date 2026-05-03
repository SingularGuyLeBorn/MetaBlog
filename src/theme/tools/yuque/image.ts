/**
 * ============================================================================
 * 语雀(Yuque)图片操作工具
 * ============================================================================
 *
 * 提供图片上传到语雀 CDN(cdn.nlark.com) 的能力,返回可在文档中直接
 * 引用的公网图片 URL. 上传后可在 yuqueDocCreate / yuqueDocUpdate 的
 * content 中用 Markdown 图片语法引用. 
 *
 * @module src/theme/tools/yuque/image
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { translateYuqueError, yuqueApi } from './repo'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 上传图片到语雀 CDN 的工具定义
 *
 * 将图片上传到语雀的图床(cdn.nlark.com),返回可直接在文档中引用的 URL. 
 * 上传后可在 yuqueDocCreate / yuqueDocUpdate 的 content 中用 Markdown 图片语法引用：
 *   ![描述](https://cdn.nlark.com/...)
 *
 * 使用示例：
 *   yuqueImageUpload(image_base64="data:image/png;base64,iVBORw0KGgo...", file_name="chart.png")
 *   → 返回 { url: "https://cdn.nlark.com/yuque/0/...", filekey: "..." }
 */
export const yuqueImageUploadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueImageUpload',
    description: `【功能】上传图片到语雀 CDN,获取可在文档中直接引用的公网图片 URL. 

【使用场景】
- 用户要在语雀文档中插入本地图片时,先调用本工具上传图片获取 URL
- 生成图表、截图等需要嵌入语雀文档时调用

【使用流程】
1. 调用 yuqueImageUpload(image_base64="...", file_name="demo.png")
2. 获取返回的 url(如 https://cdn.nlark.com/yuque/0/...)
3. 在 yuqueDocCreate / yuqueDocUpdate 的 content 中用 Markdown 引用：
   ![图片描述](https://cdn.nlark.com/yuque/0/...)

【注意事项】
- image_base64 必须是完整的 base64 编码字符串,可包含 data:image/png;base64, 前缀
- 支持的图片格式: png, jpg, jpeg, gif, webp, svg
- 图片上传后会存储在语雀 CDN(cdn.nlark.com),公网可访问
- 如果未提供 file_name,默认使用 "image.png"`,
    parameters: {
      type: 'object',
      properties: {
        image_base64: {
          type: 'string',
          description: '图片的 base64 编码字符串. 可包含 data:image/png;base64, 前缀,也可只传纯 base64 内容. 示例: "data:image/png;base64,iVBORw0KGgo..."',
        },
        file_name: {
          type: 'string',
          description: '图片文件名,需包含扩展名,如 "demo.png"、"chart.jpg". 用于语雀识别图片类型,默认值为 "image.png"',
        },
      },
      required: ['image_base64'],
    },
  },
}

/**
 * 上传图片到语雀 CDN
 *
 * @param args - 包含 image_base64、file_name 参数
 * @returns 上传结果,包含 url 和 filekey
 */
export const yuqueImageUpload = async (args: Record<string, any>): Promise<ToolResult> => {
  const { image_base64, file_name } = args

  if (!image_base64) {
    return createErrorResult('Missing image_base64', '缺少图片数据', '请提供 image_base64 参数')
  }

  try {
    const result = await yuqueApi('POST', '/image/upload', {
      image_base64,
      file_name: file_name || 'image.png',
    })

    if (result.code !== 0 || !result.data?.url) {
      return createErrorResult(result.msg || result.message || '上传失败', '上传图片到语雀失败', undefined, result.status || result.code)
    }

    const { url, filekey, name } = result.data
    return createSuccessResult(
      result.data,
      `图片上传成功！\nURL: ${url}\nfilekey: ${filekey || 'N/A'}\n\n接下来可以在文档内容中用 Markdown 引用：\n![${name || '图片'}](${url})`,
      'yuqueImageUpload'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
