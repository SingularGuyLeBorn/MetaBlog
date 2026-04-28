# Agent 代码沙箱选型报告

> 目标：为 MetaBlog 平台选择内置的轻量级代码执行沙箱，支持 AI Agent 安全运行 LLM 生成的代码。
> 调研日期：2026-04-23
> 评估维度：隔离强度、启动延迟、资源开销、集成复杂度、功能覆盖、成熟度

---

## 一、候选项目概览

| 项目 | 定位 | 隔离机制 | 启动延迟 | 许可 | 成熟度 |
|------|------|----------|----------|------|--------|
| **OpenSandbox** | 通用沙箱平台 | Docker/K8s + gVisor/Firecracker | ~秒级 | Apache 2.0 | 较新 |
| **ZeroBoot** | 极速 MicroVM | KVM + CoW Fork | **0.79ms** | 未知 | 实验性 |
| **AIOSandbox** | All-in-One 容器 | Docker 容器 | ~秒级 | 未知 | 较新 |
| **BoxLite** | 可嵌入 MicroVM | KVM/HVF 硬件隔离 | ~100ms | Apache 2.0 | 较成熟 |
| **Monty** | 语言级解释器 | Rust 沙箱解释器 | **<1μs** | 未知 | 实验性 |

> **注**："SandboxesForEveryAgent" 是 BoxLite 的 slogan("Sandboxes for every agent")，并非独立项目，本报告将其归入 BoxLite 统一评估。

---

## 二、各项目详细分析

### 2.1 OpenSandbox(阿里巴巴)

**GitHub**: `alibaba/OpenSandbox`  
**定位**：通用沙箱平台，面向 Coding Agent / GUI Agent / RL Training

**核心特性**：
- 多语言 SDK(Python、Java/Kotlin、JS/TS、C#/.NET、Go Roadmap)
- 统一沙箱协议，支持自定义运行时扩展
- 内置 Docker + Kubernetes 运行时，支持大规模分布式调度
- 支持 gVisor、Kata Containers、Firecracker 等安全容器运行时
- 内置浏览器自动化(Chrome、Playwright)、VNC 桌面、VS Code Server
- CNCF Landscape 成员

**部署方式**：
```bash
pip install opensandbox-server
opensandbox-server init-config
opensandbox-server  # 启动服务端
```

**适用场景**：
- 企业级多租户部署
- 需要浏览器自动化 + 代码执行的 All-in-One 场景
- 已有 Kubernetes 基础设施的团队

**局限性**：
- 依赖 Docker/Kubernetes，**不适合纯本地轻量嵌入**
- 启动延迟秒级，不适合高频短任务
- 对 Windows 原生支持有限

---

### 2.2 ZeroBoot

**GitHub**: `zerobootdev/zeroboot`  
**定位**：亚毫秒级 VM 沙箱，通过 CoW Fork 实现极速启动

**核心特性**：
- 基于 Firecracker snapshot + `mmap(MAP_PRIVATE)` 写时复制
- **p50 启动延迟 0.79ms，p99 仅 1.74ms**
- 每个沙箱是独立的 KVM VM(非容器)，硬件级内存隔离
- 内存占用仅 ~265KB / sandbox
- 1,000 并发 fork 仅需 815ms

**性能对比**：

| 指标 | ZeroBoot | Firecracker | Docker | 传统 VM |
|------|----------|-------------|--------|---------|
| 启动 p50 | **0.79ms** | ~150ms | ~200ms | ~27s |
| 启动 p99 | **1.74ms** | ~300ms | ~400ms | ~90s |
| 内存/沙箱 | **~265KB** | ~128MB | ~50MB | ~50MB |

**适用场景**：
- 超高并发、短生命周期的代码执行任务
- CI/CD 流水线并行测试
- 对延迟极度敏感的 Agent 推理工作负载

**局限性**：
- **极早期项目**：GitHub 仅 47 stars，发布 3 个月内
- 未 production-ready，社区生态薄弱
- 需要 Linux + KVM 环境，Windows 仅支持 WSL2
- 无官方声明的许可协议

---

### 2.3 AIOSandbox(ByteDance / agent-infra)

**GitHub**: `agent-infra/sandbox`  
**定位**：All-in-One Agent 沙箱，单容器集成浏览器 + Shell + 文件 + MCP

**核心特性**：
- 单 Docker 容器内集成：Browser、Shell、File、MCP、VS Code Server、Jupyter
- 共享文件系统，支持 Agent 的 Read → Execute → Validate → Fix → Re-run 完整工作流
- SDK 支持 Python、TypeScript、Go
- 内置 `markitdown` MCP 服务(文档转换)

**API 示例**：
```typescript
const sandbox = new Sandbox({ baseURL: 'http://localhost:8080' });
await sandbox.shell.exec({ command: 'python3 process.py' });
await sandbox.browser.screenshot();
await sandbox.jupyter.execute({ code: "print('hello')" });
```

**适用场景**：
- 需要浏览器 + 代码执行一体化的 Agent(如数据采集 + 处理)
- 需要 Jupyter Notebook 交互式执行
- 快速原型验证

**局限性**：
- 依赖 Docker，隔离级别为容器级(共享宿主机内核)
- 启动延迟秒级
- 对 Windows 原生支持有限
- 开源许可未明确标注

---

### 2.4 BoxLite

**GitHub**: `boxlite-ai/boxlite`(~1.8k ⭐)  
**定位**："SQLite of VMs" —— 可嵌入的轻量级 MicroVM 运行时

**核心特性**：
- **硬件级隔离**：KVM(Linux)/ Hypervisor.framework(macOS)，每个 Box 独立内核
- **无 Daemon**：纯库嵌入，无需 root，无需后台服务
- **OCI 兼容**：直接使用 Docker 镜像(`python:slim`、`node:alpine` 等)
- **有状态持久**：Box 保留包、文件、环境状态，可 stop/restart 恢复
- **跨平台**：macOS(Apple Silicon)、Linux(x86_64/ARM64)、Windows(WSL2)
- **多语言 SDK**：Rust、Python、Node.js、Go、C
- 支持网络策略(`allow_net`)、密钥占位符注入

**架构**：
```
Your Application
└── BoxLite Runtime (embedded library, no daemon)
    └── Jailer (OS-level sandbox: seccomp / sandbox-exec)
        └── Box A / Box B / Box C (VM + Shim + OCI Container)
```

**性能**：
- 启动 ~100ms(VM 级)
- 支持 async-first API，高并发友好

**适用场景**：
- 需要嵌入到现有应用中的沙箱能力
- 本地开发环境(替代 Docker Desktop)
- 多租户 Agent 托管(每个用户一个 Box)
- 需要安装任意 pip 包的代码执行

**局限性**：
- VM 启动仍比解释器/容器慢(~100ms vs Monty 的 <1μs)
- 相比 Docker 生态，工具链成熟度稍低

---

### 2.5 Monty(Pydantic)

**GitHub**: `pydantic/monty`  
**定位**：Rust 编写的极简安全 Python 解释器，专为 AI Agent 代码执行设计

**核心特性**：
- **启动 <1μs**(微秒级)，无需容器/VM 开销
- **零依赖**：单 ~4.5MB 二进制，无 Docker、无云账户、无 API Key
- 完全阻断宿主机访问：文件系统、环境变量、网络均通过外部函数回调控制
- 支持 **执行状态快照**：序列化到字节，可暂停/恢复/跨进程迁移
- 内置资源限制：内存、执行时间、递归深度、分配次数
- 支持类型检查(内置 `ty`)
- 可从 Rust、Python、JavaScript 调用

**能力边界**：

| 支持 | 暂不支持 |
|------|----------|
| 函数(sync/async)、闭包、推导式 | 类定义(soon) |
| f-string、type hints | match 语句(soon) |
| `sys`, `typing`, `asyncio`, `pathlib` | 完整标准库 |
| `re`, `datetime`, `json`, `dataclasses`(soon) | 第三方库(非目标) |
| 外部函数回调 | `import` 语句 |

**使用示例**：
```python
import pydantic_monty as monty

code = "fetch_data(query).upper()"
m = monty.Monty(code, inputs=['query'], external_functions=['fetch_data'])

result = m.run(
    inputs={'query': 'users'},
    external_functions={'fetch_data': lambda q: f"data for {q}"}
)
# Returns "DATA FOR USERS"
```

**适用场景**：
- 高频、短小的代码计算(数据转换、条件判断、简单算法)
- 对延迟极度敏感(微秒级启动)
- 不需要第三方库的场景
- 嵌入到边缘设备或资源受限环境

**局限性**：
- **Experimental**，Pydantic 官方标注 "not ready for prime time"
- 不支持 `import`、第三方库、大多数标准库模块
- 不支持类定义、上下文管理器、生成器
- 2026-04 刚发生安全漏洞(环境变量 secret 被读取，$5,000 bounty 计划中)

---

## 三、选型对比矩阵

| 维度 | OpenSandbox | ZeroBoot | AIOSandbox | BoxLite | Monty |
|------|:-----------:|:--------:|:----------:|:-------:|:-----:|
| **隔离强度** | ★★★★☆ (容器/VM) | ★★★★★ (KVM) | ★★★☆☆ (Docker) | ★★★★★ (KVM) | ★★★☆☆ (解释器) |
| **启动延迟** | ★★☆☆☆ (~秒级) | ★★★★★ (亚毫秒) | ★★☆☆☆ (~秒级) | ★★★★☆ (~100ms) | ★★★★★ (<1μs) |
| **内存开销** | ★★★☆☆ (MB级) | ★★★★★ (265KB) | ★★★☆☆ (MB级) | ★★★★☆ (VM级) | ★★★★★ (~5MB) |
| **功能完整** | ★★★★★ (浏览器+桌面) | ★★★☆☆ (基础执行) | ★★★★★ (All-in-One) | ★★★★☆ (OCI+Shell) | ★★☆☆☆ (Python子集) |
| **集成复杂度** | ★★☆☆☆ (需K8s) | ★★★☆☆ (需KVM) | ★★★☆☆ (需Docker) | ★★★★★ (纯库嵌入) | ★★★★★ (pip安装) |
| **Windows支持** | ★★☆☆☆ (WSL2) | ★★☆☆☆ (WSL2) | ★★☆☆☆ (WSL2) | ★★★☆☆ (WSL2) | ★★★★★ (原生) |
| **成熟度** | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ |
| **开源许可** | Apache 2.0 | 未明确 | 未明确 | Apache 2.0 | 未明确 |

---

## 四、MetaBlog 场景选型建议

### 4.1 我们的需求画像

| 需求项 | 重要性 | 说明 |
|--------|--------|------|
| 本地内置 | 高 | 不依赖外部云服务，无 API Key 和计费 |
| 轻量级 | 高 | 当前运行在 Windows(WSL2 可用)，资源有限 |
| Agent 代码执行 | 高 | 执行 LLM 生成的 Python 代码(数据分析、计算、文件处理) |
| 集成复杂度低 | 高 | 与现有 TypeScript/Node.js 后端无缝集成 |
| 安全隔离 | 高 | 防止 LLM 生成的恶意代码破坏宿主机 |
| pip 包安装 | 中 | 允许 Agent 动态安装依赖 |
| 浏览器自动化 | 低 | 已有 Playwright MCP 工具覆盖 |
| GUI 桌面 | 低 | 非必要需求 |

### 4.2 推荐方案：BoxLite + Monty 组合

基于以上分析，推荐 **双轨架构**：

#### 轨道 A：Monty(默认/轻量模式)

用于 80% 的日常代码执行任务：
- 数据计算、条件判断、格式转换
- JSON/YAML 处理、字符串操作
- 启动 <1μs，对用户无感知延迟
- 零配置，直接嵌入后端进程

**集成方式**：
```typescript
// server/sandbox/monty-executor.ts
import { execSync } from 'child_process';

export function executeMonty(code: string, inputs: Record<string, any>) {
  // 调用 pydantic-monty CLI 或 Python 脚本
  const result = execSync('python -m pydantic_monty', {
    input: JSON.stringify({ code, inputs }),
    timeout: 5000,
    encoding: 'utf-8'
  });
  return JSON.parse(result);
}
```

#### 轨道 B：BoxLite(增强/隔离模式)

用于 20% 的复杂任务：
- 需要 `pip install` 第三方库
- 需要 bash 命令、文件系统操作
- 需要更强的隔离保证
- 长生命周期的 Stateful 会话

**集成方式**：
```typescript
// server/sandbox/boxlite-executor.ts
import { BoxRunClient } from '@boxlite-ai/boxlite';

const client = new BoxRunClient();

export async function executeInBox(code: string, image = 'python:3.11-slim') {
  const box = await client.create(image, { name: 'agent-task' });
  try {
    const result = await box.exec('python', '-c', code);
    return { stdout: result.stdout, stderr: result.stderr };
  } finally {
    await box.remove();
  }
}
```

### 4.3 为什么不选其他方案？

| 方案 | 排除原因 |
|------|----------|
| **OpenSandbox** | 需要 K8s/Docker 基础设施，过于重型，不适合个人/小团队本地部署 |
| **ZeroBoot** | 过于早期(47⭐)，未 production-ready，许可不明，风险过高 |
| **AIOSandbox** | Docker 容器隔离级别不够(共享内核)，且 All-in-One 功能过剩 |
| **纯 Monty** | 无法安装第三方库，Agent 能力受限(如无法使用 pandas、requests) |
| **纯 BoxLite** | 100ms 启动对简单计算任务而言仍显沉重，Monty 更适合高频小任务 |

---

## 五、实施路线图

```
Phase 1 (立即): Monty 轻量集成
  └─ 安装 pydantic-monty
  └─ 封装 execute_python 工具(替代当前的 eval/exec)
  └─ 支持基础数据类型和简单算法
  └─ 预期工作量: 1-2 天

Phase 2 (近期): BoxLite 增强集成
  └─ 安装 boxlite 运行时
  └─ 封装 sandbox_execute 工具(支持 pip install)
  └─ 实现沙箱生命周期管理(创建→执行→销毁)
  └─ 预期工作量: 3-5 天

Phase 3 (远期): 智能路由
  └─ Agent 自动判断任务复杂度
  └─ 简单任务 → Monty(<1μs)
  └─ 复杂任务 → BoxLite(~100ms + 完整环境)
  └─ 预期工作量: 2-3 天
```

---

## 六、风险与注意事项

1. **Monty 安全性**：处于 experimental 阶段，2026-04 刚发现环境变量泄露漏洞。建议：
   - 仅用于无敏感数据的计算任务
   - 关注 Pydantic 安全更新
   - 考虑在 Monty 外层再加一层进程隔离

2. **BoxLite 平台限制**：Windows 原生不支持，需通过 WSL2 + KVM。当前开发环境为 Windows，需要：
   - 确认 WSL2 已启用且 KVM 可用
   - 或在 WSL2 中运行后端服务

3. **资源管理**：无论选择哪种方案，都需要实现：
   - 执行超时(默认 30s，可配置)
   - 内存限制(默认 256MB)
   - CPU 限制(默认 1 核)
   - 并发沙箱数量上限

---

## 参考链接

- [OpenSandbox GitHub](https://github.com/alibaba/OpenSandbox)
- [ZeroBoot 介绍](https://ubos.tech/news/zeroboot-sub%E2%80%91millisecond-vm-sandbox-with-copy%E2%80%91on%E2%80%91write-forking/)
- [AIOSandbox GitHub](https://github.com/agent-infra/sandbox)
- [BoxLite GitHub](https://github.com/boxlite-ai/boxlite)
- [Monty GitHub](https://github.com/pydantic/monty)
- [AI Agent Sandboxes 市场对比](https://rywalker.com/research/ai-agent-sandboxes)
