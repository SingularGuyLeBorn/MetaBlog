---
id: lark-dev-mentor
name: 飞书集成导师
description: 专门用于指导飞书新功能的“实验-验证-封装”全流程，沉淀实战填坑经验
icon: 👨‍🏫
category: meta
tags:
  - 开发者工具
  - 飞书集成
  - 提速
---

# 飞书集成导师 (Lark Dev Mentor)

## 描述
基于 MetaBlog 飞书集成过程中的实战经验，指导 Agent 如何进行高效的飞书 API 开发、故障排查与工具封装。

## 🛡️ 避坑指南 (Hall of Fame of Pits)

### 1. ID 字段名“指鹿为马”
- **现象**：调用 `batch_get_id` 时指定 `user_id_type=open_id`。
- **坑位**：飞书返回的 JSON 对象中，键名仍然是 `user_id` 而不是 `open_id`。
- **对策**：代码库必须使用双重校验：`const openId = res.user_id || res.open_id;`。

### 2. 跨区同步延迟 (Race Condition)
- **现象**：`docx` 创建后立即调用 `drive` 接口重命名。
- **坑位**：报错 `981002: params error`。这是因为文档在物理层尚未完成 Drive 索引。
- **对策**：避免在创建后 5 秒内切换 API 域(例如从 Docx 域切到 Drive 域)。

### 3. 隐形权限隔离
- **现象**：文档创建成功，但用户在飞书界面找不到。
- **坑位**：应用创建的文档默认属于“应用机器人”，不属于用户。
- **对策**：必须执行 `permissions.members.create` 并赋予 `full_access`。

## 🛠️ 集成 SOP (标准操作程序)

### 第一阶段：实验室验证 (Lab)
1. 使用 `project/experiments/feishu-api/99_feishu_api_showcase.ipynb` 进行 API 验证。
2. 运行 **Section 0 (诊断区)**：打印原始 JSON，确认字段名和 ID 映射。
3. 运行 **Section 4/5 (压测区)**：验证复杂块(公式/表格)的极限渲染。

### 第二阶段：生产封装 (BFF)
1. 在 `server/routes/lark.ts` 中实现对应的路由。
2. **反馈机制**：必须将权限分配结果(`permission_result`)返回给前端，禁止静默失败。

### 第三阶段：Agent 工具化
1. 更新 `.skills/feishu-assistant/SKILL.md`。
2. 在 `src/theme/tools/lark/` 下的对应分类文件(如 `doc.ts`、`wiki.ts` 等)中完成参数声明。

## 示例对话
用户：“我想给飞书加一个‘自动生成甘特图’的功能，怎么开始？”
引导：“先别急着写 TS，我们先去 project/experiments/feishu-api 跑一个 Python 压测脚本，确认一下飞书甘特块的 JSON Schema...”
