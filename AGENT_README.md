# 🧬 MetaUniverse AI-Native Blog 架构规格书

## 一、融合架构总览（Hybrid Architecture）

### 1.1 架构哲学升级
**从"数字孪生"到"数字生命体"**

原博客是**静态镜像**（内容展示+人工编辑），新架构是**自主生命体**（内容自生长+人机协同）。保留VitePress的渲染优势，但后端替换为Agent Runtime。

```
┌───────────────────────────────────────────────────────────────────────┐
│                     L5: 人机共生界面层 (Human-AI Interface)              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ BlogFrontend │ │   GlobalPage │ │  AIChatOrb   │ │  Knowledge   │  │
│  │  (保留Vite   │ │   Editor     │ │  (新增悬浮   │ │   Graph      │  │
│  │   Press核心) │ │  (强化版)    │ │   智能体)    │ │ (Cytoscape)  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L4: 智能编排层 (AI Orchestration)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ IntentRouter │ │   Skill      │ │   State      │ │  Memory      │  │
│  │ (意图解析)    │ │   Engine     │ │   Machine    │ │  Manager     │  │
│  │              │ │ (融合写作    │ │ (断点续作)    │ │ (文件化记忆)  │  │
│  │              │ │  编辑技能)   │ │              │ │              │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L3: 工具与感知层 (Tools & Senses)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   WebSearch  │ │   Vditor     │ │    Git       │ │   RAG        │  │
│  │   (增强多源) │ │   Bridge     │ │  Operator    │ │   Engine     │  │
│  │              │ │ (编辑器与    │ │ (原BFF Git   │ │ (替代Mock    │  │
│  │              │ │ Agent的桥梁) │ │  API升级)    │ │  真实向量检索)│  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L2: 运行时与观察层 (Runtime & Observability)        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  GitHub      │ │   Logger     │ │   Cost       │ │   Health     │  │
│  │  Actions     │ │   (结构化    │ │   Tracker    │ │   Checker    │  │
│  │  (Agent身体) │ │   日志系统)  │ │ (Token计费)  │ │ (故障自愈)   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L1: 记忆存储层 (Memory Storage)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Content    │ │   History    │ │   Agent      │ │   Vector     │  │
│  │   Repo       │ │   Backups    │ │   States     │ │   DB         │  │
│  │ (VitePress   │ │ (原history/  │ │ (memory/      │ │ (RAG知识    │  │
│  │   文档)      │ │  目录升级)   │ │  tasks/)     │ │   向量库)    │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.2 保留与增强对照表

| 原有模块 | 保留部分 | AI-Native增强 | 融合方式 |
|---------|---------|--------------|---------|
| **GlobalPageEditor** | Vditor编辑器、自动保存、大纲导航 | Agent协作编辑模式、智能补全、语义重写 | 新增`AgentMode`开关，编辑器右下角显示AI状态指示器 |
| **HistoryViewer** | Git日志展示、Diff对比、回滚 | Agent操作历史、思考链回放、决策点标记 | 时间轴区分"人工Commit"(蓝色)与"AgentCommit"(紫色) |
| **KnowledgeGraph** | Cytoscape可视化、WikiLinks解析 | 自动知识发现、缺失链接建议、实体自动提取 | 新增"AI探索"按钮，Agent自动建议图谱补全 |
| **BFF API** | 文件CRUD、Git自动提交 | Agent任务API、状态查询、成本上报 | 路由前缀区分`/api/ops/`(人工)与`/api/agent/`(智能) |
| **Shadow Files** | 代码文件转Markdown | Agent自动为代码生成解释文档、双向同步 | 保存代码文件时，Agent自动生成/更新`.md`说明 |

---

## 二、核心组件详细规格（AI-Native Edition）

### **组件1：GlobalPageEditor-AGI（增强编辑器）**

**功能定位**：从"在线记事本"升级为"人机协同创作工作站"

**像素级构成**：
```
┌──────────────────────────────────────────────────────────────────┐
│ 顶部工具栏 (Toolbar)                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│ │ 💾 保存      │ │ 👤 人工模式  │ │ 🤖 AI协作   │ │ 🔄 同步   │ │
│ │   (Ctrl+S)   │ │   (当前)     │ │   (切换)    │ │  状态: ✓  │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  编辑区域 (Vditor)                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ # LLM Agent架构设计                                        │ │
│  │                                                            │ │
│  │ ## 核心概念                                                │ │
│  │ Agent是指... [光标在此]                                    │ │
│  │                                                            │ │
│  │ [Agent建议框] 💡 是否基于博客中[[RAG]]文章补充相关链接?      │ │
│  │          [接受] [忽略] [查看相关]                           │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  底部状态栏 (Status Bar) - 新增AI-Native区域                        │
│  ┌────────────────────┬──────────────────┬───────────────────┐  │
│  │ 字数: 1,240        │ 最后保存: 10s前  │ AI上下文: 3篇相关 │  │
│  │                    │                  │ Token: 2.4k/8k    │  │
│  └────────────────────┴──────────────────┴───────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**新增子组件**：

**1.1 AgentModeToggle（模式切换器）**
- **位置**：Toolbar右侧，Switch组件
- **状态**：
  - **MANUAL（人工）**：灰色，编辑器行为与原系统完全一致
  - **COLLAB（协作）**：蓝色渐变，Agent实时监听输入，提供建议
  - **AGENT（托管）**：紫色，用户只输入指令，Agent自动写作（类似之前的Active Mode）
- **切换动画**：300ms过渡，切换时Vditor工具栏动态变化（协作模式显示AI辅助按钮）

**1.2 InlineSuggestion（行内建议）**
- **触发**：用户输入停顿2秒后，Agent分析当前段落
- **UI**：类似GitHub Copilot的灰色幽灵文本，或Notion的AI浮动菜单
- **交互**：
  - `Tab`：接受建议
  - `Esc`：忽略
  - `Ctrl+→`：逐词接受

**1.3 ContextIndicator（上下文指示器）**
- **位置**：Status Bar右侧
- **显示**：
  - 当前Agent关联的Memory片段数（如"基于3篇历史文章"）
  - 剩余Token预算（进度条形式）
  - 点击展开详情：显示具体关联了哪些文章（[[WikiLinks]]形式）

**与原系统集成**：
```typescript
// 在GlobalPageEditor.vue中新增
const editorMode = ref<'MANUAL' | 'COLLAB' | 'AGENT'>('MANUAL');
const agentContext = ref<AgentContext | null>(null);

// 当模式为COLLAB时，监听Vditor输入
watch(vditorContent, debounce((newVal) => {
  if (editorMode.value === 'COLLAB') {
    // 发送给Agent进行语义分析
    agentAPI.analyzeContext(newVal).then(suggestions => {
      renderInlineSuggestions(suggestions);
    });
  }
}, 1500));
```

### **组件2：AIChatOrb（智能体悬浮球）**

**功能定位**：系统的"智能入口"与"全局助手"

**像素级描述**：
```
初始状态（页面右下角）:
┌──────┐
│ 🤖   │  ← 呼吸动画（CSS box-shadow脉冲），hover放大1.1倍
│  orb │    未读通知时显示红点badge
└──────┘

点击后展开（ChatInterface）:
┌─────────────────────────────────────┐
│ MetaUniverse Agent          [—] [×] │
├─────────────────────────────────────┤
│                                     │
│ 🎉 欢迎回到MetaUniverse！            │
│ 当前正在阅读《RAG技术详解》           │
│                                     │
│ 我可以帮您：                          │
│ • 解释文中概念（选中文字后问我）       │
│ • 基于此篇文章生成延伸阅读            │
│ • 检查相关知识的更新（Last: 3天前）    │
│                                     │
├─────────────────────────────────────┤
│ [输入指令...]              [发送]    │
│                                     │
│ 快捷操作：                           │
│ [📝 续写] [🔍 搜索] [📊 总结]       │
│                                     │
└─────────────────────────────────────┘
```

**核心功能**：

**2.1 ContextAwareness（上下文感知）**
- **自动捕获**：
  - 当前页面URL（`router.currentRoute.value.path`）
  - 选中的文字（`window.getSelection().toString()`）
  - 当前文章的WikiLinks（从frontmatter读取）
- **显示**：Chat头部显示"基于《XXX》回答"

**2.2 QuickActions（快捷操作）**
- **📝 续写**：Agent分析文章结尾，生成续写内容，插入到编辑器
- **🔍 搜索**：触发WebSearch，基于当前文章主题搜索最新资料
- **📊 总结**：为当前文章生成执行摘要（TL;DR），保存到frontmatter

**与原系统集成**：
- 通过`Teleport to="body"`全局挂载
- 与GlobalPageEditor通过`mitt`事件总线通信（当Agent生成内容后，发送到编辑器）

### **组件3：MemoryManager（记忆管理器）**

**功能定位**：替代原有简单的Git历史，构建可查询、可关联的知识网络

**存储结构（基于原博客的docs目录）**：
```
docs/
├── .vitepress/
│   ├── memory/                    # 新增：Agent记忆目录（Git跟踪）
│   │   ├── tasks/                 # 任务历史（原checkpoint升级）
│   │   │   └── task_20260215_001.json
│   │   ├── entities/              # 实体库（知识图谱数据源）
│   │   │   ├── concepts.json      # 概念定义（如Transformer）
│   │   │   └── papers.json        # 论文元数据
│   │   ├── context/               # 短期记忆（会话级）
│   │   │   └── sess_abc123.json
│   │   └── skills/                # 技能提示词模板
│   │       └── research.yaml
│   └── history/                   # 保留：原有历史备份
└── posts/                         # 保留：原有文章目录
```

**关键功能**：

**3.1 EntityExtraction（实体提取）**
- **触发**：文章保存时（无论人工还是Agent）
- **处理**：调用LLM提取关键概念、论文引用、人名
- **存储**：写入`memory/entities/concepts.json`
- **关联**：自动更新知识图谱节点（Cytoscape数据源）

**3.2 RAGIndex（向量索引）**
- **构建**：基于原有Shadow文件和Markdown文章，构建向量索引
- **查询**：ChatOrb提问时，先检索相关段落（替代原有Mock数据）
- **存储**：使用`docs/.vitepress/cache/rag/`（大文件不提交Git，CI构建时生成）

### **组件4：SkillEngine（技能引擎）**

**功能定位**：将原有BFF API扩展为Agent可调用的工具集

**技能清单**：

| 技能名 | 对应原功能 | AI-Native增强 | 输入 | 输出 |
|--------|-----------|--------------|------|------|
| **WriteArticle** | 原`POST /api/save-md` | 自动Front Matter生成、内部链接建议 | 主题/大纲 | Markdown文件路径 |
| **EditContent** | 原编辑器保存 | 语义diff、冲突解决 | 修改指令+原路径 | Commit SHA |
| **ResearchWeb** | 新增 | 多源搜索、可信度评分 | 查询词 | 结构化资料包 |
| **UpdateGraph** | 原WikiLinks解析 | 自动发现缺失链接、建议新知识连接 | 文章路径 | 图谱更新补丁 |
| **CodeExplain** | 原Shadow文件生成 | 为代码生成教学文档 | 代码文件路径 | 伴生Markdown |

**与原系统融合**：
- Skill的执行最终调用原有的BFF API（如保存文件仍走`/api/save-md`）
- 但增加了前置的Agent逻辑（如生成内容、决策判断）

---

## 三、像素级场景重构（8大融合场景）

### **场景一：人工写作 + AI建议（COLLAB模式）**

**用户旅程**：作者在原有编辑器中写作，AI实时协助

**T+00:00** - 进入编辑页
- **URL**：`blog.domain.com/posts/llm-agent.html`
- **UI状态**：GlobalPageEditor加载，默认模式`MANUAL`（与原系统一致）
- **用户动作**：点击Toolbar右侧"🤖 AI协作"开关，切换为`COLLAB`模式

**T+00:01** - 初始化Agent上下文
- **API调用**：`POST /api/agent/context/init` with `{ path: 'posts/llm-agent.md' }`
- **后端处理**：
  - `MemoryManager`读取该文章的历史版本和关联实体
  - `RAGIndex`检索相似文章（构建上下文）
- **UI更新**：Status Bar显示"AI就绪 | 上下文：5篇相关文章"

**T+00:30** - 用户写作中获得建议
- **用户输入**：键入`[[Attention Mechanism]]`（使用原有WikiLinks语法）
- **Agent反应**（Debounce 1秒后）：
  1. **检测**：`IntentParser`识别到WikiLink，但知识图谱中该节点孤立（无其他文章链接）
  2. **建议**：通过`InlineSuggestion`在光标下方显示：
     ```
     💡 发现未关联的知识节点
     建议：
     [创建解释文章] [链接到现有文章《Transformer详解》] [忽略]
     ```
- **用户交互**：点击[创建解释文章]
- **系统动作**：
  - `SkillEngine`调用`WriteArticle`技能
  - Agent自动生成《Attention Mechanism详解》大纲
  - 在`posts/`目录创建新文件（与原系统文件创建流程一致）
  - 自动在原文插入`[[Attention Mechanism|Attention Mechanism详解]]`

**T+05:00** - 保存与记忆更新
- **用户动作**：Ctrl+S保存（与原系统一致）
- **增强流程**：
  - 原流程：调用`/api/save-md` → Git Commit
  - 新增：Agent自动提取本文新实体（如"Multi-Head Attention"），更新`memory/entities/concepts.json`
  - 自动建议："检测到您引用了论文《Attention is All You Need》，是否添加到参考文献列表？"

---

### **场景二：Agent深度研究 + 原History系统融合**

**用户旅程**：通过ChatOrb触发深度研究，全流程可回溯

**T+00:00** - 触发研究
- **位置**：用户在阅读`/papers/transformer.html`，点击ChatOrb
- **输入**：`基于这篇论文，搜索近一年的改进工作，写一篇综述放到knowledge/llm/`

**T+00:05** - Agent启动与原History系统记录
- **差异点**：不同于之前纯GitHub Actions方案，这里利用原博客的`HistoryViewer`机制
- **执行**：
  - Agent创建任务`task_20260215_002`，状态`RESEARCHING`
  - 在`docs/.vitepress/history/agent/`目录创建任务日志（与原人工编辑历史分开，但同构）
  - HistoryViewer自动索引该目录，用户可在"历史"面板看到Agent操作记录

**T+03:00** - 查看Agent思考过程（HistoryViewer增强）
- **UI**：用户打开右侧History面板（原有组件）
- **新增标签页**："Agent Runs"（与原"File History"、"Folder History"并列）
- **显示内容**：
  ```
  Agent Task: task_20260215_002 (进行中)
  ├── 08:05:12 - 意图解析完成 (查看详情)
  ├── 08:06:30 - 搜索Arxiv: "transformer improvements 2024" (5 results)
  ├── 08:08:45 - 抓取PDF: https://arxiv.org/... (成功)
  ├── 08:10:20 - 生成章节: Introduction (查看生成内容)
  └── [当前] 08:12:00 - 生成章节: Related Work...
  ```
- **交互**：点击任意节点，右侧Diff面板显示该步骤的输入/输出（类似原系统的文件diff，但展示Agent操作）

**T+05:00** - 决策点与人工介入
- **暂停**：Agent生成大纲后暂停（等待用户确认）
- **通知**：ChatOrb闪烁红点，显示"大纲已生成，请审核"
- **UI**：在编辑器区域（GlobalPageEditor）以只读模式显示大纲，提供[继续写作] [修改大纲] [取消]按钮

---

### **场景三：代码文件Shadow + Agent自动文档**

**用户旅程**：上传代码文件，Agent自动生成教学文档（原Shadow文件AI化）

**T+00:00** - 上传代码
- **操作**：用户通过原BFF API上传`transformer.py`到`code/python/`
- **原系统行为**：Shadow文件生成器创建`transformer.py.md`（代码展示）

**T+00:10** - Agent增强（新增）
- **触发**：文件系统监听（`chokidar`）检测到新文件
- **Agent动作**：
  - `SkillEngine`调用`CodeExplain`技能
  - 读取`transformer.py`内容，分析函数、类、关键算法
  - 生成教学文档：不仅展示代码，还添加：
    - "这段代码实现了什么"
    - "关键函数解析"
    - "与博客中[[Transformer]]文章的关系"
- **存储**：生成的Markdown写入`code/python/transformer.py.md`（覆盖原Shadow的简单包装）

**T+00:30** - 知识图谱自动更新
- **Agent**：提取代码中的概念（如`class MultiHeadAttention`），在知识图谱中添加节点`MultiHeadAttention (Code)`，并链接到理论文章`[[Attention Mechanism]]`
- **UI**：用户在KnowledgeGraph中看到新的紫色节点（代码节点），点击可查看代码和解释

---

### **场景四：RAG搜索真实化（替代Mock）**

**用户旅程**：使用原RAGSearch组件，但连接真实后端

**T+00:00** - 打开搜索
- **组件**：`RAGSearch.vue`（原组件，但去除Mock）
- **输入**：用户搜索"如何解决Transformer的长文本问题"

**T+00:01** - 混合检索（新实现）
- **后端**：
  1. **关键词检索**：原博客的`localSearch`索引（基于flexsearch）
  2. **向量检索**：新增`RAGIndex`查询（基于本地向量库`docs/.vitepress/cache/rag/index.bin`）
  3. **Agent排序**：LLM对合并结果进行重排序（Re-rank）
- **结果**：返回博客内文章+外部资料摘要

**T+00:02** - 结果展示（原UI保留）
- **展示**：与原Mock数据一致的卡片式布局
- **增强**：每个结果卡片显示"相关度分数"和"基于哪些章节"
- **交互**：点击结果，Agent自动在ChatOrb中总结该文章要点

---

## 四、系统数据流与存储融合

### **Git提交信息规范（区分人工与AI）**

```bash
# 人工编辑（原系统保留）
git commit -m "content: 更新Transformer章节，补充注意力机制细节
>
> Author: human
> Editor: GlobalPageEditor
> Timestamp: 2026-02-15T10:00:00Z"

# Agent编辑（新增）
git commit -m "agent(task_20260215_001): 生成LLM推理综述章节3
>
> Author: agent
> Model: claude-3-5-sonnet
> Skill: WriteArticle
> Tokens: 2450
> Cost: $0.08
> Parent-Task: task_20260215_001
> Checkpoint: step_12_of_20"
```

### **文件系统权限与隔离**

```
docs/.vitepress/
├── history/           # 原系统：人工编辑历史
│   ├── posts/
│   └── agent/         # 新增：Agent自动备份（与人工历史同构，便于统一查看）
├── memory/            # 新增：Agent记忆（人机可读，可版本控制）
│   └── tasks/
└── cache/             # 新增：构建缓存（RAG向量等，.gitignore）
```

---

## 五、实施路线图（渐进式融合）

### **Phase 1: 基础设施（1-2周）**
- 在原有`docs/.vitepress/`目录添加`memory/`结构
- 将原有`RAGSearch.vue`的Mock替换为真实API（接入OpenAI/DeepSeek）
- **不改动**原有编辑器，先实现ChatOrb作为独立入口

### **Phase 2: 编辑器融合（3-4周）**
- 修改`GlobalPageEditor.vue`，添加`AgentModeToggle`组件
- 实现`COLLAB`模式的基础功能（InlineSuggestion）
- 原有自动保存逻辑不变，新增Agent建议的保存确认（防止AI干扰）

### **Phase 3: Agent工作流（5-6周）**
- 实现GitHub Actions触发逻辑（与之前架构一致）
- 融合HistoryViewer，支持查看Agent操作历史
- 实现Shadow文件+Agent文档生成

### **Phase 4: 知识图谱自主维护（7-8周）**
- Agent自动扫描孤立WikiLinks，建议创建文章
- 自动提取实体，维护`memory/entities/`
- 实现知识图谱的"AI探索"模式（自动高亮潜在关联）

---

## 六、关键融合点总结

1. **存储层统一**：Agent的Memory使用原博客的Git版本控制，任务历史使用原有的HistoryViewer组件查看
2. **编辑器渐进增强**：原有Vditor完全保留，AI功能作为可切换模式（MANUAL/COLLAB/AGENT）
3. **API复用**：Agent保存文件最终调用原有的`/api/save-md`，确保文件系统一致性
4. **可视化复用**：知识图谱Cytoscape组件作为Agent的实体展示界面，HistoryViewer作为Agent操作日志界面
5. **成本可控**：在原有Status Bar增加Token消耗显示，保持用户知情权