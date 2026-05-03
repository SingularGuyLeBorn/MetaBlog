<!--
  ChatInput - 智能输入框(支持多模态)
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
    
    <!-- 队列预览（默认折叠） -->
    <div v-if="props.taskQueue && props.taskQueue.length > 0" class="queue-preview">
      <div class="queue-header" @click="queueExpanded = !queueExpanded">
        <span class="queue-header-icon">📋</span>
        <span class="queue-header-text">队列 ({{ props.taskQueue.length }})</span>
        <span class="queue-header-toggle">{{ queueExpanded ? '收起' : '展开' }}</span>
      </div>
      <Transition name="queue-expand">
        <div v-show="queueExpanded" class="queue-list">
          <div
            v-for="(task, index) in props.taskQueue"
            :key="task.id"
            class="queue-item"
          >
            <span class="queue-index">{{ index + 1 }}</span>
            <template v-if="editingQueueIndex === index">
              <input
                ref="(el) => { if (el) queueEditInputs[index] = el as HTMLInputElement }"
                v-model="editingQueueContent"
                class="queue-edit-input"
                @keydown.enter="saveQueueEdit(index)"
                @keydown.esc="cancelQueueEdit"
                @blur="saveQueueEdit(index)"
              />
            </template>
            <template v-else>
              <span class="queue-content" @click="startQueueEdit(index, task.content)">{{ task.content.slice(0, 40) }}{{ task.content.length > 40 ? '...' : '' }}</span>
            </template>
            <span v-if="task.attachments.length > 0" class="queue-attachments">📎{{ task.attachments.length }}</span>
            <button class="queue-remove" @click.stop="$emit('removeFromQueue', index)">
              <Icon name="x" :size="12" />
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 主输入区域 -->
    <div class="input-container-3d" :class="{ focused: isFocused, 'has-attachments': attachments.length > 0, 'has-queue': props.taskQueue && props.taskQueue.length > 0, recording: isRecording }">
      <!-- 语音按钮 -->
      <button
        class="voice-btn-3d"
        :class="{ recording: isRecording, transcribing: isTranscribing }"
        :disabled="isStreaming || isTranscribing"
        @click="toggleRecording"
        :title="isRecording ? '点击停止录音' : '点击开始语音输入'"
      >
        <Icon :name="isRecording ? 'square' : 'mic'" :size="20" />
        <span v-if="isTranscribing" class="voice-spinner"></span>
      </button>

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
              <span class="menu-hint" :class="{ ocr: !props.supportsVision }">
                {{ props.supportsVision ? '支持识图' : 'OCR 提取' }}
              </span>
            </button>
            <button class="menu-item" @click="triggerVideoInput">
              <Icon name="video" :size="18" />
              <span>视频</span>
              <span class="menu-hint ocr">暂不支持</span>
            </button>
            <button class="menu-item" @click="triggerFileInput">
              <Icon name="file" :size="18" />
              <span>文件</span>
              <span class="menu-hint">仅保存</span>
            </button>
            <!-- 链接功能已由 readArticle 工具覆盖,此处不再提供 -->
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
          :skills="skills"
          :is-streaming="isStreaming"
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
      <template v-if="!isStreaming">
        <span class="hint-key">Ctrl+Enter</span>
        <span>发送 ·</span>
        <span class="hint-key">Shift+Enter</span>
        <span>换行 ·</span>
        <span class="hint-key">/</span>
        <span>技能 ·</span>
        <span class="hint-key">@</span>
        <span>引用 ·</span>
        <span class="hint-key">Mic</span>
        <span>语音</span>
      </template>
      <template v-else>
        <span class="hint-key" style="color: #f59e0b;">处理中</span>
        <span>Ctrl+Enter 加入队列 · 点击 ⏹ 停止</span>
        <span v-if="taskQueue && taskQueue.length > 0" class="queue-badge">队列 {{ taskQueue.length }} 条</span>
      </template>
      <span v-if="attachments.length > 0" class="hint-separator">·</span>
      <span v-if="attachments.length > 0" class="hint-attachments">
        {{ attachments.length }}/{{ maxAttachments }} 附件
      </span>
      <span class="hint-separator">·</span>
      <span class="hint-tokens">{{ inputTokenCount }} tokens</span>
      <span v-if="supportsVision" class="model-badge vision">👁️ 视觉</span>
      <span v-if="supportsVideo" class="model-badge video">🎬 视频</span>
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
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
    
    <!-- 链接输入已由 readArticle 工具覆盖 -->
  </div>
</template>

<script setup lang="ts">
import {
    detectMediaType,
    formatDuration,
    formatFileSize,
    getImageDimensions,
    getVideoInfo,
    isSupportedFile
} from '@/theme/api/services/multimediaService'
import { Icon } from '@/theme/components/common'
import MentionInput, { type Mention } from '@/theme/components/common/MentionInput.vue'
import type { Skill } from '@/theme/types/agent'
import type { MessageAttachment } from '@/theme/types/chat'
import { useVoice } from '@/theme/composables/useVoice'
import { estimateTextTokens } from '@/theme/utils/tokenEstimator'
import { computed, ref, watch } from 'vue'

interface QueuedTask {
  id: string
  content: string
  attachments: MessageAttachment[]
  skillInfo?: Skill
}

const props = defineProps<{
  modelValue: string
  isStreaming: boolean
  taskQueue?: QueuedTask[]
  selectedSkill?: Skill
  skills?: Skill[]
  supportsVision?: boolean
  supportsVideo?: boolean
  maxAttachments?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': [content: string, attachments: MessageAttachment[], skill?: Skill]
  'stop': []
  'selectSkill': [skill: Skill | undefined]
  'removeFromQueue': [index: number]
  'updateQueueItem': [index: number, content: string]
}>()

// 配置
const maxAttachments = computed(() => props.maxAttachments || 10)

// Refs
const mentionInputRef = ref<InstanceType<typeof MentionInput>>()
const imageInputRef = ref<HTMLInputElement>()
const videoInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()

// 语音
const { status: voiceStatus, startRecording, stopRecording, transcribeAudio } = useVoice()

// 状态
const inputValue = ref(props.modelValue)
const currentSkill = ref<Skill | undefined>()
const currentMentions = ref<Mention[]>([])
const isFocused = ref(false)
const attachments = ref<MessageAttachment[]>([])
const showAttachMenu = ref(false)
const queueExpanded = ref(false)
const editingQueueIndex = ref<number | null>(null)
const editingQueueContent = ref('')
const queueEditInputs = ref<Record<number, HTMLInputElement>>({})

// 计算属性
const effectiveSkill = computed(() => props.selectedSkill || currentSkill.value)

const canSend = computed(() => {
  const hasText = inputValue.value.trim().length > 0
  const hasAttachments = attachments.value.length > 0
  // AI 处理中仍可输入,消息会自动加入队列
  return hasText || hasAttachments
})

const isRecording = computed(() => voiceStatus.value === 'recording')
const isTranscribing = computed(() => voiceStatus.value === 'transcribing')

const inputTokenCount = computed(() => {
  const text = inputValue.value.trim()
  if (!text && attachments.value.length === 0) return 0
  let count = estimateTextTokens(text)
  // 附件图片占位 token
  const imageCount = attachments.value.filter(a => a.type === 'image').length
  count += imageCount * 500
  return count
})

// 方法
function getPlaceholder(): string {
  if (props.isStreaming) {
    const queueHint = props.taskQueue && props.taskQueue.length > 0
      ? ` · 队列中还有 ${props.taskQueue.length} 条`
      : ''
    return `AI 处理中${queueHint}，Ctrl+Enter 加入队列...`
  }
  if (attachments.value.length > 0) {
    return '添加描述(可选)，按 Ctrl+Enter 发送...'
  }
  return '输入消息，/ 选择技能，@ 引用文章，按 Ctrl+Enter 发送...'
}

function toggleAttachMenu() {
  showAttachMenu.value = !showAttachMenu.value
}

// 语音输入：点击开始录音，再次点击停止并识别
async function toggleRecording() {
  if (isRecording.value) {
    const blob = stopRecording()
    if (blob) {
      const text = await transcribeAudio(blob, 'zh')
      if (text) {
        inputValue.value = inputValue.value ? inputValue.value + ' ' + text : text
        emit('update:modelValue', inputValue.value)
      }
    }
  } else {
    const ok = await startRecording()
    if (!ok) {
      alert('无法访问麦克风，请检查浏览器权限设置')
    }
  }
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
    
    // 检查模型是否支持该媒体类型(不再阻止上传,仅做标记)
    if (mediaType === 'image' && !props.supportsVision) {
      console.warn('[ChatInput] 当前模型不支持直接识图,图片将通过 OCR 提取文字后发送')
    }
    if (mediaType === 'video' && !props.supportsVideo) {
      console.warn('[ChatInput] 当前模型不支持视频输入,附件将以链接形式发送')
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
    
    // 模拟上传(实际项目中应该调用uploadFile)
    simulateUpload(attachment)
  }

  // 清空input,允许重复选择相同文件
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

// 移除附件
function removeAttachment(index: number) {
  const attachment = attachments.value[index]
  if (!attachment) return
  if (attachment.url.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.url)
  }
  // 用 filter 创建新数组,确保响应式更新
  attachments.value = attachments.value.filter((_, i) => i !== index)
  console.log('[ChatInput] 移除附件, 剩余:', attachments.value.length)
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
  
  // 清空附件列表(blob URL 由调用方 ChatLayout 在发送完成后释放)
  attachments.value = []
  
  emit('selectSkill', undefined)
  mentionInputRef.value?.clearAll()
}

function handleSkillChange(skill: Skill | null) {
  currentSkill.value = skill || undefined
  emit('selectSkill', skill || undefined)
}

function startQueueEdit(index: number, content: string) {
  editingQueueIndex.value = index
  editingQueueContent.value = content
}

function saveQueueEdit(index: number) {
  if (editingQueueIndex.value === index) {
    emit('updateQueueItem', index, editingQueueContent.value)
  }
  editingQueueIndex.value = null
}

function cancelQueueEdit() {
  editingQueueIndex.value = null
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
  opacity: 1;
  transition: opacity 0.3s;
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
  opacity: 1;
  transition: background 0.2s;
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

.input-container-3d.has-queue {
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.03),
    0 4px 12px rgba(0, 0, 0, 0.02);
}

.input-container-3d:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.06),
    0 16px 40px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.input-container-3d.focused {
  border-color: rgba(184, 160, 144, 0.5);
  box-shadow:
    0 0 0 4px rgba(184, 160, 144, 0.1),
    0 12px 32px rgba(184, 160, 144, 0.12),
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
  background: linear-gradient(145deg, rgba(248, 246, 243, 0.9), rgba(240, 237, 232, 0.9));
  color: var(--sr-text-secondary, #6a6560);
  border-color: rgba(184, 160, 144, 0.35);
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
  min-width: 220px;
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
  white-space: nowrap;
  flex-shrink: 0;
}

.menu-hint.ocr {
  color: #f59e0b;
  background: #fffbeb;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
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
  background: linear-gradient(135deg, rgba(179, 168, 184, 0.9) 0%, rgba(168, 179, 168, 0.85) 50%, rgba(184, 160, 144, 0.9) 100%);
  border: none;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow:
    0 4px 12px rgba(179, 168, 184, 0.35),
    0 8px 24px rgba(179, 168, 184, 0.18);
}

.send-btn-3d:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 8px 20px rgba(179, 168, 184, 0.45),
    0 16px 40px rgba(179, 168, 184, 0.25);
}

.send-btn-3d:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.send-btn-3d.stop {
  background: linear-gradient(135deg, rgba(201, 184, 179, 0.9) 0%, rgba(179, 168, 168, 0.9) 100%);
  box-shadow:
    0 4px 12px rgba(201, 184, 179, 0.35),
    0 8px 24px rgba(201, 184, 179, 0.18);
  animation: pulse-stop 1.5s ease-in-out infinite;
}

@keyframes pulse-stop {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(0.95); }
}

/* 语音按钮 */
.voice-btn-3d {
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
  position: relative;
}

.voice-btn-3d:hover:not(:disabled) {
  background: linear-gradient(145deg, rgba(248, 246, 243, 0.9), rgba(240, 237, 232, 0.9));
  color: var(--sr-text-secondary, #6a6560);
  border-color: rgba(184, 160, 144, 0.35);
  transform: scale(1.05);
}

.voice-btn-3d:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.voice-btn-3d.recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border-color: rgba(239, 68, 68, 0.5);
  animation: pulse-record 1.2s ease-in-out infinite;
}

@keyframes pulse-record {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
}

.voice-btn-3d.transcribing {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.voice-spinner {
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  border: 2px solid transparent;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
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

.queue-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #d97706;
  margin-left: 4px;
}

/* 队列预览 */
.queue-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 0 8px 0;
  padding: 0 4px;
}

.queue-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.queue-header:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(226, 232, 240, 0.9);
}

.queue-header-icon {
  font-size: 13px;
}

.queue-header-text {
  flex: 1;
  font-weight: 500;
}

.queue-header-toggle {
  font-size: 11px;
  color: #94a3b8;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-expand-enter-active,
.queue-expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.queue-expand-enter-from,
.queue-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.queue-expand-enter-to,
.queue-expand-leave-from {
  opacity: 1;
  max-height: 200px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 13px;
  color: #475569;
  backdrop-filter: blur(4px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.queue-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: linear-gradient(135deg, #e0e7ff, #dbeafe);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
}

.queue-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
}

.queue-content:hover {
  color: #1e293b;
}

.queue-edit-input {
  flex: 1;
  padding: 3px 8px;
  background: white;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  font-size: 13px;
  color: #1e293b;
  outline: none;
}

.queue-edit-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.queue-attachments {
  font-size: 11px;
  color: #64748b;
}

.queue-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
}

.queue-remove:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* 链接功能已由 readArticle 工具覆盖 */
</style>
