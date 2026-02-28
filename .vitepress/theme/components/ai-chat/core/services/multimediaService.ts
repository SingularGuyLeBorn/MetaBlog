/**
 * 多媒体消息处理服务
 * 
 * 支持图片、视频等多媒体内容的处理和上传
 * 专为Kimi等多模态模型设计
 */

import { addLog } from './logger'

// 多媒体内容类型
export type MediaType = 'image' | 'video' | 'audio' | 'file'

// 多媒体内容项
export interface MediaContent {
  type: MediaType
  url: string
  mimeType: string
  name?: string
  size?: number
  // 图片特有
  width?: number
  height?: number
  // 视频特有
  duration?: number
  thumbnail?: string
}

// 上传的文件信息
export interface UploadedFile {
  id: string
  url: string
  name: string
  size: number
  mimeType: string
  mediaType: MediaType
  uploadedAt: number
}

// 支持的图片格式
const SUPPORTED_IMAGE_FORMATS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
]

// 支持的视频格式
const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/mpeg',
  'video/mov',
  'video/avi',
  'video/x-flv',
  'video/mpg',
  'video/webm',
  'video/wmv',
  'video/3gpp'
]

// 最大文件大小（MB）
const MAX_FILE_SIZE = {
  image: 20,  // 20MB
  video: 100, // 100MB
  audio: 20,  // 20MB
  file: 50    // 50MB
}

/**
 * 检测文件类型
 */
export function detectMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

/**
 * 检查文件是否支持
 */
export function isSupportedFile(file: File): { supported: boolean; reason?: string } {
  const mediaType = detectMediaType(file)
  
  // 检查格式
  if (mediaType === 'image' && !SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    return { 
      supported: false, 
      reason: `不支持的图片格式: ${file.type}。支持的格式: PNG, JPEG, WebP, GIF` 
    }
  }
  
  if (mediaType === 'video' && !SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
    return { 
      supported: false, 
      reason: `不支持的视频格式: ${file.type}。支持的格式: MP4, MPEG, MOV, AVI, FLV, WebM, WMV` 
    }
  }
  
  // 检查大小
  const maxSize = MAX_FILE_SIZE[mediaType] * 1024 * 1024
  if (file.size > maxSize) {
    return { 
      supported: false, 
      reason: `文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB，${mediaType}最大支持${MAX_FILE_SIZE[mediaType]}MB` 
    }
  }
  
  return { supported: true }
}

/**
 * 将文件转换为Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // 移除Data URL前缀，只保留Base64数据
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 将文件转换为Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 构建Kimi格式的图片消息内容
 */
export function buildKimiImageContent(base64Data: string, mimeType: string): {
  type: 'image_url'
  image_url: { url: string }
} {
  return {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType};base64,${base64Data}`
    }
  }
}

/**
 * 构建Kimi格式的视频消息内容
 */
export function buildKimiVideoContent(base64Data: string, mimeType: string): {
  type: 'video_url'
  video_url: { url: string }
} {
  return {
    type: 'video_url',
    video_url: {
      url: `data:${mimeType};base64,${base64Data}`
    }
  }
}

/**
 * 压缩图片
 */
export async function compressImage(
  file: File, 
  maxWidth: number = 2048, 
  maxHeight: number = 2048,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      
      // 计算缩放比例
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'))
        return
      }
      
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('图片压缩失败'))
          }
        },
        file.type,
        quality
      )
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
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
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 获取视频信息
 */
export function getVideoInfo(file: File): Promise<{
  duration: number
  width: number
  height: number
}> {
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
    
    video.onerror = () => reject(new Error('视频加载失败'))
    video.src = URL.createObjectURL(file)
  })
}

/**
 * 生成视频缩略图
 */
export function generateVideoThumbnail(
  file: File, 
  time: number = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(time, video.duration / 2)
    }
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'))
        return
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
      resolve(thumbnail)
      
      URL.revokeObjectURL(video.src)
    }
    
    video.onerror = () => reject(new Error('视频加载失败'))
    video.src = URL.createObjectURL(file)
  })
}

/**
 * 上传文件到服务器
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadedFile> {
  const formData = new FormData()
  formData.append('file', file)
  
  const mediaType = detectMediaType(file)
  
  addLog({
    level: 'info',
    category: 'media',
    component: 'multimediaService',
    event: 'upload_start',
    message: `开始上传文件: ${file.name}`,
    data: { fileName: file.name, size: file.size, type: mediaType }
  })
  
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || '上传失败')
    }
    
    const uploadedFile: UploadedFile = {
      id: result.data.id,
      url: result.data.url,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      mediaType,
      uploadedAt: Date.now()
    }
    
    addLog({
      level: 'info',
      category: 'media',
      component: 'multimediaService',
      event: 'upload_complete',
      message: `文件上传完成: ${file.name}`,
      data: { fileId: uploadedFile.id, url: uploadedFile.url }
    })
    
    return uploadedFile
    
  } catch (error) {
    addLog({
      level: 'error',
      category: 'media',
      component: 'multimediaService',
      event: 'upload_error',
      message: `文件上传失败: ${file.name}`,
      data: { error: error instanceof Error ? error.message : String(error) }
    })
    throw error
  }
}

/**
 * 从URL获取文件并转换为Base64
 */
export async function urlToBase64(url: string): Promise<{
  base64: string
  mimeType: string
  size: number
}> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const blob = await response.blob()
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    
    return {
      base64,
      mimeType: blob.type || 'application/octet-stream',
      size: blob.size
    }
    
  } catch (error) {
    throw new Error(`转换URL到Base64失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 验证图片URL是否可访问
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (!response.ok) return false
    
    const contentType = response.headers.get('content-type')
    return contentType ? contentType.startsWith('image/') : false
    
  } catch {
    return false
  }
}

/**
 * 验证视频URL是否可访问
 */
export async function validateVideoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (!response.ok) return false
    
    const contentType = response.headers.get('content-type')
    return contentType ? contentType.startsWith('video/') : false
    
  } catch {
    return false
  }
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
  if (seconds < 60) {
    return `${Math.floor(seconds)}秒`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  if (minutes < 60) {
    return `${minutes}分${remainingSeconds}秒`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}时${remainingMinutes}分${remainingSeconds}秒`
}

// ==================== 批量处理 ====================

/**
 * 批量处理多媒体文件
 */
export async function processMediaFiles(
  files: File[],
  options?: {
    compressImages?: boolean
    generateThumbnails?: boolean
    onProgress?: (index: number, total: number) => void
  }
): Promise<MediaContent[]> {
  const results: MediaContent[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    options?.onProgress?.(i + 1, files.length)
    
    const mediaType = detectMediaType(file)
    const content: MediaContent = {
      type: mediaType,
      url: URL.createObjectURL(file),
      mimeType: file.type,
      name: file.name,
      size: file.size
    }
    
    try {
      if (mediaType === 'image') {
        const dimensions = await getImageDimensions(file)
        content.width = dimensions.width
        content.height = dimensions.height
      } else if (mediaType === 'video') {
        const info = await getVideoInfo(file)
        content.duration = info.duration
        content.width = info.width
        content.height = info.height
        
        if (options?.generateThumbnails) {
          content.thumbnail = await generateVideoThumbnail(file)
        }
      }
      
      results.push(content)
      
    } catch (error) {
      console.error(`处理文件失败: ${file.name}`, error)
      results.push(content)
    }
  }
  
  return results
}
