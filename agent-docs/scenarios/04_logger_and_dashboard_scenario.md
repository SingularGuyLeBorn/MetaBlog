# 核心场景体检报告 04：全视之眼（日志系统与 Dashboard 监控）

> 📊 **详细技术体检报告**: [../health-report/04_logger_dashboard_health_report.md](../health-report/04_logger_dashboard_health_report.md)
> 
> **致未来的系统守望者：**
> 在黑夜里穿行的机器如果没有轨迹记录，就是一枚随时脱靶的巡航导弹。MetaBlog 的监控架构被一分为二：底层是深埋在硬盘深处的 `winston` 轮转结构化日志，外层则是极具科幻感、仅在开发态生效的“控制舱室”（Agent Dashboard）。当你追踪幽灵 Bug 或评估成本时，这里是你的“黑匣子”与“指挥塔”。

---

## 🧭 场景定位：系统的透视镜

该系统不产生业务动作，而是旁路监听、窃取、固化三大执行场景里的所有“心跳、发呆与失控”。
- **文件与日志层**: `.vitepress/agent/runtime/` 下的 `StructuredLogger` 系列。
- **可视化 UI 层**: `.vitepress/theme/components/agent/AgentDashboard.vue`。

## 🧬 生命周期与数据流转

### 步骤 1：日志的结构化生成与落盘 (ServerLogger)

日志体系采用了严肃的**服务端前置隔离**。你在浏览器（Client）能拿到的 Logger 几乎是空的，所有的重量级写卡操作全在运行时（Server）。

- **执行主干**: `StructuredLogger.server.ts`
- **挂载底座**: `winston` 与 `winston-daily-rotate-file`。
- **生命注入**:
  - 初始化时生成随机的 `sessionId`。
  - 接管每条日志的 `event`、`message`、`actor`（human/ai/system）、`component` 等元数据。
- **落盘网络**:
  - **路径**: `.vitepress/agent/logs/` 目录下。
  - **规则**: `maxFiles: '7d'`（七天轮转过期）。
  - **产物**: 流水账写进 `app-YYYY-MM-DD.log`，错误红标进 `error-YYYY-MM-DD.log`，而 Node 层的抛硬币灾难（未捕获异常 / Promise Rejection）则直接进了 `exceptions` 和 `rejections` 文件。

### 步骤 2：聚合、统计与数据清洗 (Server Log Queries)

- **能力**: 该日志类不仅仅是“写”，它内置了微型检索引擎（`queryLogs`、`searchLogs`、`getStats`）。
- **流转细节**:
  - 它通过 Node 的 `fs.createReadStream` 与 `readline` 逐行扫描近几日的 `.log` 文件，解析成 `StructuredLogEntry` 对象。
  - **组装 API**: 最终这批函数被挂载在了类似 `/api/logs/recent` 或 `/api/system/resources` 的服务端路由上，等待前端指挥塔的呼唤。

### 步骤 3：指挥塔的数据抽水机 (Dashboard Polling)

转到前端视界，`AgentDashboard.vue` 像雷达扫描一样进行着高频轮询。

- **触发机制**: `onMounted` 时设定了 `setInterval` 5秒一刷 (`refreshInterval`)。
- **数据链路**:
  1. `loadTasks()`: 调取 `/api/agent/tasks` -> 更新大屏的“任务核心”状态与环形进度条。
  2. `loadActivities()`: 调取 `/api/logs/recent?limit=20` -> 更新底部的“活动日志流时间轴”。
  3. `checkHealth()`: 调取 `/api/health` -> 检查 LLM / Memory / Filter / Git 组件的探针结果，点亮或熄灭红色警报。
  4. `updateResourceUsage()`: 调取 `/api/system/resources` -> 渲染内存和 CPU 负载光条。
- **渲染特征**: 带动画延迟的舱室 (`chamber`) UI、呼吸脉冲环（Pulse Ring）、全液态视觉包装，数据越过 API 边界后立刻化为跳动的荧光色。

---

## 🛡️ 异常兜底与错误监控

1. **Dashboard 生产环境隔离遮挡（The Prod Blackout)**
   - **机制**: `<div v-if="isProduction">`。
   - 只要 `import.meta.env.PROD` 为 `true`，整个雷达矩阵瞬间黑屏，仅展示 `Agent Dashboard 仅在开发环境可用`（P0-5 修复引入的防壁）。由于日志涉及 Token 后台及各类文件目录绝对路径，在此处的防线截断了任何可能的敏感外泄。
2. **日志读取解析失败（Parser Fallback)**
   - **机制**: `try { JSON.parse(line) } catch { /* 忽略 */ }`。
   - 当遇到因为手动修改、进程异常导致的 JSON 半行断头日志时，读取流会默许其被跳过，保障不会因为某一行毁损，整个追踪系统全盘崩溃。

## 📝 系统级日志留痕

对于“记录日志的日志”，系统在启动的第一时间，会为 Logger 自己烙印下印记：
- `[system.startup] StructuredLogger initialized with Winston` （记录在控制台与基础文件中）。
- 并在每次服务启动时重新附挂 `sessionId` 锚定。

---
*“永远保持它的生命周期独立。日志的心跳不该受外部中断信号（AbortSignal）的牵连。无论任务如何半途而废，最后一声惨叫必须被刻印在 app-date.log 的硅基石板上。—— Digital Evaluator”*
