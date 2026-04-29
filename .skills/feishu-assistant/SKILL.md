---
name: 飞书助手
description: |
  通过飞书 Open API 操作文档、发送消息、管理知识库和查找用户。
  触发时机：用户提到"飞书""文档""消息""Lark""知识库""Wiki"等。
  不适用：与飞书无关的通用聊天或需要飞书 API 开发指导（使用飞书集成导师 skill）。
---

# 飞书助手

通过飞书 Open API 直接操作云文档、发送即时消息、查找用户，无需用户手动登录。

## 核心概念

### document_id
飞书文档的唯一标识，从文档 URL 中获取：
- URL 形如 `https://xxx.feishu.cn/docx/AbCdEfGh`
- `document_id = AbCdEfGh`

### block_id
文档内块(Block)的唯一标识。文档由多个块组成(标题、文本、列表、代码块等)。
- 要获取 block_id，先调用 `feishuDocBlocks(document_id)`
- 每个块有 `block_type`(2=文本, 3=heading1, 4=heading2, ... 14=代码块, 15=引用)

## 工作流

### 1. 创建并自动分配权限
```typescript
feishuDocCreate(
  title="量子力学笔记", 
  owner_email="user@example.com"
) 
```
- 创建成功后，工具会返回 `permission_result` 告知权限分配状态。

### 2. 插入复杂排版 (公式与代码)

#### 数学公式(⚠️ 必须严格遵守)
飞书文档支持 LaTeX 公式渲染，但**只有被 `$` 包裹的公式才能被正确识别和渲染**。

**绝对禁止**：将公式写成纯文本，如 `J(θ) = E[...]`、`log π(a|s)` 等。

**必须写成**(标准 LaTeX 语法，无需额外转义)：
- 行内公式：`$J(\theta) = \mathbb{E}_{\pi_\theta}[\log \pi_\theta(a|s) \cdot A(s,a)]$`
- 块级公式：`$$\mathcal{L}_{PPO}(\theta) = \mathbb{E}_{t}[\min(r_t(\theta)\hat{A}_t, \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon)\hat{A}_t)]$$`

**重要提醒**：你只需写标准 LaTeX 语法，JSON 序列化由框架自动处理。不要在 content 中写双重反斜杠(如 `\\pi`)，否则飞书会渲染为 `\pi` 纯文本。

**常见错误自查**：
- ❌ `KL divergence: D_KL(π_θ || π_ref)` → ✅ `$D_{KL}(\pi_\theta \| \pi_{ref})$`
- ❌ `reward = r + γV(s')` → ✅ `$r + \gamma V(s')$`
- ❌ `\pi`(双重反斜杠) → ✅ `\pi`(标准 LaTeX)

#### 代码块
在创建 `code` 类型的块时，可以指定语言。

### 3. 读取与修改文档内容

**读取**：`feishuDocRead(document_id="xxx")`

**修改某段内容**（必须先获取块结构）：
```
feishuDocBlocks(document_id="xxx")
  → 找到目标块的 block_id
  → feishuDocUpdateBlock(
       document_id="xxx",
       block_id="block_xxx",
       text={ "elements": [{ "text_run": { "content": "新内容" } }] }
     )
```

**删除某段内容**（同样需要先获取块结构）：
```
feishuDocBlocks(document_id="xxx")
  → 找到目标块的 block_id
  → feishuDocDeleteBlock(document_id="xxx", block_id="block_xxx")
```

### 4. 发送飞书消息
```
feishuImSend(receive_id="ou_xxx", content="消息内容")
```
- `receive_id` 可以是 open_id、user_id、chat_id 或 email
- 默认 msg_type="text"

### 5. 知识库 (Wiki) 操作
```
feishuWikiSpaceList()                          # 列出知识库
feishuWikiNodeCreate(space_id="xxx", title="新文档")   # 在知识库中创建节点
feishuWikiMemberList(space_id="xxx")           # 获取成员列表
feishuWikiMemberAdd(space_id="xxx", member_id="ou_xxx", perm="view")  # 添加成员
```

### 6. 查找用户
```
feishuUserSearch(email="zhangsan@company.com")
```

## 注意事项
- **更新/删除前必须先获取块结构**：飞书 API 要求知道块在文档中的位置
- **追加内容**：使用 `feishuDocAppend`，可以传 `content`(纯文本字符串，自动分段)或 `blocks`(飞书块格式数组)
- **搜索文档**：`feishuDocSearch` 在云空间中搜索，不是搜索单个文档内容
- **文档权限**：应用创建的文档默认归应用所有，如需共享给用户，需额外授予权限

## 示例对话

用户："帮我创建一个周报文档"
→ `feishuDocCreate(title="周报 - 第X周")` → `feishuDocAppend(document_id=..., content="本周工作...")`

用户："把刚才的文档标题改成月报"
→ `feishuDocBlocks(document_id=...)` 获取 heading1 块的 block_id → `feishuDocUpdateBlock(document_id=..., block_id=..., heading1={...})`

用户："给张三发一条飞书消息"
→ `feishuUserSearch(email="zhangsan@company.com")` 获取 open_id → `feishuImSend(receive_id=..., content="...")`
