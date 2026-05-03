/**
 * ============================================================================
 * 后端服务 - multimediaService
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/services
 */


import type { MessageAttachment } from '@/theme/types/chat'

/** 支持的媒体类型 */
/**
 * MediaType 类型别名
 *
 */
export type MediaType = 'image' | 'video' | 'audio' | 'file'

/**
 * 检测文件媒体类型
 */
export function detectMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

/**
 * 检查文件是否受支持
 */
export function isSupportedFile(file: File): { supported: boolean; reason?: string } {
  // 图片格式(OCR 支持的位图格式,SVG 矢量图不支持)
  const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']
  // 视频格式
  const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm']
  // 最大文件大小 (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  
  const mediaType = detectMediaType(file)
  
  // 检查大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      supported: false,
      reason: `文件过大 (${formatFileSize(file.size)}),最大支持 ${formatFileSize(MAX_FILE_SIZE)}`
    }
  }
  
  // 明确拦截 SVG(矢量图 OCR 无法处理)
  if (file.type === 'image/svg+xml') {
    return {
      supported: false,
      reason: '不支持 SVG 格式. OCR 引擎和视觉模型均无法处理矢量图,请转换为 PNG/JPEG/BMP'
    }
  }

  // 检查格式
  if (mediaType === 'image' && !SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    return {
      supported: false,
      reason: `不支持的图片格式: ${file.type}. 支持: PNG, JPEG, WebP, GIF, BMP`
    }
  }
  
  if (mediaType === 'video' && !SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
    return {
      supported: false,
      reason: `不支持的视频格式: ${file.type}. 支持: MP4, MOV, WebM`
    }
  }
  
  return { supported: true }
}

/**
 * 将文件转为 base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // 去掉 data:image/png;base64, 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 获取图片尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 获取视频信息
 */
export function getVideoInfo(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      })
      URL.revokeObjectURL(video.src)
    }
    video.onerror = reject
    video.src = URL.createObjectURL(file)
  })
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化时长
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 构建 Kimi 图片内容
 */
export function buildKimiImageContent(base64Data: string, mimeType: string) {
  return {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType};base64,${base64Data}`
    }
  }
}

/**
 * 构建 Kimi 视频内容
 */
export function buildKimiVideoContent(base64Data: string, mimeType: string) {
  return {
    type: 'video_url',
    video_url: {
      url: `data:${mimeType};base64,${base64Data}`
    }
  }
}
