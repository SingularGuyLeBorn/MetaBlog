# 场景三：GitHub 代码审查与文档生成

## 场景描述

当 GitHub 仓库有新的 PR 提交时，自动进行代码审查并生成审查报告。

## 参与角色

- **代码审查 Agent**：专门的代码分析 Agent
- **EventBus**：监听 GitHub Webhook 事件
- **工具**：github_get_repo、github_get_file_content、analyze_code、create_article
- **触发方式**：事件触发（GitHub Webhook）

## 完整流程

### 步骤 1：配置代码审查 Agent

```typescript
const codeReviewAgent = {
  id: 'agent-code-review-001',
  name: '代码审查助手',
  avatar: '👨‍💻',
  description: '自动进行代码审查，发现潜在问题',
  level: 'custom',
  skills: ['code_review', 'github_analysis'],
  systemPrompt: `你是一个资深的代码审查专家，擅长发现代码中的问题和改进点。

审查维度：
1. **代码风格**：是否符合规范
2. **潜在Bug**：空指针、资源泄露等
3. **性能问题**：算法复杂度、内存使用
4. **安全漏洞**：SQL注入、XSS等
5. **可维护性**：可读性、复杂度

输出格式：
- 问题级别：🔴 严重 / 🟡 警告 / 🟢 建议
- 问题描述：具体说明
- 代码位置：文件和行号
- 修复建议：如何改进`,
  runtime: {
    model: 'kimi-k2.5',
    temperature: 0.3  // 降低温度，更严谨
  },
  triggers: [{
    type: 'event',
    name: 'PR创建时审查',
    enabled: true,
    config: {
      eventName: 'github.pr.created',
      eventFilter: {
        repo: 'my-org/my-repo'  // 只监听特定仓库
      }
    }
  }]
}
```

### 步骤 2：设置 GitHub Webhook

在 GitHub 仓库设置中配置 Webhook：

```yaml
# Webhook 配置
Payload URL: https://metablog.example.com/api/webhook/github
Content type: application/json
Secret: your-webhook-secret

# 监听事件
- Pull requests
- Pull request reviews
```

后端接收 Webhook：

```typescript
// server/routes/webhook.ts
router.post('/github', async (req, res) => {
  const event = req.headers['x-github-event']
  const payload = req.body
  
  // 验证签名
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }
  
  // 发出系统事件
  if (event === 'pull_request' && payload.action === 'opened') {
    eventBus.emitEvent('github.pr.created', {
      repo: payload.repository.full_name,
      prNumber: payload.pull_request.number,
      title: payload.pull_request.title,
      author: payload.pull_request.user.login,
      branch: payload.pull_request.head.ref,
      url: payload.pull_request.html_url
    })
  }
  
  res.json({ success: true })
})
```

### 步骤 3：事件触发审查

当 PR 创建时，EventBus 匹配到对应的 Agent：

```typescript
// EventBus 处理
async function handleEvent(event: SystemEvent) {
  const matchingAgents = await findMatchingAgents(event)
  
  for (const { agent, trigger } of matchingAgents) {
    // 匹配成功，执行 Agent
    await executeAgent(agent, {
      eventData: event.payload
    })
  }
}
```

### 步骤 4：Agent 执行代码审查

```typescript
async function performCodeReview(eventData: Record<string, any>) {
  const { repo, prNumber, branch } = eventData
  
  // 1. 获取 PR 文件列表
  const files = await executeTool('github_get_pr_files', {
    owner: repo.split('/')[0],
    repo: repo.split('/')[1],
    prNumber
  })
  
  const reviewResults: Array<{
    file: string
    issues: Array<{
      severity: 'error' | 'warning' | 'info'
      line: number
      message: string
      suggestion: string
    }>
  }> = []
  
  // 2. 逐文件审查
  for (const file of files) {
    if (file.status === 'removed') continue
    
    // 获取文件内容
    const content = await executeTool('github_get_file_content', {
      owner: repo.split('/')[0],
      repo: repo.split('/')[1],
      path: file.filename,
      ref: branch
    })
    
    // 3. AI 分析代码
    const analysisPrompt = `
审查以下代码，找出问题和改进点：

文件：${file.filename}

\`\`\`
${content}
\`\`\`

检查项：
1. 代码风格和格式
2. 潜在的运行时错误
3. 性能问题
4. 安全漏洞
5. 可维护性问题

以 JSON 格式输出：
[
  {
    "severity": "error|warning|info",
    "line": 行号,
    "message": "问题描述",
    "suggestion": "修复建议"
  }
]
`
    
    const analysis = await aiService.sendMessage({
      messages: [{ role: 'user', content: analysisPrompt }]
    })
    
    // 4. 解析 AI 返回的结果
    const issues = parseAIResponse(analysis)
    
    if (issues.length > 0) {
      reviewResults.push({
        file: file.filename,
        issues
      })
    }
  }
  
  return reviewResults
}
```

### 步骤 5：生成审查报告

```typescript
// 格式化审查结果
function formatReviewReport(results: any[], eventData: any): string {
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0)
  const errors = results.reduce((sum, r) => sum + r.issues.filter((i: any) => i.severity === 'error').length, 0)
  const warnings = results.reduce((sum, r) => sum + r.issues.filter((i: any) => i.severity === 'warning').length, 0)
  
  let report = `# 代码审查报告

## 基本信息

- **PR**: [#${eventData.prNumber}](${eventData.url})
- **标题**: ${eventData.title}
- **作者**: @${eventData.author}
- **分支**: \`${eventData.branch}\`

## 审查概览

- 审查文件数: ${results.length}
- 发现问题数: ${totalIssues}
  - 🔴 严重: ${errors}
  - 🟡 警告: ${warnings}
  - 🟢 建议: ${totalIssues - errors - warnings}

## 详细问题

`

  for (const result of results) {
    report += `### ${result.file}\n\n`
    
    for (const issue of result.issues) {
      const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🟢'
      report += `${icon} **第 ${issue.line} 行**\n\n`
      report += `问题: ${issue.message}\n\n`
      report += `建议: ${issue.suggestion}\n\n`
      report += `---\n\n`
    }
  }
  
  report += `## 总结\n\n`
  report += generateSummary(results)
  
  return report
}

// 创建审查报告文章
const reportContent = formatReviewReport(reviewResults, eventData)

await executeTool('create_article', {
  title: `代码审查报告 - PR #${eventData.prNumber}`,
  path: `reviews/pr-${eventData.prNumber}-review.md`,
  content: reportContent,
  tags: ['代码审查', 'PR', eventData.repo],
  category: '开发'
})
```

### 步骤 6：提交 PR 评论

```typescript
// 将审查结果提交到 GitHub PR
await executeTool('github_create_pr_comment', {
  owner: repo.split('/')[0],
  repo: repo.split('/')[1],
  prNumber,
  body: `## 🤖 自动化代码审查报告

发现 ${totalIssues} 个问题，详细报告已生成：
[查看完整报告](/reviews/pr-${prNumber}-review.md)

### 概览
${errors > 0 ? `🔴 严重问题: ${errors} 个\n` : ''}
${warnings > 0 ? `🟡 警告: ${warnings} 个\n` : ''}
${totalIssues - errors - warnings > 0 ? `🟢 建议: ${totalIssues - errors - warnings} 个\n` : ''}

请及时修复 🔴 严重问题。
`
})
```

## 实际案例

### 审查发现的典型问题

**1. 潜在的内存泄露**
```typescript
// 🔴 严重 - 第 45 行
useEffect(() => {
  const interval = setInterval(fetchData, 5000)
  // 缺少 cleanup
}, [])

// 建议修复
useEffect(() => {
  const interval = setInterval(fetchData, 5000)
  return () => clearInterval(interval)  // ✅ 添加 cleanup
}, [])
```

**2. SQL 注入风险**
```typescript
// 🔴 严重 - 第 23 行
const query = `SELECT * FROM users WHERE id = ${userId}`

// 建议修复
const query = 'SELECT * FROM users WHERE id = ?'
await db.query(query, [userId])  // ✅ 使用参数化查询
```

**3. 性能优化建议**
```typescript
// 🟡 警告 - 第 67 行
const filtered = items.filter(i => i.active).map(i => i.name)

// 建议优化
const filtered = items
  .filter(i => i.active)
  .map(i => i.name)  // 如果数据量大，考虑使用 for 循环
```

## 配置进阶

### 自定义审查规则

```typescript
const customRules = {
  typescript: {
    'no-any': { severity: 'warning' },
    'explicit-return-type': { severity: 'info' },
    'max-function-lines': { severity: 'warning', value: 50 }
  },
  security: {
    'no-eval': { severity: 'error' },
    'no-inner-html': { severity: 'error' },
    'sql-injection': { severity: 'error' }
  }
}
```

### 忽略特定文件

```typescript
const ignorePatterns = [
  '**/*.test.ts',      // 测试文件
  '**/node_modules/**', // 依赖
  '**/dist/**',         // 构建输出
  '**/*.config.ts'      // 配置文件
]
```

## 效果

每次有新的 PR 提交时：

1. 🔔 自动触发审查流程
2. 🔍 逐文件分析代码
3. 🧠 AI 智能发现问题
4. 📝 生成详细报告
5. 💬 PR 内自动评论

提升代码质量，减少人工审查工作量。
