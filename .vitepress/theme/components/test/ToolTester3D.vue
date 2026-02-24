<template>
  <div class="tool-tester-3d" :class="{ 'dark-mode': isDarkMode }">
    <!-- 背景效果 -->
    <div class="bg-effects">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="grid-overlay"></div>
    </div>

    <!-- 头部 -->
    <header class="header-3d">
      <div class="logo-container">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <h1 class="title-3d">
          <span class="title-gradient">Tool</span>
          <span class="title-outline">Tester</span>
        </h1>
      </div>
      <p class="subtitle">AI Agent 工具链测试平台</p>
      
      <!-- 控制按钮 -->
      <div class="controls">
        <button class="btn-3d btn-theme" @click="toggleTheme">
          <span class="btn-icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
        </button>
        <button class="btn-3d btn-primary" @click="testAll" :disabled="testingAll">
          <span class="btn-shine"></span>
          <span class="btn-content">
            <span class="btn-icon">🚀</span>
            {{ testingAll ? '测试中...' : '一键测试' }}
          </span>
        </button>
      </div>
    </header>

    <!-- 统计面板 -->
    <section class="stats-section">
      <div class="stat-cards">
        <div class="stat-card-3d success" :class="{ 'pulse': passed > 0 }">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ passed }}</div>
          <div class="stat-label">通过</div>
          <div class="stat-progress" :style="{ width: passRate + '%' }"></div>
        </div>
        <div class="stat-card-3d error" :class="{ 'pulse': failed > 0 }">
          <div class="stat-icon">❌</div>
          <div class="stat-value">{{ failed }}</div>
          <div class="stat-label">失败</div>
        </div>
        <div class="stat-card-3d pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">{{ pending }}</div>
          <div class="stat-label">待测</div>
        </div>
        <div class="stat-card-3d total">
          <div class="stat-icon">📊</div>
          <div class="stat-value">{{ total }}</div>
          <div class="stat-label">总计</div>
        </div>
      </div>
    </section>

    <!-- 分类测试区 -->
    <main class="test-categories">
      <!-- MCP 工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('mcp')">
          <div class="category-icon">📦</div>
          <h2>MCP 工具</h2>
          <div class="category-progress">
            <div class="progress-bar" :style="{ width: getCategoryProgress('mcp') + '%' }"></div>
          </div>
          <span class="category-count">{{ getCategoryStats('mcp') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.mcp }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.mcp" class="test-grid">
            <TestCard3D 
              v-for="test in mcpTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- 网络工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('network')">
          <div class="category-icon">🌐</div>
          <h2>网络工具</h2>
          <div class="category-progress">
            <div class="progress-bar" :style="{ width: getCategoryProgress('network') + '%' }"></div>
          </div>
          <span class="category-count">{{ getCategoryStats('network') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.network }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.network" class="test-grid">
            <TestCard3D 
              v-for="test in networkTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- 文章工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('article')">
          <div class="category-icon">📝</div>
          <h2>文章工具</h2>
          <div class="category-progress">
            <div class="progress-bar" :style="{ width: getCategoryProgress('article') + '%' }"></div>
          </div>
          <span class="category-count">{{ getCategoryStats('article') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.article }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.article" class="test-grid">
            <TestCard3D 
              v-for="test in articleTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- GitHub 工具 -->
      <section class="category-section">
        <div class="category-header" @click="toggleCategory('github')">
          <div class="category-icon">🐙</div>
          <h2>GitHub 工具</h2>
          <div class="category-progress">
            <div class="progress-bar" :style="{ width: getCategoryProgress('github') + '%' }"></div>
          </div>
          <span class="category-count">{{ getCategoryStats('github') }}</span>
          <span class="toggle-icon" :class="{ 'open': expanded.github }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.github" class="test-grid">
            <TestCard3D 
              v-for="test in githubTests" 
              :key="test.name"
              :test="test"
              @run="runTest(test)"
            />
          </div>
        </Transition>
      </section>

      <!-- AI 项目展示 -->
      <section class="category-section ai-projects">
        <div class="category-header" @click="toggleCategory('ai')">
          <div class="category-icon">🤖</div>
          <h2>热门 AI Agent 项目</h2>
          <span class="toggle-icon" :class="{ 'open': expanded.ai }">▼</span>
        </div>
        <Transition name="expand">
          <div v-show="expanded.ai" class="projects-grid">
            <AIProjectCard 
              v-for="project in aiProjects" 
              :key="project.name"
              :project="project"
            />
          </div>
        </Transition>
      </section>
    </main>

    <!-- 日志面板 -->
    <aside class="log-panel" :class="{ 'open': showLogs }">
      <div class="log-toggle" @click="showLogs = !showLogs">
        <span>📋 日志</span>
        <span class="log-count" v-if="logs.length > 0">{{ logs.length }}</span>
      </div>
      <div class="log-content" ref="logContent">
        <div 
          v-for="(log, i) in logs" 
          :key="i" 
          class="log-item"
          :class="log.type"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-badge" :class="log.type">{{ log.type }}</span>
          <span class="log-msg">{{ log.message }}</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { mcpManager } from '../ai-chat/core/mcp'
import TestCard3D from './TestCard3D.vue'
import AIProjectCard from './AIProjectCard.vue'
import { aiProjectsData } from './ai-projects-data'

const API_BASE = '/api'

interface TestCase {
  name: string
  description: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: string
  error?: boolean
  category: string
  fn: () => Promise<any>
}

// 主题切换
const isDarkMode = ref(true)
const toggleTheme = () => isDarkMode.value = !isDarkMode.value

// 展开状态
const expanded = ref({
  mcp: true,
  network: true,
  article: true,
  github: true,
  ai: false
})
const toggleCategory = (cat: string) => {
  expanded.value[cat as keyof typeof expanded.value] = !expanded.value[cat as keyof typeof expanded.value]
}

// 日志
const logs = ref<{type: string, time: string, message: string}[]>([])
const showLogs = ref(false)
const logContent = ref<HTMLElement>()

function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const now = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value.unshift({ type, time: now, message })
  if (logs.value.length > 100) logs.value.pop()
  nextTick(() => {
    if (logContent.value) logContent.value.scrollTop = 0
  })
}

// MCP 测试 - 带详细结果展示
const mcpTests = ref<TestCase[]>([
  { 
    category: 'mcp', 
    name: 'MCP Math', 
    description: '数学计算工具 (calculate)', 
    status: 'pending', 
    fn: async () => {
      const expression = '123 + 456 * 2'
      const result = await mcpManager.execute('calculate', { expression })
      return `✅ 数学计算成功\n\n📝 输入表达式: ${expression}\n📊 计算结果: ${result.result}\n✨ 执行状态: 成功`
    }
  },
  { 
    category: 'mcp', 
    name: 'MCP Text Stats', 
    description: '文本统计分析 (text_stats)', 
    status: 'pending', 
    fn: async () => {
      const text = 'Hello World! 你好世界！这是一段测试文本。'
      const result = await mcpManager.execute('text_stats', { text })
      return `✅ 文本统计成功\n\n📝 原文: "${text.substring(0, 30)}..."\n📊 统计结果:\n  • 总字符数: ${result.length}\n  • 行数: ${result.lines}\n  • 单词数: ${result.words}\n  • 中文字符: ${result.chineseChars}`
    }
  },
  { 
    category: 'mcp', 
    name: 'MCP System Info', 
    description: '系统信息查询 (get_system_info)', 
    status: 'pending', 
    fn: async () => {
      const result = await mcpManager.execute('get_system_info', {})
      return `✅ 系统信息获取成功\n\n🖥️ 平台: ${result.platform}\n🌐 语言: ${result.language}\n🌍 时区: ${result.timezone}\n⏰ 时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}`
    }
  },
  { 
    category: 'mcp', 
    name: 'MCP Memory', 
    description: '内存使用查询 (get_memory_usage)', 
    status: 'pending', 
    fn: async () => {
      const result = await mcpManager.execute('get_memory_usage', {})
      if (result.error) {
        return `⚠️ 内存信息: ${result.error}\n\n注: 浏览器安全限制可能阻止内存查询`
      }
      return `✅ 内存查询成功\n\n💾 JS 堆内存使用: ${result.usedJSHeapSize}\n💾 JS 堆内存总量: ${result.totalJSHeapSize}\n💾 JS 堆内存限制: ${result.jsHeapSizeLimit}`
    }
  },
  { 
    category: 'mcp', 
    name: 'MCP Split Text', 
    description: '文本分割工具 (split_text)', 
    status: 'pending', 
    fn: async () => {
      const text = 'apple,banana,cherry,date'
      const separator = ','
      const result = await mcpManager.execute('split_text', { text, separator })
      return `✅ 文本分割成功\n\n📝 原文: "${text}"\n✂️ 分隔符: "${separator}"\n📦 分割结果 (${result.count} 项):\n${result.parts.map((p: string, i: number) => `  ${i + 1}. ${p}`).join('\n')}`
    }
  },
  { 
    category: 'mcp', 
    name: 'MCP Format JSON', 
    description: 'JSON 格式化 (format_json)', 
    status: 'pending', 
    fn: async () => {
      const json = '{"name":"AI Agent","version":"1.0","features":["chat","agent","tools"]}'
      const result = await mcpManager.execute('format_json', { json, indent: 2 })
      return `✅ JSON 格式化成功\n\n📝 原始 JSON:\n${json}\n\n✨ 格式化结果:\n${result.formatted}`
    }
  },
])

// 网络工具测试 - 大模型厂商 API
const networkTests = ref<TestCase[]>([
  { 
    category: 'network', 
    name: 'DeepSeek API', 
    description: '获取 DeepSeek API 状态', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://api.deepseek.com/models', timeout: 10000 })
      })
      const text = await response.text()
      if (!response.ok) {
        // 401 是预期的（需要认证），说明服务正常
        if (response.status === 401) {
          return `✅ DeepSeek API 服务正常\n状态: ${response.status}\n说明: 需要 API Key 认证\n\n响应预览:\n${text.substring(0, 200)}`
        }
        throw new Error(`HTTP ${response.status}`)
      }
      const json = JSON.parse(text)
      return `✅ DeepSeek API\n模型列表:\n${JSON.stringify(json, null, 2).substring(0, 500)}`
    }
  },
  { 
    category: 'network', 
    name: '智谱 AI API', 
    description: '获取智谱 AI API 状态', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://open.bigmodel.cn/api/paas/v4/models', timeout: 10000 })
      })
      const text = await response.text()
      if (!response.ok) {
        if (response.status === 401) {
          return `✅ 智谱 AI API 服务正常\n状态: ${response.status}\n说明: 需要 API Key 认证`
        }
        throw new Error(`HTTP ${response.status}`)
      }
      return `✅ 智谱 AI API\n响应:\n${text.substring(0, 400)}`
    }
  },
  { 
    category: 'network', 
    name: 'DeepSeek 文档', 
    description: '抓取 DeepSeek 文档首页', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://platform.deepseek.com/api-docs/', timeout: 15000 })
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      // 提取标题
      const titleMatch = text.match(/<title>(.*?)<\/title>/)
      const title = titleMatch ? titleMatch[1] : '未知'
      return `✅ DeepSeek 文档\n标题: ${title}\n内容长度: ${text.length} 字符\n\n内容预览:\n${text.replace(/<[^>]+>/g, ' ').substring(0, 300).trim()}...`
    }
  },
  { 
    category: 'network', 
    name: '智谱 AI 文档', 
    description: '抓取智谱 AI 文档', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://open.bigmodel.cn/dev/api', timeout: 15000 })
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      const titleMatch = text.match(/<title>(.*?)<\/title>/)
      const title = titleMatch ? titleMatch[1] : '未知'
      return `✅ 智谱 AI 文档\n标题: ${title}\n内容长度: ${text.length} 字符\n\n内容预览:\n${text.replace(/<[^>]+>/g, ' ').substring(0, 300).trim()}...`
    }
  },
  { 
    category: 'network', 
    name: 'OpenAI API', 
    description: '检查 OpenAI API 状态', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://api.openai.com/v1/models', timeout: 10000 })
      })
      const text = await response.text()
      if (response.status === 401) {
        return `✅ OpenAI API 服务正常\n状态: ${response.status}\n说明: 需要 Bearer Token 认证\n\n这是预期的响应，证明 API 服务正在运行`
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const json = JSON.parse(text)
      return `✅ OpenAI API\n模型数量: ${json.data?.length || 0}`
    }
  },
])

// 文章工具测试
const articleTests = ref<TestCase[]>([
  { category: 'article', name: 'List Articles', description: '获取文章列表', status: 'pending', fn: async () => {
    const response = await fetch(`${API_BASE}/articles/list-all`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    const data = result.data || []
    return `✅ 找到 ${data.length} 篇文章`
  }},
  { category: 'article', name: 'Read Article', description: '读取文章内容', status: 'pending', fn: async () => {
    const response = await fetch(`${API_BASE}/articles/list-all`)
    const result = await response.json()
    const data = result.data || []
    if (data.length === 0) return '⚠️ 暂无文章'
    const contentRes = await fetch(`${API_BASE}/articles/detail?path=${encodeURIComponent(data[0].path)}`)
    const content = await contentRes.text()
    return `✅ 读取成功\n长度: ${content.length} 字符`
  }},
])

// GitHub 工具测试 - 增强结果展示
const githubTests = ref<TestCase[]>([
  { 
    category: 'github', 
    name: 'AutoGen Repo', 
    description: '获取微软 AutoGen 仓库信息', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/github/repo/microsoft/autogen`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return `✅ 仓库信息获取成功\n\n📦 ${data.full_name}\n📝 ${data.description?.substring(0, 100)}${data.description?.length > 100 ? '...' : ''}\n\n⭐ Stars: ${data.stargazers_count?.toLocaleString()}\n🍴 Forks: ${data.forks_count?.toLocaleString()}\n👁️ Watchers: ${data.watchers_count?.toLocaleString()}\n\n🔤 主要语言: ${data.language || '未知'}\n📄 License: ${data.license?.name || '未知'}`
    }
  },
  { 
    category: 'github', 
    name: 'MetaGPT Repo', 
    description: '获取 MetaGPT 仓库信息', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/github/repo/foundationagents/metagpt`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      return `✅ 仓库信息获取成功\n\n📦 ${data.full_name}\n📝 ${data.description?.substring(0, 100)}${data.description?.length > 100 ? '...' : ''}\n\n⭐ Stars: ${data.stargazers_count?.toLocaleString()}\n🍴 Forks: ${data.forks_count?.toLocaleString()}\n\n🔤 主要语言: ${data.language || '未知'}`
    }
  },
  { 
    category: 'github', 
    name: 'README Content', 
    description: '获取 AutoGen README 内容', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/github/file/microsoft/autogen/main/README.md`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const content = typeof window !== 'undefined' ? atob(data.content) : Buffer.from(data.content, 'base64').toString()
      const lines = content.split('\n')
      return `✅ 文件内容获取成功\n\n📄 文件名: ${data.name}\n📦 大小: ${data.size} bytes\n📏 行数: ${lines.length}\n\n📝 内容预览 (前 15 行):\n${lines.slice(0, 15).join('\n')}${lines.length > 15 ? '\n...' : ''}`
    }
  },
  { 
    category: 'github', 
    name: 'Recent Commits', 
    description: '获取 AutoGen 最近提交', 
    status: 'pending', 
    fn: async () => {
      const response = await fetch(`${API_BASE}/github/commits/microsoft/autogen/main?per_page=5`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const commits = data.map((c: any, i: number) => {
        const msg = c.commit.message.split('\n')[0].substring(0, 60)
        return `  ${i + 1}. ${c.sha.substring(0, 7)} - ${msg}${c.commit.message.split('\n')[0].length > 60 ? '...' : ''}\n     👤 ${c.commit.author.name} @ ${new Date(c.commit.author.date).toLocaleDateString('zh-CN')}`
      }).join('\n')
      return `✅ 提交历史获取成功\n\n最近 ${data.length} 条提交:\n\n${commits}`
    }
  },
])

// AI 项目数据
const aiProjects = ref(aiProjectsData)

// 统计
const allTests = computed(() => [...mcpTests.value, ...networkTests.value, ...articleTests.value, ...githubTests.value])
const passed = computed(() => allTests.value.filter(t => t.status === 'success').length)
const failed = computed(() => allTests.value.filter(t => t.status === 'error').length)
const pending = computed(() => allTests.value.filter(t => t.status === 'pending').length)
const total = computed(() => allTests.value.length)
const passRate = computed(() => total.value > 0 ? Math.round((passed.value / total.value) * 100) : 0)

const testingAll = ref(false)

async function runTest(test: TestCase) {
  test.status = 'running'
  test.result = ''
  addLog(`开始: ${test.name}`)
  try {
    const result = await test.fn()
    test.result = result
    test.status = 'success'
    addLog(`✅ ${test.name}`, 'success')
  } catch (err: any) {
    test.result = err.message || String(err)
    test.status = 'error'
    addLog(`❌ ${test.name}: ${err.message}`, 'error')
  }
}

async function testAll() {
  testingAll.value = true
  logs.value = []
  addLog('🚀 开始批量测试...')
  for (const test of allTests.value) {
    await runTest(test)
    await new Promise(r => setTimeout(r, 200))
  }
  testingAll.value = false
  addLog(`✅ 测试完成! 通过: ${passed.value}, 失败: ${failed.value}`, 'success')
}

function getCategoryProgress(cat: string) {
  const tests = allTests.value.filter(t => t.category === cat)
  const done = tests.filter(t => t.status !== 'pending').length
  return tests.length > 0 ? (done / tests.length) * 100 : 0
}

function getCategoryStats(cat: string) {
  const tests = allTests.value.filter(t => t.category === cat)
  const done = tests.filter(t => t.status === 'success').length
  return `${done}/${tests.length}`
}
</script>

<style scoped>
.tool-tester-3d {
  position: relative;
  min-height: 100vh;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
  color: #e4e4e7;
  overflow-x: hidden;
}

.tool-tester-3d.dark-mode {
  --bg-primary: #0a0a0f;
  --bg-secondary: rgba(255, 255, 255, 0.05);
  --border-color: rgba(255, 255, 255, 0.1);
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  --accent-primary: #8b5cf6;
  --accent-secondary: #06b6d4;
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
}

/* 背景效果 */
.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%);
  top: -200px;
  right: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%);
  bottom: -100px;
  left: -100px;
  animation-delay: -5s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(50px, -50px) scale(1.1); }
  50% { transform: translate(-30px, 30px) scale(0.95); }
  75% { transform: translate(40px, 40px) scale(1.05); }
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse at center, black 40%, transparent 70%);
}

/* 头部 */
.header-3d {
  position: relative;
  text-align: center;
  margin-bottom: 3rem;
  z-index: 1;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #8b5cf6, #06b6d4);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
  animation: logo-pulse 3s ease-in-out infinite;
}

.logo-icon svg {
  width: 32px;
  height: 32px;
  color: white;
}

@keyframes logo-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 15px 50px rgba(139, 92, 246, 0.5); }
}

.title-3d {
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0;
  display: flex;
  gap: 0.5rem;
}

.title-gradient {
  background: linear-gradient(135deg, #8b5cf6, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-outline {
  color: transparent;
  -webkit-text-stroke: 2px rgba(255, 255, 255, 0.8);
}

.subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
}

.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-3d {
  position: relative;
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  transform-style: preserve-3d;
}

.btn-3d:hover:not(:disabled) {
  transform: translateY(-3px) scale(1.02);
}

.btn-3d:active:not(:disabled) {
  transform: translateY(-1px) scale(0.98);
}

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6, #06b6d4);
  color: white;
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 15px 40px rgba(139, 92, 246, 0.5);
}

.btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.btn-3d:hover .btn-shine {
  transform: translateX(100%);
}

.btn-theme {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 1rem;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-icon {
  font-size: 1.2rem;
}

/* 统计面板 */
.stats-section {
  margin-bottom: 3rem;
  position: relative;
  z-index: 1;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.stat-card-3d {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s ease;
  overflow: hidden;
}

.stat-card-3d:hover {
  transform: translateY(-5px);
  border-color: rgba(255, 255, 255, 0.2);
}

.stat-card-3d.success {
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.1);
}

.stat-card-3d.error {
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.1);
}

.stat-card-3d.pulse {
  animation: card-pulse 2s ease-in-out;
}

@keyframes card-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.5rem;
}

.stat-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #8b5cf6, #06b6d4);
  transition: width 0.5s ease;
}

/* 分类区域 */
.test-categories {
  position: relative;
  z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
}

.category-section {
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.category-section:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.category-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.category-icon {
  font-size: 1.8rem;
}

.category-header h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  flex: 1;
}

.category-progress {
  width: 100px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #06b6d4);
  transition: width 0.5s ease;
}

.category-count {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  min-width: 50px;
  text-align: right;
}

.toggle-icon {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  transition: transform 0.3s ease;
}

.toggle-icon.open {
  transform: rotate(180deg);
}

/* 测试网格 */
.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  padding: 0 2rem 2rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
  padding: 0 2rem 2rem;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding: 0;
}

/* 日志面板 */
.log-panel {
  position: fixed;
  bottom: 0;
  right: 2rem;
  width: 450px;
  max-height: 60vh;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px 16px 0 0;
  z-index: 100;
  transform: translateY(calc(100% - 50px));
  transition: transform 0.3s ease;
}

.log-panel.open {
  transform: translateY(0);
}

.log-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.log-count {
  background: #8b5cf6;
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.8rem;
}

.log-content {
  padding: 1rem;
  max-height: calc(60vh - 60px);
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 0.85rem;
  border-radius: 8px;
  margin-bottom: 0.3rem;
}

.log-item.success { background: rgba(16, 185, 129, 0.1); }
.log-item.error { background: rgba(239, 68, 68, 0.1); }

.log-time {
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
  font-size: 0.75rem;
}

.log-badge {
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.log-badge.success { background: rgba(16, 185, 129, 0.3); color: #10b981; }
.log-badge.error { background: rgba(239, 68, 68, 0.3); color: #ef4444; }
.log-badge.info { background: rgba(139, 92, 246, 0.3); color: #8b5cf6; }

.log-msg {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
}

@media (max-width: 768px) {
  .tool-tester-3d {
    padding: 1rem;
  }
  
  .title-3d {
    font-size: 2rem;
  }
  
  .test-grid,
  .projects-grid {
    grid-template-columns: 1fr;
    padding: 0 1rem 1rem;
  }
  
  .log-panel {
    right: 0;
    left: 0;
    width: auto;
    border-radius: 0;
  }
}
</style>
