<template>
  <div class="git-manager">
    <!-- 头部 -->
    <div class="gm-header">
      <Icon name="git-branch" class="gm-icon" />
      <div>
        <h2 class="gm-title">Git 管理</h2>
        <p class="gm-desc">查看提交历史、执行代码提交</p>
      </div>
    </div>

    <!-- 提交表单 -->
    <LiquidGlass class="commit-form-glass" glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.25">
      <div class="commit-form">
        <h3 class="form-title">
          <Icon name="git-commit" />
          新建提交
        </h3>

        <div class="form-group">
          <label>文件路径</label>
          <input
            v-model="commitForm.files"
            type="text"
            class="lg-input"
            placeholder="支持多个文件，用逗号分隔，如: src/a.ts, src/b.ts"
            :disabled="committing"
          />
          <span class="form-hint">留空表示提交所有更改（git add -A）</span>
        </div>

        <div class="form-group">
          <label>提交信息</label>
          <input
            v-model="commitForm.message"
            type="text"
            class="lg-input"
            placeholder="描述本次提交的更改内容..."
            :disabled="committing"
            @keydown.enter.prevent="doCommit"
          />
        </div>

        <div class="form-actions">
          <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.5">
            <button
              class="submit-btn"
              :disabled="committing || !commitForm.message.trim()"
              @click="doCommit"
            >
              <Icon v-if="committing" name="loader-2" class="spin" />
              <Icon v-else name="check" />
              {{ committing ? '提交中...' : '提交' }}
            </button>
          </LiquidGlass>
        </div>

        <div v-if="commitResult" class="commit-result" :class="commitResult.type">
          <Icon :name="commitResult.type === 'success' ? 'check-circle' : 'alert-circle'" />
          {{ commitResult.text }}
        </div>
      </div>
    </LiquidGlass>

    <!-- 提交历史 -->
    <div class="history-section">
      <div class="section-header">
        <h3>
          <Icon name="history" />
          提交历史
        </h3>
        <LiquidGlass glow-color="var(--sr-morandi-blue, #9aa8b8)" :intensity="0.2">
          <button class="refresh-btn" :disabled="loading" @click="loadHistory">
            <Icon name="refresh-cw" :class="{ spin: loading }" />
            刷新
          </button>
        </LiquidGlass>
      </div>

      <div v-if="loading" class="state-box">
        <Icon name="loader-2" class="spin" />
        加载提交历史中...
      </div>
      <div v-else-if="error" class="state-box error">
        <Icon name="alert-circle" />
        {{ error }}
      </div>
      <div v-else-if="commits.length === 0" class="state-box">
        <Icon name="inbox" />
        暂无提交记录
      </div>
      <div v-else class="commits-list">
        <LiquidGlass
          v-for="commit in commits"
          :key="commit.hash"
          class="commit-card-glass"
          glow-color="var(--sr-accent-star, #b8a090)"
          :intensity="0.15"
        >
          <div class="commit-card">
            <div class="commit-main">
              <div class="commit-hash-row">
                <span class="commit-hash" :title="commit.hash">{{ commit.hash.slice(0, 7) }}</span>
                <div v-if="commit.refs && commit.refs.length" class="commit-refs">
                  <span
                    v-for="ref in commit.refs"
                    :key="ref"
                    class="ref-tag"
                    :class="refClass(ref)"
                  >
                    {{ ref }}
                  </span>
                </div>
              </div>
              <p class="commit-message" :title="commit.body || commit.message">{{ commit.message }}</p>
            </div>
            <div class="commit-meta">
              <span class="meta-item" :title="commit.author">
                <Icon name="user" />
                {{ commit.author }}
              </span>
              <span class="meta-item" :title="formatAbsolute(commit.date)">
                <Icon name="clock" />
                {{ formatRelative(commit.date) }}
              </span>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, LiquidGlass } from '@/theme/components/common'
import { ref, onMounted } from 'vue'

interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
  refs?: string[]
  body?: string
}

const commits = ref<GitCommit[]>([])
const loading = ref(false)
const error = ref('')
const committing = ref(false)
const commitResult = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const commitForm = ref({
  files: '',
  message: ''
})

function parseRefs(refs?: string): string[] {
  if (!refs) return []
  return refs.split(',').map(r => r.trim()).filter(Boolean)
}

function normalizeCommit(raw: any): GitCommit {
  return {
    hash: raw.hash || raw.id || '',
    message: raw.message || '',
    author: raw.author || raw.author_name || 'Unknown',
    date: raw.date || raw.date_iso || raw.committer_date || new Date().toISOString(),
    refs: Array.isArray(raw.refs) ? raw.refs : parseRefs(raw.refs),
    body: raw.body || ''
  }
}

async function loadHistory() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/git/log')
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const json = await res.json()
    // 后端可能返回 { success, data } 或直接返回数组
    const rawList = Array.isArray(json)
      ? json
      : json?.data ?? json?.commits ?? []
    commits.value = rawList.map(normalizeCommit)
  } catch (e: any) {
    error.value = '加载提交历史失败: ' + (e?.message || String(e))
    console.error('[GitManager] 加载历史失败:', e)
  } finally {
    loading.value = false
  }
}

async function doCommit() {
  const message = commitForm.value.message.trim()
  if (!message) return

  committing.value = true
  commitResult.value = null
  try {
    const filesInput = commitForm.value.files.trim()
    const files = filesInput
      ? filesInput.split(',').map(f => f.trim()).filter(Boolean)
      : undefined

    const res = await fetch('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, message })
    })

    const json = await res.json()
    if (json.success) {
      commitResult.value = {
        type: 'success',
        text: json.data?.hash
          ? `提交成功: ${json.data.hash.slice(0, 7)} ${json.data.message || message}`
          : '提交成功'
      }
      commitForm.value = { files: '', message: '' }
      await loadHistory()
    } else {
      throw new Error(json.error || '提交失败')
    }
  } catch (e: any) {
    commitResult.value = { type: 'error', text: '提交失败: ' + (e?.message || String(e)) }
    console.error('[GitManager] 提交失败:', e)
  } finally {
    committing.value = false
  }
}

function refClass(ref: string): string {
  if (ref.startsWith('HEAD')) return 'ref-head'
  if (ref.startsWith('tag:')) return 'ref-tag-label'
  if (ref.startsWith('origin/')) return 'ref-remote'
  return 'ref-branch'
}

function formatAbsolute(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN')
  } catch {
    return dateStr
  }
}

function formatRelative(dateStr: string): string {
  try {
    const then = new Date(dateStr).getTime()
    const now = Date.now()
    const diff = Math.floor((now - then) / 1000)
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
    if (diff < 31536000) return `${Math.floor(diff / 604800)} 周前`
    return `${Math.floor(diff / 31536000)} 年前`
  } catch {
    return dateStr
  }
}

onMounted(loadHistory)
</script>

<style scoped>
.git-manager {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

/* 头部 */
.gm-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.gm-icon {
  width: 48px;
  height: 48px;
  color: var(--sr-accent-star, #b8a090);
}

.gm-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.gm-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 提交表单 */
.commit-form-glass {
  border-radius: 24px;
  margin-bottom: 24px;
}

.commit-form {
  padding: 28px;
}

.form-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.form-title svg {
  width: 22px;
  height: 22px;
  color: var(--sr-morandi-green, #a8b3a8);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.submit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn svg {
  width: 16px;
  height: 16px;
}

.commit-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.commit-result.success {
  background: rgba(168, 179, 168, 0.12);
  color: var(--sr-morandi-green, #a8b3a8);
}

.commit-result.error {
  background: rgba(212, 184, 184, 0.12);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.commit-result svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* 历史区域 */
.history-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.section-header h3 svg {
  width: 20px;
  height: 20px;
  color: var(--sr-morandi-blue, #9aa8b8);
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9aa8b8), var(--sr-morandi-purple, #b3a8b8));
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 14px;
  height: 14px;
}

.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px;
  text-align: center;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 15px;
  border: 1px dashed var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: 16px;
}

.state-box.error {
  color: var(--sr-morandi-pink, #d4b8b8);
  background: rgba(212, 184, 184, 0.06);
}

.state-box svg {
  width: 20px;
  height: 20px;
}

/* 提交列表 */
.commits-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.commit-card-glass {
  border-radius: 18px;
}

.commit-card {
  padding: 18px 22px;
}

.commit-main {
  margin-bottom: 10px;
}

.commit-hash-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}

.commit-hash {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-accent-star, #b8a090);
  background: rgba(184, 160, 144, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
}

.commit-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ref-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.ref-branch {
  background: rgba(154, 168, 184, 0.12);
  color: var(--sr-morandi-blue, #9aa8b8);
}

.ref-tag-label {
  background: rgba(184, 160, 144, 0.12);
  color: var(--sr-accent-star, #b8a090);
}

.ref-head {
  background: rgba(168, 179, 168, 0.15);
  color: var(--sr-morandi-green, #a8b3a8);
}

.ref-remote {
  background: rgba(212, 184, 184, 0.12);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.commit-message {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  line-height: 1.5;
  word-break: break-word;
}

.commit-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

/* 动画 */
.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .commit-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
