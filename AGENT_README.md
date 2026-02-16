# 🤖 MetaUniverse Agent Runtime

MetaBlog 的 AI-Native 增强版本，实现从静态博客到自主进化智能体的跨越。

## ✨ 核心特性

### 🎯 三种编辑模式

| 模式 | 图标 | 描述 |
|------|------|------|
| **MANUAL** | 👤 | 完全手动编辑，与传统编辑器一致 |
| **COLLAB** | 🤝 | AI 实时协作，提供行内建议和上下文感知 |
| **AGENT** | 🤖 | Agent 托管模式，用户只输入指令 |

### 🧠 内置技能

- **WriteArticle**: 自动撰写文章，生成 Front Matter
- **EditContent**: 智能编辑、扩写、简化、重写
- **ResearchWeb**: 多源网络研究（Arxiv、Google）
- **UpdateGraph**: 自动更新知识图谱
- **CodeExplain**: 为代码生成教学文档
- **AnswerQuestion**: 基于知识库回答
- **Summarize**: 生成文章摘要

### 💬 AIChatOrb

全局悬浮的智能助手：
- 上下文感知（当前页面、选中文字）
- 快捷操作（续写、搜索、总结）
- 实时状态显示（思考中、执行中）
- 成本追踪

### 📜 融合历史

HistoryViewer-AGI 同时展示：
- 人工编辑历史（蓝色标记）
- Agent 操作历史（紫色标记）
- 任务执行时间轴
- Token 和成本统计

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run docs:dev
```

### 3. 使用 Agent 功能

1. 打开任意文章页面
2. 点击右下角的 🤖 悬浮球
3. 输入指令，如：
   - "写一篇关于 Transformer 的文章"
   - "帮我总结这篇文章"
   - "搜索相关资料"

### 4. 在编辑器中使用

1. 点击"编辑"按钮打开编辑器
2. 切换顶部的模式开关：
   - 👤 人工：传统编辑
   - 🤝 协作：AI 实时建议
   - 🤖 托管：Agent 自动执行

## 🏗️ 项目结构

```
docs/.vitepress/
├── agent/                    # Agent Runtime 核心
│   ├── core/                 # 智能编排层
│   │   ├── AgentRuntime.ts   # 核心运行时
│   │   ├── IntentRouter.ts   # 意图解析
│   │   ├── StateMachine.ts   # 状态机
│   │   └── types.ts          # 类型定义
│   ├── skills/               # 技能引擎
│   │   ├── SkillEngine.ts    # 技能管理
│   │   └── builtin.ts        # 内置技能
│   ├── memory/               # 记忆管理
│   │   └── MemoryManager.ts  # 记忆管理器
│   ├── runtime/              # 运行时
│   │   ├── Logger.ts         # 日志系统
│   │   └── CostTracker.ts    # 成本追踪
│   ├── memory/               # 存储目录
│   │   ├── tasks/            # 任务历史
│   │   ├── entities/         # 知识实体
│   │   └── context/          # 短期记忆
│   └── ARCHITECTURE.md       # 架构文档
└── theme/components/agent/   # Vue 组件
    ├── AIChatOrb.vue         # 悬浮球
    ├── GlobalPageEditorAGI.vue  # 增强编辑器
    ├── HistoryViewerAGI.vue     # 增强历史
    └── ...
```

## ⚙️ 配置

### 环境变量

```bash
# .env
AGENT_API_KEY=your_api_key      # LLM API 密钥
AGENT_MODEL=gpt-4              # 默认模型
AGENT_BUDGET=10                # 每日预算（美元）
```

### 自定义技能

```typescript
// 在 agent/skills/custom.ts
import { Skill } from '../core/types'

export const MySkill: Skill = {
  name: 'MySkill',
  description: '自定义技能',
  intentPattern: /匹配模式/,
  requiredParams: ['input'],
  handler: async (ctx, params) => {
    // 你的逻辑
    return { success: true, data: {}, tokensUsed: 0, cost: 0 }
  }
}

// 在 theme/index.ts 注册
import { MySkill } from '../agent/skills/custom'
agent.registerSkill(MySkill)
```

## 📊 成本追踪

Agent Runtime 自动追踪：
- Token 使用量
- API 调用成本
- 按任务统计
- 每日预算警告

查看成本报告：
```typescript
const costTracker = agent.getCostTracker()
console.log(costTracker.getCostStats())
console.log(costTracker.exportReport())
```

## 🔍 调试

### 查看日志

```typescript
const logger = agent.getLogger()
logger.getLogs('info')           // 获取 info 级别日志
logger.getLogs(undefined, taskId) // 获取特定任务日志
```

### 检查状态

```typescript
console.log(agent.getCurrentState())  // 当前状态
console.log(agent.getCurrentTask())   // 当前任务
```

## 🛣️ 路线图

- [x] 核心 Agent Runtime 架构
- [x] Intent Router 和 Skill Engine
- [x] Memory Manager 和 RAG
- [x] AIChatOrb 和增强编辑器
- [x] 融合历史查看器
- [ ] 真实 LLM 集成
- [ ] 向量数据库存储
- [ ] 可视化知识图谱编辑器
- [ ] 自动化工作流
- [ ] 多 Agent 协作

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可

MIT License

---

> "让博客成为一个自生长的数字生命体"
