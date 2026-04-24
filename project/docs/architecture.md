# MetaBlog Agent 分层控制架构

## 演进路径

```
Level 0: 博客 + AI 问答 (已完成)
    ↓
Level 1: RAG 化 (已完成)
    ↓
Level 2: Agent 化 - 工具封装 (已完成)
    ↓
Level 3: 扩展能力 - Skills, Memory, MCP (已完成)
    ↓
Level 4: 自主运行 - Agent Runtime (本次实现)
    ↓
Level 5: Meta-Agent - 控制其他 Agent (本次实现)
    ↓
Level 6: 报告 Agent - 人机接口 (本次实现)
```

## 架构设计

### 1. Agent Runtime System (Level 4)
支持 Agent 长期自主运行：
- 任务调度器
- 状态持久化
- 心跳检测
- 自动恢复

### 2. Agent Control API (Level 4)
人工干预接口：
- 暂停/恢复 Agent
- 发送即时消息
- 派发新任务
- 查看运行状态

### 3. Meta-Agent (Level 5)
控制其他 Agent 的 Agent：
- Agent 生命周期管理
- 任务分配
- 负载均衡
- 故障转移

### 4. Report Agent (Level 6)
人机接口：
- 收集各 Agent 状态
- 生成报告
- 邮件/消息推送
- 异常告警

## 核心概念

### Agent 状态机
```
[Created] → [Starting] → [Running] → [Paused]
                            ↓
                    [Stopping] → [Stopped]
                            ↓
                        [Error] → [Recovering]
```

### 控制层级
```
Human
  └── Report Agent (Level 6)
        └── Meta-Agent (Level 5)
              ├── Worker Agent 1 (Level 4)
              ├── Worker Agent 2 (Level 4)
              └── Worker Agent 3 (Level 4)
```

### 通信协议
- **Control Channel**: 控制命令（暂停、恢复、停止）
- **Task Channel**: 任务派发
- **Message Channel**: 即时消息
- **Report Channel**: 状态报告

## API 设计

### Agent Runtime API
```typescript
// 启动 Agent
POST /api/agent-runtime/:id/start

// 暂停 Agent
POST /api/agent-runtime/:id/pause

// 恢复 Agent
POST /api/agent-runtime/:id/resume

// 停止 Agent
POST /api/agent-runtime/:id/stop

// 发送消息
POST /api/agent-runtime/:id/message

// 获取状态
GET /api/agent-runtime/:id/status

// 派发任务
POST /api/agent-runtime/:id/task
```

### Meta-Agent API
```typescript
// 注册 Worker Agent
POST /api/meta/register

// 获取所有 Worker 状态
GET /api/meta/workers

// 分配任务给 Worker
POST /api/meta/assign

// 负载均衡配置
POST /api/meta/balance
```

### Report Agent API
```typescript
// 获取系统概览
GET /api/report/overview

// 获取 Agent 报告
GET /api/report/agents

// 配置报告推送
POST /api/report/config

// 手动触发报告
POST /api/report/trigger
```

## CLI 工具

```bash
# 查看所有 Agent 状态
meta-agent status

# 启动 Agent
meta-agent start <agent-id>

# 暂停 Agent
meta-agent pause <agent-id>

# 发送消息给 Agent
meta-agent message <agent-id> "内容"

# 派发任务
meta-agent task <agent-id> --type=content_fetch --params='{"url":"..."}'

# 查看报告
meta-agent report

# 启动 Meta-Agent
meta-agent meta --mode=daemon
```

## 实现计划

1. ✅ 基础 Agent 系统 (已有)
2. ✅ Skills/Memory/MCP (已有)
3. ✅ Task Scheduler (已完成)
4. 🔄 Agent Runtime System (进行中)
5. 🔄 Meta-Agent (进行中)
6. 🔄 Report Agent (进行中)
7. 🔄 CLI 工具 (进行中)
