# 渐进式披露策略（Progressive Disclosure）

## 核心原则

参考 OpenAI 官方最佳实践与 MCP 社区共识：
- **OpenAI 官方**: "Aim for fewer than 20 functions available at the start of a turn"
- **MCP 专家**: "No more than 10-15 tools at a time"
- **graph-tool-call 项目**: 248 tools → 只传 5 个，token 减少 79%
- **Semantic Routing**: "Instead of loading fifty tools, load a single router tool"

## 三层渐进式披露

### Layer 0: 核心工具层（始终暴露 schema，~7个）

```
searchCapabilities   ← 能力发现器（搜索工具/Skill，自动激活匹配工具 schema）
loadSkill            ← 工作流加载器（加载 Skill 指导，自动激活关联工具 schema）
getAllTools         ← 工具目录浏览（文本形式，不暴露 schema）
getAllSkills        ← Skill 目录浏览（文本形式，不暴露 schema）
getCurrentTime      ← 通用基础工具
calculate             ← 通用基础工具
webSearch            ← 通用网络搜索
```

**设计理由**: 
- 从 76 个工具降到 7 个，符合社区"< 20 个"的建议
- 减少 context bloat（工具定义占 40-50% context）
- 降低 LLM 选择困惑，提高工具调用准确率

### Layer 1: 领域工具层（默认隐藏，动态激活，~69个）

```
GitHub 工具（25个）: github_get_repo, github_list_pulls, github_create_issue, ...
飞书工具（12个）: feishuDocCreate, feishuDocRead, feishuImSend, ...
语雀工具（9个）: yuqueDocCreate, yuqueDocRead, yuqueSearch, ...
学术工具（8个）: searchArxiv, fetchArxiv, searchSemanticScholar, ...
平台解析（9个）: parseZhihu, parseXiaohongshu, parseWechat, ...
文章管理（6个）: createArticle, getArticleContent, updateArticle, ...
笔记工具（3个）: createNote, listNotes, queryKnowledge
文件工具（3个）: readFile, writeFile, listFiles
文本处理（3个）: summarizeText, formatText, translateText
代码工具（2个）: executeCode, analyzeCode
网络工具（1个）: fetchUrl
系统工具（3个）: getWeather, testEcho
```

**激活机制**:

#### 方式 A: searchCapabilities 激活
```
Round 1: 用户"帮我查 GitHub 仓库 stars"
  → 暴露 schema: [searchCapabilities, loadSkill, webSearch, ...] （7个核心）
  → 模型调用: searchCapabilities(keyword="github repo stars")
  → 执行器返回: { ..., activateTools: ["github_get_repo", "github_list_repos"] }
  → 系统: sessionActiveTools.add("github_get_repo", "github_list_repos")

Round 2: 
  → 暴露 schema: [核心7个 + github_get_repo + github_list_repos]（9个）
  → 模型调用: github_get_repo(owner="xxx", repo="xxx")
  → 执行，返回结果，模型回复用户
```

#### 方式 B: loadSkill 激活
```
Round 1: 用户"帮我做一个完整的 PR 审查"
  → 暴露 schema: [核心7个]
  → 模型调用: loadSkill(skill_id="github-pr-review")
  → 执行器返回: { ..., activateTools: ["github_get_pull", "github_list_pulls", ...], injectMessages: [...] }
  → 系统: sessionActiveTools.add(所有 GitHub PR 工具)
  
Round 2:
  → 暴露 schema: [核心7个 + GitHub PR 工具]
  → 模型基于 injectMessages 中的 Skill 指导，调用具体工具
```

### Layer 2: Skill 内容层（按需注入，LOD-2）

- 通过 `loadSkill` 工具执行后，通过 `injectMessages` 注入完整 Skill 内容
- 仅影响当前会话，不增加全局 token 开销

## 实现架构

```
┌─────────────────────────────────────────────────────────────┐
│  chatStore.ts / skillIntegratedService.ts                     │
│  availableTools: CORE_TOOL_NAMES （默认只传核心工具）          │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  aiService.chatStream()                                      │
│  sessionActiveTools = new Set()                              │
│  buildDynamicToolContext() = CORE_TOOL_NAMES + sessionActive  │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  chatStreamInternal()                                        │
│  tools = allDefs.filter(d => availableTools.includes(d.name)) │
│  ← 只暴露 availableTools 中的工具 schema                     │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
                    [模型推理...]
                          ↓
                    [调用 searchCapabilities]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  searchCapabilities 执行器                                   │
│  return { ..., activateTools: ["github_get_repo", ...] }     │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  aiService 工具调用循环                                       │
│  for (const toolName of result.activateTools) {              │
│    sessionActiveTools.add(toolName)                          │
│  }                                                           │
│  // 下轮 buildDynamicToolContext() 自动包含新激活的工具       │
└─────────────────────────────────────────────────────────────┘
```

## 关键代码路径

| 文件 | 职责 |
|------|------|
| `src/theme/tools/types.ts` | `ToolResult.activateTools?: string[]` |
| `src/theme/tools/index.ts` | `CORE_TOOL_NAMES` 常量导出 |
| `src/theme/tools/searchCapabilities/executors.ts` | 返回 `activateTools: 匹配工具名列表` |
| `src/theme/tools/loadSkill/executors.ts` | 返回 `activateTools: skill.tools` |
| `src/theme/tools/registry.ts` | `executeToolWithRecord` 传递 `activateTools` |
| `src/theme/api/services/aiService.ts` | `sessionActiveTools` + `buildDynamicToolContext()` |
| `src/theme/stores/chatStore.ts` | `availableTools: CORE_TOOL_NAMES` |
| `src/theme/api/services/skillIntegratedService.ts` | `availableTools: CORE_TOOL_NAMES` |
| `src/theme/skills/promptBuilder.ts` | System Prompt 引导语说明 schema 分层 |

## 向后兼容

- 如果外部显式传入 `toolContext.availableTools`，则尊重外部配置
- `aiService.ts` 中的 `buildDynamicToolContext()` 基于外部 `toolContext` 构建，保留所有其他字段
- 仅在 `availableTools` 未传入时默认使用 `CORE_TOOL_NAMES`

## 效果预期

| 指标 | 修改前 | 修改后 | 改善 |
|------|--------|--------|------|
| 每轮暴露工具数 | 76 | 7 ~ 15 | ↓ 80% |
| 工具定义 token | ~40-50% context | ~5-10% context | ↓ 75% |
| LLM 选择困惑 | 高（76选1） | 低（7-15选1） | ↓ |
| 首次响应延迟 | 高 | 低 | ↓ |
