<template>
  <div
    v-if="content && shouldUseTypewriter"
    class="final-response"
  >
    <div class="response-body">
      <TypewriterText
        ref="typewriterRef"
        :content="renderedHtml"
        :speed="12"
        :html="true"
        :enabled="true"
        @complete="onTypewriterComplete"
      />
    </div>
  </div>

  <div v-else-if="content" class="final-response">
    <div class="response-body" v-html="renderedHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { TypewriterText } from '@/theme/components/common'
import { computed, onMounted, ref, watch } from 'vue'

interface FinalResponseProps {
  content: string
  role: string
  messageId: string
  isStreaming: boolean
  status: string
  renderHtml?: (content: string) => string
}

const props = defineProps<FinalResponseProps>()

// ========== 打字机效果控制 ==========
const TYPEWRISTER_KEY = 'ai_chat_shown_message_ids'

function getShownMessageIds(): Set<string> {
  if (typeof sessionStorage === 'undefined') return new Set()
  try {
    const stored = sessionStorage.getItem(TYPEWRISTER_KEY)
    if (stored) return new Set(JSON.parse(stored))
  } catch (e) {
    console.warn('[FinalResponse] Failed to load shown message ids:', e)
  }
  return new Set()
}

function saveShownMessageId(id: string) {
  if (typeof sessionStorage === 'undefined') return
  try {
    const ids = getShownMessageIds()
    ids.add(id)
    sessionStorage.setItem(TYPEWRISTER_KEY, JSON.stringify(Array.from(ids)))
  } catch (e) {
    console.warn('[FinalResponse] Failed to save shown message id:', e)
  }
}

const initialMessageIds = ref<Set<string>>(new Set())

const shouldUseTypewriter = computed(() => {
  if (props.role !== 'assistant') return false
  if (props.isStreaming) return false
  if (props.status !== 'completed') return false
  if (initialMessageIds.value.has(props.messageId)) return false
  if (getShownMessageIds().has(props.messageId)) return false
  return true
})

onMounted(() => {
  initialMessageIds.value.add(props.messageId)
  if (props.role === 'assistant' && props.content) {
    setTimeout(() => saveShownMessageId(props.messageId), 100)
  }
})

watch(
  () => props.status,
  (newStatus, oldStatus) => {
    if (newStatus === 'completed' && oldStatus === 'streaming') {
      setTimeout(() => saveShownMessageId(props.messageId), 500)
    }
  }
)

function onTypewriterComplete() {
  saveShownMessageId(props.messageId)
}

const typewriterRef = ref<InstanceType<typeof TypewriterText> | null>(null)

// ========== HTML 渲染 ==========
const renderedHtml = ref('')
let parseTimer: ReturnType<typeof setTimeout> | null = null

function doParseHtml() {
  const content = props.content
  if (!content) {
    renderedHtml.value = ''
    return
  }
  try {
    if (props.role === 'assistant' && props.renderHtml) {
      renderedHtml.value = props.renderHtml(content)
    } else {
      renderedHtml.value = content
    }
  } catch {
    renderedHtml.value = content
  }
}

watch(
  () => [props.content, props.isStreaming] as const,
  ([, isStreaming]) => {
    if (!isStreaming) {
      if (parseTimer) {
        clearTimeout(parseTimer)
        parseTimer = null
      }
      doParseHtml()
      return
    }
    // 流式时 throttle，避免每帧都 parse 导致 O(n²) 卡顿
    if (parseTimer) return
    parseTimer = setTimeout(() => {
      parseTimer = null
      doParseHtml()
    }, 120)
  },
  { immediate: true, flush: 'post' }
)
</script>

<style scoped>
.final-response {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.response-body {
  padding: 20px 24px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--sr-text-primary, #2d2a26);
}

.response-body :deep(p) {
  margin: 0 0 12px;
}
.response-body :deep(p:last-child) {
  margin-bottom: 0;
}
.response-body :deep(pre) {
  background: rgba(0, 0, 0, 0.04);
  padding: 14px 16px;
  border-radius: 10px;
  overflow-x: auto;
}
.response-body :deep(code) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
}
.response-body :deep(ul),
.response-body :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}
.response-body :deep(li) {
  margin: 4px 0;
}
.response-body :deep(a) {
  color: var(--sr-morandi-blue, #9aa8b3);
  text-decoration: underline;
}

/* 图片代理渲染 */
.response-body :deep(img) {
  max-width: 100%;
  border-radius: 10px;
  margin: 8px 0;
  display: block;
}

/* LaTeX 公式样式 */
.response-body :deep(.katex) {
  font-size: 1.05em;
}
.response-body :deep(.katex-display) {
  margin: 12px 0;
  overflow-x: auto;
}

/* ========== Markdown 表格 ========== */
.response-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 14px;
}
.response-body :deep(thead) {
  background-color: rgba(0, 0, 0, 0.04);
}
.response-body :deep(th) {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #333;
}
.response-body :deep(td) {
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  vertical-align: top;
}
.response-body :deep(tr:nth-child(even)) {
  background-color: rgba(0, 0, 0, 0.015);
}
.response-body :deep(tr:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* ========== 响应式 ========== */
@media (max-width: 640px) {
  .response-body {
    padding: 16px;
  }
}
</style>
