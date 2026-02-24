<template>
  <div class="tool-tester">
    <h2>🔧 AI 工具测试面板</h2>
    <p class="desc">点击按钮测试各个工具是否正常工作</p>

    <!-- 测试结果概览 -->
    <div class="stats-bar">
      <span class="stat">
        <span class="stat-num">{{ passed }}</span>
        <span class="stat-label success">通过</span>
      </span>
      <span class="stat">
        <span class="stat-num">{{ failed }}</span>
        <span class="stat-label error">失败</span>
      </span>
      <span class="stat">
        <span class="stat-num">{{ pending }}</span>
        <span class="stat-label">待测</span>
      </span>
      <button class="btn-test-all" @click="testAll" :disabled="testingAll">
        {{ testingAll ? '测试中...' : '🚀 一键测试全部' }}
      </button>
    </div>

    <!-- MCP 工具测试 -->
    <section class="test-section">
      <h3>📦 MCP 工具</h3>
      <div class="test-grid">
        <div v-for="test in mcpTests" :key="test.name" class="test-card" :class="test.status">
          <div class="test-header">
            <span class="test-name">{{ test.name }}</span>
            <span class="test-badge" :class="test.status">{{ statusText(test.status) }}</span>
          </div>
          <p class="test-desc">{{ test.description }}</p>
          <div class="test-actions">
            <button @click="runTest(test)" :disabled="test.status === 'running'">
              {{ test.status === 'running' ? '运行中...' : '▶ 测试' }}
            </button>
          </div>
          <div v-if="test.result" class="test-result" :class="{ error: test.error }">
            <pre>{{ test.result }}</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- 网络工具测试 -->
    <section class="test-section">
      <h3>🌐 网络工具</h3>
      <div class="test-grid">
        <div v-for="test in networkTests" :key="test.name" class="test-card" :class="test.status">
          <div class="test-header">
            <span class="test-name">{{ test.name }}</span>
            <span class="test-badge" :class="test.status">{{ statusText(test.status) }}</span>
          </div>
          <p class="test-desc">{{ test.description }}</p>
          <div class="test-input" v-if="test.input">
            <input v-model="test.inputValue" :placeholder="test.placeholder" />
          </div>
          <div class="test-actions">
            <button @click="runTest(test)" :disabled="test.status === 'running'">
              {{ test.status === 'running' ? '运行中...' : '▶ 测试' }}
            </button>
          </div>
          <div v-if="test.result" class="test-result" :class="{ error: test.error }">
            <pre>{{ test.result }}</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- 文章工具测试 -->
    <section class="test-section">
      <h3>📝 文章工具</h3>
      <div class="test-grid">
        <div v-for="test in articleTests" :key="test.name" class="test-card" :class="test.status">
          <div class="test-header">
            <span class="test-name">{{ test.name }}</span>
            <span class="test-badge" :class="test.status">{{ statusText(test.status) }}</span>
          </div>
          <p class="test-desc">{{ test.description }}</p>
          <div class="test-actions">
            <button @click="runTest(test)" :disabled="test.status === 'running'">
              {{ test.status === 'running' ? '运行中...' : '▶ 测试' }}
            </button>
          </div>
          <div v-if="test.result" class="test-result" :class="{ error: test.error }">
            <pre>{{ test.result }}</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- GitHub 工具测试 -->
    <section class="test-section">
      <h3>🐙 GitHub 工具</h3>
      <div class="test-grid">
        <div v-for="test in githubTests" :key="test.name" class="test-card" :class="test.status">
          <div class="test-header">
            <span class="test-name">{{ test.name }}</span>
            <span class="test-badge" :class="test.status">{{ statusText(test.status) }}</span>
          </div>
          <p class="test-desc">{{ test.description }}</p>
          <div class="test-actions">
            <button @click="runTest(test)" :disabled="test.status === 'running'">
              {{ test.status === 'running' ? '运行中...' : '▶ 测试' }}
            </button>
          </div>
          <div v-if="test.result" class="test-result" :class="{ error: test.error }">
            <pre>{{ test.result }}</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- 日志输出 -->
    <section class="test-section" v-if="logs.length > 0">
      <h3>📋 测试日志</h3>
      <div class="log-container">
        <div v-for="(log, i) in logs" :key="i" class="log-item" :class="log.type">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-msg">{{ log.message }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mcpManager } from './ai-chat/core/mcp'

const API_BASE = '/api'

interface TestCase {
  name: string
  description: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: string
  error?: boolean
  input?: boolean
  inputValue?: string
  placeholder?: string
  fn: () => Promise<any>
}

const logs = ref<{type: string, time: string, message: string}[]>([])
const testingAll = ref(false)

function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value.unshift({ type, time: now, message })
  if (logs.value.length > 50) logs.value.pop()
}

function statusText(status: string) {
  const map: Record<string, string> = {
    pending: '⏳ 待测',
    running: '🔄 运行中',
    success: '✅ 通过',
    error: '❌ 失败'
  }
  return map[status] || status
}

// MCP 测试 - 直接调用前端 mcpManager
const mcpTests = ref<TestCase[]>([
  {
    name: 'MCP Math',
    description: '测试数学计算工具 (calculate)',
    status: 'pending',
    fn: async () => {
      const result = await mcpManager.execute('calculate', { expression: '123 + 456 * 2' })
      return `✅ 计算结果: ${JSON.stringify(result, null, 2)}`
    }
  },
  {
    name: 'MCP Text Stats',
    description: '测试文本统计工具 (text_stats)',
    status: 'pending',
    fn: async () => {
      const result = await mcpManager.execute('text_stats', { text: 'Hello World! 你好世界！这是一段测试文本。' })
      return `✅ 统计结果:\n${JSON.stringify(result, null, 2)}`
    }
  },
  {
    name: 'MCP System Info',
    description: '测试系统信息工具 (get_system_info)',
    status: 'pending',
    fn: async () => {
      const result = await mcpManager.execute('get_system_info', {})
      return `✅ 系统信息:\n${JSON.stringify(result, null, 2)}`
    }
  },
  {
    name: 'MCP Memory Usage',
    description: '测试内存查询工具 (get_memory_usage)',
    status: 'pending',
    fn: async () => {
      const result = await mcpManager.execute('get_memory_usage', {})
      return `✅ 内存使用:\n${JSON.stringify(result, null, 2)}`
    }
  },
  {
    name: 'MCP Split Text',
    description: '测试文本分割工具 (split_text)',
    status: 'pending',
    fn: async () => {
      const result = await mcpManager.execute('split_text', { text: 'a,b,c,d', separator: ',' })
      return `✅ 分割结果:\n${JSON.stringify(result, null, 2)}`
    }
  }
])

// 网络工具测试
const networkTests = ref<TestCase[]>([
  {
    name: 'Fetch URL (Local API)',
    description: '测试代理功能（本地 API）',
    status: 'pending',
    fn: async () => {
      // 测试本地 API 来验证 proxy/fetch 正常工作
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://httpbin.org/get', timeout: 15000 })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }
      const text = await response.text()
      try {
        const json = JSON.parse(text)
        return `✅ 代理功能正常\n\n响应预览:\n${JSON.stringify(json, null, 2).substring(0, 600)}`
      } catch {
        return text.substring(0, 800)
      }
    }
  },
  {
    name: 'Fetch URL (External)',
    description: '测试外部 API 访问（GitHub）',
    status: 'pending',
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://api.github.com/users/octocat', timeout: 15000 })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }
      const text = await response.text()
      try {
        const json = JSON.parse(text)
        return `✅ GitHub API 访问正常\n\n用户: ${json.login}\nID: ${json.id}\nBio: ${json.bio || 'N/A'}`
      } catch {
        return text.substring(0, 800)
      }
    }
  },
  {
    name: 'Web Search',
    description: '测试搜索代理（模拟）',
    status: 'pending',
    fn: async () => {
      // 仅测试代理是否可用，不实际搜索
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://httpbin.org/ip', timeout: 10000 })
      })
      if (!response.ok) throw new Error('代理不可用')
      return '✅ 搜索代理可用（实际搜索需要配置搜索引擎 API Key）'
    }
  }
])

// 文章工具测试
const articleTests = ref<TestCase[]>([
  {
    name: 'List Articles',
    description: '测试获取文章列表',
    status: 'pending',
    fn: async () => {
      const response = await fetch(`${API_BASE}/articles/list-all`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()
      const data = result.data || []
      return `✅ 找到 ${data.length} 篇文章${data.length > 0 ? '\n前3篇: ' + data.slice(0, 3).map((a: any) => a.title).join(', ') : ''}`
    }
  },
  {
    name: 'Read Article',
    description: '测试读取文章',
    status: 'pending',
    fn: async () => {
      const response = await fetch(`${API_BASE}/articles/list-all`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()
      const data = result.data || []
      if (data.length === 0) return '⚠️ 暂无文章'
      
      const article = data[0]
      const contentRes = await fetch(`${API_BASE}/articles/detail?path=${encodeURIComponent(article.path)}`)
      if (!contentRes.ok) throw new Error(`读取失败: ${contentRes.status}`)
      const content = await contentRes.text()
      return `✅ 读取成功\n路径: ${article.path}\n长度: ${content.length} 字符`
    }
  }
])

// GitHub 工具测试
const githubTests = ref<TestCase[]>([
  {
    name: 'GitHub Repo Info',
    description: '测试获取仓库信息',
    status: 'pending',
    fn: async () => {
      // 使用 octocat/Hello-World 测试仓库（更可靠）
      const response = await fetch(`${API_BASE}/github/repo/octocat/Hello-World`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }
      const data = await response.json()
      if (data.success === false) throw new Error(data.error)
      return `✅ ${data.full_name}\n⭐ ${data.stargazers_count.toLocaleString()} stars\n🍴 ${data.forks_count.toLocaleString()} forks\n📖 ${data.description?.substring(0, 80) || 'No description'}${data.description?.length > 80 ? '...' : ''}`
    }
  },
  {
    name: 'GitHub File Content',
    description: '测试获取文件内容',
    status: 'pending',
    fn: async () => {
      // 使用 octocat/Hello-World 测试仓库，默认分支是 master
      const response = await fetch(`${API_BASE}/github/file/octocat/Hello-World/master/README`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }
      const data = await response.json()
      if (data.success === false) throw new Error(data.error)
      const content = typeof window !== 'undefined' ? atob(data.content) : Buffer.from(data.content, 'base64').toString()
      return `✅ 文件: ${data.name}\n大小: ${data.size} bytes\n内容预览:\n${content.substring(0, 500)}${content.length > 500 ? '\n...' : ''}`
    }
  },
  {
    name: 'GitHub Commits',
    description: '测试获取提交历史',
    status: 'pending',
    fn: async () => {
      // 使用 octocat/Hello-World 测试仓库，默认分支是 master
      const response = await fetch(`${API_BASE}/github/commits/octocat/Hello-World/master?per_page=3`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }
      const data = await response.json()
      if (data.success === false) throw new Error(data.error)
      if (!Array.isArray(data)) throw new Error('返回格式错误')
      return `✅ 最近 ${data.length} 条提交:\n${data.map((c: any) => `- ${c.sha.substring(0, 7)}: ${c.commit.message.split('\n')[0].substring(0, 60)}${c.commit.message.split('\n')[0].length > 60 ? '...' : ''}`).join('\n')}`
    }
  }
])

async function runTest(test: TestCase) {
  test.status = 'running'
  test.result = ''
  test.error = false
  addLog(`开始测试: ${test.name}`)
  
  try {
    const start = Date.now()
    const result = await test.fn()
    const duration = Date.now() - start
    test.result = result
    test.status = 'success'
    test.error = false
    addLog(`✅ ${test.name} 通过 (${duration}ms)`, 'success')
  } catch (err: any) {
    test.result = err.message || String(err)
    test.status = 'error'
    test.error = true
    addLog(`❌ ${test.name} 失败: ${err.message}`, 'error')
  }
}

async function testAll() {
  testingAll.value = true
  logs.value = []
  addLog('🚀 开始批量测试...')
  
  const allTests = [...mcpTests.value, ...networkTests.value, ...articleTests.value, ...githubTests.value]
  
  for (const test of allTests) {
    await runTest(test)
    await new Promise(r => setTimeout(r, 300)) // 间隔避免并发
  }
  
  testingAll.value = false
  addLog('✅ 批量测试完成', 'success')
}

const passed = computed(() => [...mcpTests.value, ...networkTests.value, ...articleTests.value, ...githubTests.value].filter(t => t.status === 'success').length)
const failed = computed(() => [...mcpTests.value, ...networkTests.value, ...articleTests.value, ...githubTests.value].filter(t => t.status === 'error').length)
const pending = computed(() => [...mcpTests.value, ...networkTests.value, ...articleTests.value, ...githubTests.value].filter(t => t.status === 'pending').length)
</script>

<style scoped>
.tool-tester {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
}

.desc {
  color: var(--vp-c-text-2);
  margin-bottom: 20px;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-num {
  font-size: 24px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.stat-label {
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.stat-label.success { color: var(--vp-c-green); }
.stat-label.error { color: var(--vp-c-red); }

.btn-test-all {
  margin-left: auto;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-light) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-test-all:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--vp-c-brand-rgb), 0.3);
}

.btn-test-all:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-section {
  margin-bottom: 32px;
}

.test-section h3 {
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
  font-size: 18px;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.test-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.test-card:hover {
  border-color: var(--vp-c-brand);
}

.test-card.success {
  border-color: var(--vp-c-green);
  background: rgba(var(--vp-c-green-rgb), 0.05);
}

.test-card.error {
  border-color: var(--vp-c-red);
  background: rgba(var(--vp-c-red-rgb), 0.05);
}

.test-card.running {
  border-color: var(--vp-c-brand);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.test-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.test-name {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.test-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}

.test-badge.success { 
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green);
}

.test-badge.error { 
  background: var(--vp-c-red-soft);
  color: var(--vp-c-red);
}

.test-badge.running { 
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}

.test-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
}

.test-input input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  margin-bottom: 12px;
}

.test-input input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

.test-actions button {
  padding: 8px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.test-actions button:hover:not(:disabled) {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.test-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  margin-top: 12px;
  padding: 12px;
  background: var(--vp-c-bg);
  border-radius: 8px;
  border-left: 3px solid var(--vp-c-green);
}

.test-result.error {
  border-left-color: var(--vp-c-red);
}

.test-result pre {
  margin: 0;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.log-container {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  flex-shrink: 0;
}

.log-msg {
  color: var(--vp-c-text-1);
}

.log-item.success .log-msg {
  color: var(--vp-c-green);
}

.log-item.error .log-msg {
  color: var(--vp-c-red);
}

@media (max-width: 640px) {
  .test-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .btn-test-all {
    margin-left: 0;
    width: 100%;
  }
}
</style>
