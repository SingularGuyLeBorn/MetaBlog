/**
 * =============================================================================
 * 语雀 (Yuque) 图片操作
 * =============================================================================
 *
 * 包含图片上传到语雀 CDN。
 * =============================================================================
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { yuqueApi, translateYuqueError } from './repo'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 工具：上传图片到语雀 CDN
 *
 * 将图片上传到语雀的图床（cdn.nlark.com），返回可直接在文档中引用的 URL。
 * 上传后可在 yuque_doc_create / yuque_doc_update 的 content 中用 Markdown 图片语法引用：
 *   ![描述](https://cdn.nlark.com/...)
 *
 * 【使用示例】
 *   yuque_image_upload(image_base64="data:image/png;base64,iVBORw0KGgo...", file_name="chart.png")
 *   → 返回 { url: "https://cdn.nlark.com/yuque/0/...", filekey: "..." }
 */
export const yuqueImageUploadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_image_upload',
    description: `上传图片到语雀 CDN，获取可在文档中直接使用的图片 URL。

使用流程:
1. 调用 yuque_image_upload(image_base64="...", file_name="demo.png")
2. 获取返回的 url（如 https://cdn.nlark.com/yuque/0/...）
3. 在 yuque_doc_create / yuque_doc_update 的 content 中用 Markdown 引用:
   ![图片描述](https://cdn.nlark.com/yuque/0/...)

注意事项:
- image_base64 必须是完整的 base64 字符串，可带 data:image/...;base64, 前缀
- 支持格式: png, jpg, jpeg, gif, webp, svg
- 图片会自动上传到语雀 CDN（cdn.nlark.com），公网可访问`,
    parameters: {
      type: 'object',
      properties: {
        image_base64: {
          type: 'string',
          description: '图片的 base64 编码字符串，可包含 data:image/png;base64, 前缀',
        },
        file_name: {
          type: 'string',
          description: '图片文件名（含扩展名），如 demo.png',
        },
      },
      required: ['image_base64'],
    },
  },
}

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
      return createErrorResult(result.msg || result.message || '上传失败', '上传图片到语雀失败')
    }

    const { url, filekey, name } = result.data
    return createSuccessResult(
      result.data,
      `图片上传成功！\nURL: ${url}\nfilekey: ${filekey || 'N/A'}\n\n接下来可以在文档内容中用 Markdown 引用：\n![${name || '图片'}](${url})`,
      'yuque_image_upload'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
