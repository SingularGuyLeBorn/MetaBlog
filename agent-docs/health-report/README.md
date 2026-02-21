# MetaBlog 场景健康报告目录

> **版本**: v1.0  
> **更新日期**: 2026-02-20

---

## 概述

本目录包含 MetaBlog 四大核心场景的**详细技术体检报告**。每个报告都对场景的完整调用链进行了深入分析，包括：

- **启动与初始化流程**: 系统如何启动、初始化各组件
- **完整调用链**: 从用户输入到最终输出的每一步函数调用
- **涉及文件清单**: 所有参与该场景的文件及其职责
- **错误兜底机制**: 异常情况如何处理
- **目前实现的问题**: 已修复和待修复的问题清单

---

## 报告列表

### 01 - 手动聊天 (Manual Chat)
[01_manual_chat_health_report.md](./01_manual_chat_health_report.md)

**场景描述**: 用户点击 AIChatOrb 输入框进行轻量级对话，AI 仅回答问题而不执行任何文件操作。

**核心流程**:
```
AIChatOrb.vue → chat-service.ts → LLM Provider → readSSEStream → UI 更新
```

**关键文件**:
- `AIChatWindow.vue` - 聊天界面
- `chat-service.ts` - 聊天服务（场景分离判断）
- `llm/utils/stream.ts` - 统一 SSE 流处理
- `llm/factory.ts` - LLM 工厂（7 家供应商）

---

### 02 - 深度 AGI 创作与修改 (Deep AGI Creation)
[02_deep_agi_creation_health_report.md](./02_deep_agi_creation_health_report.md)

**场景描述**: AgentRuntime 完整调用链，从初始化到文件持久化的深度创作流程。

**核心流程**:
```
processInput → parseIntent → executeIntent → Skill Handler → FileSave
     ↓              ↓            ↓              ↓            ↓
UNDERSTANDING → PLANNING → EXECUTING → WriteArticleSkill → saveFile
```

**关键文件**:
- `AgentRuntime.ts` - 核心运行时
- `IntentRouter.ts` - 意图路由
- `StateMachine.ts` - 状态管理
- `builtin.ts` - 7 个内置技能
- `FileLockManager.ts` - 文件锁

---

### 03 - 定时任务自动发布 (Cron Auto-Publish)
[03_cron_auto_publish_health_report.md](./03_cron_auto_publish_health_report.md)

**场景描述**: TaskScheduler 驱动的后台定时任务，自动抓取、评估、发布内容。

**核心流程**:
```
Cron Trigger → TaskScheduler → BackgroundTaskManager → AutoPublisher → Git
     ↓              ↓                  ↓                   ↓           ↓
node-cron    executeScheduled    executeTask        publish()   commit/push/PR
```

**关键文件**:
- `TaskScheduler.ts` - Cron 调度器
- `BackgroundTaskManager.ts` - 任务队列
- `AutoPublisher.ts` - 自动发布
- `ContentEvaluator.ts` - 内容评估

---

### 04 - 日志仪表盘与可视化 (Logger Dashboard)
[04_logger_dashboard_health_report.md](./04_logger_dashboard_health_report.md)

**场景描述**: StructuredLogger 驱动的监控基础设施，支持日志查询、统计、实时流。

**核心流程**:
```
Component → log() → fileOutput/console → /api/logs → AgentDashboard.vue
                ↓
          SSE Stream (/api/logs/stream)
                ↓
         Real-time Update
```

**关键文件**:
- `structured-logger.ts` - 结构化日志记录器
- `config.ts` - API 路由暴露
- `AgentDashboard.vue` - 可视化仪表盘

---

## 阅读指南

### 场景文档 vs 健康报告

| 文档类型 | 内容重点 | 适用读者 |
|---------|---------|---------|
| `scenarios/*.md` | 场景定位、概念描述、高级流程 | 产品经理、系统架构师 |
| `health-report/*.md` | 完整调用链、代码细节、变量传递 | 开发者、调试者 |

### 如何调试

1. **确定场景**: 根据用户行为确定场景编号（01-04）
2. **查阅报告**: 阅读对应的健康报告
3. **定位代码**: 根据"涉及文件清单"找到具体文件
4. **跟踪变量**: 根据"完整调用链"追踪数据流转
5. **检查兜底**: 确认错误处理是否生效

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|-----|------|---------|
| v1.0 | 2026-02-20 | 初始版本，包含 4 个核心场景的健康报告 |
