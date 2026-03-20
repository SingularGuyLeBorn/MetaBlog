<!--
  ChatInput - 智能输入框（支持多模态）
  支持图片/视频上传、附件预览、多模态输入
-->
<template>
  <div class="chat-input-enhanced">
    <!-- 附件预览区域 -->
    <TransitionGroup name="attachments" tag="div" class="attachments-preview" v-if="attachments.length > 0">
      <div
        v-for="(attachment, index) in attachments"
        :key="attachment.id"
        class="attachment-item"
        :class="[attachment.type, { uploading: attachment.uploadStatus === 'uploading' }]"
      >
        <!-- 图片预览 -->
        <template v-if="attachment.type === 'image'">
          <img :src="attachment.url" :alt="attachment.name" />
          <div class="attachment-overlay">
            <span class="attachment-name">{{ attachment.name }}</span>
            <button class="remove-btn" @click="removeAttachment(index)">
              <Icon name="x" :size="14" />
            </button>
          </div>
        </template>
        
        <!-- 视频预览 -->
        <template v-else-if="attachment.type === 'video'">
          <video :src="attachment.url" />
          <div class="attachment-overlay">
            <Icon name="play-circle" :size="24" class="video-icon" />
            <span class="attachment-name">{{ attachment.name }}</span>
            <span v-if="attachment.duration" class="attachment-duration">
              {{ formatDuration(attachment.duration) }}
            </span>
            <button class="remove-btn" @click="removeAttachment(index)">
              <Icon name="x" :size="14" />
            </button>
          </div>
        </template>
        
        <!-- 文件预览 -->
        <template v-else>
          <div class="file-preview">
            <Icon :name="getFileIcon(attachment.mimeType)" :size="32" />
            <div class="file-info">
              <span class="file-name">{{ attachment.name }}</span>
              <span class="file-size">{{ formatFileSize(attachment.size || 0) }}</span>
            </div>
          </div>
          <button class="remove-btn" @click="removeAttachment(index)">
            <Icon name="x" :size="14" />
          </button>
        </template>
        
        <!-- 上传进度 -->
        <div v-if="attachment.uploadStatus === 'uploading'" class="upload-progress">
          <div class="progress-bar" :style="{ width: attachment.progress + '%' }" />
        </div>
      </div>
      
      <!-- 添加更多附件按钮 -->
      <button
        v-if="attachments.length < maxAttachments"
        key="add-more"
        class="add-attachment-btn"
        @click="triggerFileInput"
      >
        <Icon name="plus" :size="24" />
        <span>添加</span>
      </button>
    </TransitionGroup>
    
    <!-- 主输入区域 -->
    <div class="input-container-3d" :class="{ focused: isFocused, 'has-attachments': attachments.length > 0 }">
      <!-- 附件按钮 -->
      <div class="attach-menu-wrapper">
        <button 
          class="attach-btn-3d" 
          @click="toggleAttachMenu"
          :disabled="attachments.length >= maxAttachments"
        >
          <Icon name="paperclip" :size="20" />
        </button>
        
        <!-- 附件菜单 -->
        <Transition name="menu">
          <div v-if="showAttachMenu" class="attach-menu">
            <button class="menu-item" @click="triggerImageInput">
              <Icon name="image" :size="18" />
              <span>图片</span>
              <span class="menu-hint">支持 PNG, JPG, WebP, GIF</span>
            </button>
            <button class="menu-item" @click="triggerVideoInput">
              <Icon name="video" :size="18" />
              <span>视频</span>
              <span class="menu-hint">支持 MP4, MOV, WebM</span>
            </button>
            <button class="menu-item" @click="triggerFileInput">
              <Icon name="file" :size="18" />
              <span>文件</span>
              <span class="menu-hint">任何类型</span>
            </button>
            <button class="menu-item" @click="showLinkInput = true">
              <Icon name="link" :size="18" />
              <span>链接</span>
              <span class="menu-hint">图片/视频URL</span>
            </button>
          </div>
        </Transition>
      </div>
      
      <!-- 文本输入 -->
      <div class="input-wrapper">
        <MentionInput
          ref="mentionInputRef"
          v-model="inputValue"
          :placeholder="getPlaceholder()"
          :selected-skill="effectiveSkill"
          @skill-change="handleSkillChange"
          @mentions-change="handleMentionsChange"
          @send="handleSend"
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </div>
      
      <!-- 发送/停止按钮 -->
      <button
        v-if="isStreaming"
        class="send-btn-3d stop"
        @click="$emit('stop')"
      >
        <Icon name="square" :size="18" />
      </button>
      <button
        v-else
        class="send-btn-3d"
        :disabled="!canSend"
        @click="handleSend"
      >
        <Icon name="send" :size="20" />
      </button>
    </div>
    
    <!-- 输入提示 -->
    <div class="input-hint-3d">
      <span class="hint-key">Enter</span>
      <span>发送 ·</span>
      <span class="hint-key">Shift+Enter</span>
      <span>换行 ·</span>
      <span class="hint-key">/</span>
      <span>技能 ·</span>
      <span class="hint-key">@</span>
      <span>引用</span>
      <span v-if="attachments.length > 0" class="hint-separator">·</span>
      <span v-if="attachments.length > 0" class="hint-attachments">
        {{ attachments.length }}/{{ maxAttachments }} 附件
      </span>
      <span v-if="supportsVision" class="model-badge vision">👁️ 视觉</span>
      <span v-if="supportsVideo" class="model-badge video">🎬 视频</span>
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      multiple
      style="display: none"
      @change="handleFileSelect($event, 'image')"
    />
    <input
      ref="videoInputRef"
      type="file"
      accept="video/mp4,video/mov,video/webm,video/avi"
      multiple
      style="display: none"
      @change="handleFileSelect($event, 'video')"
    />
    <input
      ref="fileInputRef"
      type="file"
      multiple
      style="display: none"
      @change="handleFileSelect($event, 'file')"
    />
    
    <!-- 链接输入弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showLinkInput" class="link-input-modal" @click.self="showLinkInput = false">
          <div class="link-input-content">
            <h4>添加链接</h4>
            <input
              v-model="linkUrl"
              type="text"
              placeholder="粘贴图片或视频URL..."
              @keyup.enter="addLinkAttachment"
            />
            <div class="link-input-actions">
              <button class="btn-secondary" @click="showLinkInput = false">取消</button>
              <button class="btn-primary" @click="addLinkAttachment" :disabled="!isValidUrl(linkUrl)">
                添加
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '../../../../shared/components'
import MentionInput, { type Mention } from '../../../../shared/components/MentionInput.vue'
import type { Skill } from '../../types/agent'
import type { MessageAttachment } from '../../types/chat'
import { 
  detectMediaType, 
  isSupportedFile, 
  getImageDimensions, 
  getVideoInfo,
  formatFileSize,
  formatDuration 
} from '../../api/services/multimediaService'

const props = defineProps<{
  modelValue: string
  isStreaming: boolean
  selectedSkill?: Skill
  supportsVision?: boolean
  supportsVideo?: boolean
  maxAttachments?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': [content: string, attachments: MessageAttachment[], skill?: Skill]
  'stop': []
  'selectSkill': [skill: Skill | undefined]
}>()

// 配置
const maxAttachments = computed(() => props.maxAttachments || 10)

// Refs
const mentionInputRef = ref<InstanceType<typeof MentionInput>>()
const imageInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()

// 状态
const inputValue = ref(props.modelValue)
const currentSkill = ref<Skill | undefined>()
const currentMentions = ref<Mention[]>([])
const isFocused = ref(false)
const attachments = ref<MessageAttachment[]>([])
const showAttachMenu = ref(false)
const showLinkInput = ref(false)
const linkUrl = ref('')

// 计算属性
const effectiveSkill = computed(() => props.selectedSkill || currentSkill.value)

const canSend = computed(() => {
  const hasText = inputValue.value.trim().length > 0
  const hasAttachments = attachments.value.length > 0
  return (hasText || hasAttachments) && !props.isStreaming
})

// 方法
function getPlaceholder(): string {
  if (props.isStreaming) {
    return 'AI 思考中，可继续输入下一条...'
  }
  if (attachments.value.length > 0) {
    return '添加描述（可选），按 Enter 发送...'
  }
  return '输入消息，/ 选择技能，@ 引用文章，按 Enter 发送...'
}

function toggleAttachMenu() {
  showAttachMenu.value = !showAttachMenu.value
}

function triggerImageInput() {
  imageInputRef.value?.click()
  showAttachMenu.value = false
}

function triggerVideoInput() {
  videoInputRef.value?.click()
  showAttachMenu.value = false
}

function triggerFileInput() {
  fileInputRef.value?.click()
  showAttachMenu.value = false
}

// 文件选择处理
async function handleFileSelect(event: Event, expectedType: 'image' | 'video' | 'file') {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return

  for (const file of Array.from(files)) {
    if (attachments.value.length >= maxAttachments.value) {
      alert(`最多只能上传 ${maxAttachments.value} 个附件`)
      break
    }

    // 检查文件类型
    const mediaType = detectMediaType(file)
    const check = isSupportedFile(file)
    
    if (!check.supported) {
      alert(check.reason)
      continue
    }
    
    // 检查模型是否支持该媒体类型
    if (mediaType === 'image' && !props.supportsVision) {
      alert('当前模型不支持图片输入。请切换到 Kimi 系列模型以使用视觉功能。')
      continue
    }
    if (mediaType === 'video' && !props.supportsVideo) {
      alert('当前模型不支持视频输入。请使用 kimi-k2.5 模型以使用视频功能。')
      continue
    }

    // 创建附件对象
    const attachment: MessageAttachment = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: mediaType,
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      uploadStatus: 'pending'
    }

    // 获取额外信息
    try {
      if (mediaType === 'image') {
        const dims = await getImageDimensions(file)
        attachment.width = dims.width
        attachment.height = dims.height
      } else if (mediaType === 'video') {
        const info = await getVideoInfo(file)
        attachment.duration = info.duration
        attachment.width = info.width
        attachment.height = info.height
      }
    } catch (e) {
      console.error('获取文件信息失败:', e)
    }

    attachments.value.push(attachment)
    
    // 模拟上传（实际项目中应该调用uploadFile）
    simulateUpload(attachment)
  }

  // 清空input，允许重复选择相同文件
  input.value = ''
}

// 模拟上传
function simulateUpload(attachment: MessageAttachment) {
  attachment.uploadStatus = 'uploading'
  attachment.progress = 0
  
  const interval = setInterval(() => {
    attachment.progress = (attachment.progress || 0) + Math.random() * 30
    if (attachment.progress >= 100) {
      attachment.progress = 100
      clearInterval(interval)
      attachment.uploadStatus = 'completed'
    }
  }, 200)
}

// 添加链接附件
async function addLinkAttachment() {
  if (!isValidUrl(linkUrl.value)) return
  
  const url = linkUrl.value
  const isImage = await isImageUrl(url)
  const isVideo = !isImage && await isVideoUrl(url)
  
  const attachment: MessageAttachment = {
    id: `link_${Date.now()}`,
    type: isImage ? 'image' : isVideo ? 'video' : 'link',
    name: isImage ? '图片链接' : isVideo ? '视频链接' : '链接',
    url: url,
    uploadStatus: 'completed'
  }
  
  attachments.value.push(attachment)
  linkUrl.value = ''
  showLinkInput.value = false
}

// 移除附件
function removeAttachment(index: number) {
  const attachment = attachments.value[index]
  if (attachment.url.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.url)
  }
  attachments.value.splice(index, 1)
}

// 获取文件图标
function getFileIcon(mimeType?: string): string {
  if (!mimeType) return 'file'
  if (mimeType.includes('pdf')) return 'file-text'
  if (mimeType.includes('word')) return 'file-text'
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'table'
  if (mimeType.includes('code')) return 'code'
  return 'file'
}

// URL验证
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

async function isImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    return contentType?.startsWith('image/') || false
  } catch {
    // 根据扩展名判断
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
  }
}

async function isVideoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    return contentType?.startsWith('video/') || false
  } catch {
    return /\.(mp4|mov|webm|avi|mkv)$/i.test(url)
  }
}

// 发送处理
async function handleSend() {
  if (!canSend.value) return
  
  let finalContent = inputValue.value.trim()
  
  // 处理引用
  if (currentMentions.value.length > 0) {
    const references: string[] = []
    
    for (const mention of currentMentions.value) {
      try {
        // 从 docs 目录读取文章
        const response = await fetch(`/api/files/read?path=${encodeURI('docs/' + mention.path)}`)
        if (response.ok) {
          const content = await response.text()
          references.push(`<reference title="${mention.title}" path="${mention.path}">\n${content}\n</reference>`)
        }
      } catch (e) {
        console.error('[ChatInput] Failed to load mention:', mention.path)
      }
    }
    
    if (references.length > 0) {
      finalContent = `${finalContent}\n\n---\n引用资料：\n\n${references.join('\n\n')}\n---`
    }
  }
  
  // 发送消息
  const skillInfo = effectiveSkill.value ? {
    id: effectiveSkill.value.id,
    name: effectiveSkill.value.name,
    icon: effectiveSkill.value.icon,
    content: effectiveSkill.value.content
  } as Skill : undefined
  
  emit('send', finalContent, attachments.value, skillInfo)
  
  // 重置状态
  inputValue.value = ''
  currentSkill.value = undefined
  currentMentions.value = []
  
  // 清理附件blob URL
  attachments.value.forEach(att => {
    if (att.url.startsWith('blob:')) {
      URL.revokeObjectURL(att.url)
    }
  })
  attachments.value = []
  
  emit('selectSkill', undefined)
  mentionInputRef.value?.clearAll()
}

function handleSkillChange(skill: Skill | null) {
  currentSkill.value = skill || undefined
  emit('selectSkill', skill || undefined)
}

function handleMentionsChange(mentions: Mention[]) {
  currentMentions.value = mentions
}

// 监听
watch(() => props.modelValue, (val) => {
  if (val !== inputValue.value) {
    inputValue.value = val
  }
})
watch(inputValue, (val) => emit('update:modelValue', val))
watch(() => props.selectedSkill, (skill) => {
  if (skill && mentionInputRef.value) {
    mentionInputRef.value.setSelectedSkill(skill)
  }
})

// 点击外部关闭菜单
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.attach-menu-wrapper')) {
      showAttachMenu.value = false
    }
  })
}

defineExpose({ focus() { mentionInputRef.value?.focus() } })
</script>

<style scoped>
.chat-input-enhanced {
  position: relative;
  padding: 16px 24px 20px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, #f1f5f9 100%);
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  backdrop-filter: blur(10px);
}

/* 附件预览区域 */
.attachments-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.attachment-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.3s ease;
}

.attachment-item.image,
.attachment-item.video {
  cursor: pointer;
}

.attachment-item.image img,
.attachment-item.video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-item.uploading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.attachment-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.attachment-item:hover .attachment-overlay {
  opacity: 1;
}

.attachment-name {
  font-size: 11px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-duration {
  font-size: 10px;
  color: rgba(255,255,255,0.8);
  margin-top: 2px;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}

.attachment-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.8);
}

.video-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  opacity: 0.9;
}

/* 文件预览 */
.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 8px;
  color: #64748b;
}

.file-info {
  margin-top: 4px;
  text-align: center;
}

.file-name {
  font-size: 10px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.file-size {
  font-size: 9px;
  color: #94a3b8;
}

/* 上传进度 */
.upload-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0,0,0,0.1);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

/* 添加附件按钮 */
.add-attachment-btn {
  width: 100px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s;
}

.add-attachment-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.add-attachment-btn span {
  font-size: 11px;
}

/* 动画 */
.attachments-enter-active,
.attachments-leave-active {
  transition: all 0.3s ease;
}

.attachments-enter-from,
.attachments-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* 输入容器 */
.input-container-3d {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.input-container-3d.has-attachments {
  border-radius: 20px;
}

.input-container-3d:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.06),
    0 16px 40px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.input-container-3d.focused {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 
    0 0 0 4px rgba(59, 130, 246, 0.1),
    0 12px 32px rgba(59, 130, 246, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
}

/* 附件菜单 */
.attach-menu-wrapper {
  position: relative;
}

.attach-btn-3d {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.attach-btn-3d:hover:not(:disabled) {
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
  transform: scale(1.05);
}

.attach-btn-3d:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.attach-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  z-index: 100;
  min-width: 180px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.2s;
  color: #334155;
}

.menu-item:hover {
  background: #f1f5f9;
}

.menu-item span:first-of-type {
  font-size: 14px;
  font-weight: 500;
}

.menu-hint {
  margin-left: auto;
  font-size: 11px;
  color: #94a3b8;
}

.menu-enter-active,
.menu-leave-active {
  transition: all 0.2s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* 输入区域 */
.input-wrapper {
  flex: 1;
  min-width: 0;
}

/* 发送按钮 */
.send-btn-3d {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.4),
    0 8px 24px rgba(59, 130, 246, 0.2);
}

.send-btn-3d:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 
    0 8px 20px rgba(59, 130, 246, 0.5),
    0 16px 40px rgba(59, 130, 246, 0.3);
}

.send-btn-3d:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.send-btn-3d.stop {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 
    0 4px 12px rgba(239, 68, 68, 0.4),
    0 8px 24px rgba(239, 68, 68, 0.2);
  animation: pulse-stop 1.5s ease-in-out infinite;
}

@keyframes pulse-stop {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(0.95); }
}

/* 提示文字 */
.input-hint-3d {
  text-align: center;
  margin-top: 10px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.hint-key {
  display: inline-block;
  padding: 2px 6px;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 5px;
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.hint-separator {
  color: #cbd5e1;
}

.hint-attachments {
  color: #3b82f6;
  font-weight: 600;
}

.model-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.model-badge.vision {
  background: linear-gradient(135deg, #dbeafe, #e0e7ff);
  color: #3b82f6;
}

.model-badge.video {
  background: linear-gradient(135deg, #fce7f3, #fae8ff);
  color: #db2777;
}

/* 链接输入弹窗 */
.link-input-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.link-input-content {
  background: white;
  border-radius: 16px;
  padding: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.25);
}

.link-input-content h4 {
  margin: 0 0 16px;
  color: #1e293b;
  font-size: 16px;
}

.link-input-content input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
  margin-bottom: 16px;
}

.link-input-content input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.link-input-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-secondary,
.btn-primary {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .link-input-content,
.modal-leave-to .link-input-content {
  transform: scale(0.95);
}
</style>
