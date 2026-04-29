---
id: feishu-assistant
name: 飞书助手
description: 通过飞书 Open API 操作文档、发送消息、查找用户
icon: 📋
category: productivity
tags:
  - 飞书
  - 文档
  - 消息
  - Lark
tools:
  - feishuDocCreate # 支持 owner_email/owner_mobile 自动下放权限
  - feishuDocRead
  - feishuDocMeta
  - feishuDocSearch
  - feishuDocBlocks
  - feishuDocAppend # 支持 $latex$ 公式转换与代码语言高亮
  - feishuDocUpdateBlock # 支持 $latex$ 公式转换与样式叠加
  - feishuDocDeleteBlock
  - feishuDocInsertImage # 插入图片到文档
  - feishuDocShare # 分享文档权限
  - feishuDocUnshare # 取消文档权限
  - feishuImSend
  - feishuUserSearch
  - feishuWikiSpaceCreate
  - feishuWikiSpaceList
  - feishuWikiSpaceGet
  - feishuWikiSpaceUpdate
  - feishuWikiSpaceDelete
  - feishuWikiNodeCreate
  - feishuWikiNodeList
  - feishuWikiNodeDelete
  - feishuWikiNodeMove
  - feishuWikiMoveDoc
  - feishuWikiMemberList
  - feishuWikiMemberAdd
  - feishuWikiMemberRemove
usageScenarios:
  - 创建并自动分配权限的飞书文档
  - 在文档中插入数学公式 ($latex$)
  - 具有语法高亮的代码片段写入
  - 上传图片并插入文档
  - 读取、搜索并修改文档内容
  - 发送消息并查找用户
---

# 飞书助手

## 描述
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
  owner_email="user@example.com" // 可选，指定后自动分配 Full Access 权限
) 
```
- 创建成功后，工具会返回 `permission_result` 告知权限分配状态。

### 2. 插入复杂排版 (公式与代码)

#### 数学公式(⚠️ 必须严格遵守)
飞书文档支持 LaTeX 公式渲染，但**只有被 `$` 包裹的公式才能被正确识别和渲染**。

**绝对禁止**：将公式写成纯文本，如 `J(θ) = E[...]`、`log π(a|s)` 等。

**必须写成**(标准 LaTeX 语法，无需额外转义)：
- 行内公式(短公式，嵌入段落中)：`$J(\theta) = \mathbb{E}_{\pi_\theta}[\log \pi_\theta(a|s) \cdot A(s,a)]$`
- 块级公式(重要公式，独立一行)：`$$\mathcal{L}_{PPO}(\theta) = \mathbb{E}_{t}[\min(r_t(\theta)\hat{A}_t, \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon)\hat{A}_t)]$$`

**重要提醒**：你只需写标准 LaTeX 语法(如 `\pi`、`\theta`、`\frac`)，JSON 序列化由框架自动处理。不要在 content 中写双重反斜杠(如 `\\pi`)，否则飞书会渲染为 `\pi` 纯文本。

**常见错误自查**：
- ❌ `KL divergence: D_KL(π_θ || π_ref)` → ✅ `$D_{KL}(\pi_\theta \| \pi_{ref})$`
- ❌ `reward = r + γV(s')` → ✅ `$r + \gamma V(s')$`
- ❌ `PPO loss = E[min(...)]` → ✅ `$\mathcal{L}_{PPO} = \mathbb{E}[\min(\cdots)]$`
- ❌ `\\pi`(双重反斜杠) → ✅ `\pi`(标准 LaTeX)

后端会自动将 `$...$` 和 `$$...$$` 转换为飞书原生公式节点。**如果公式没有用 `$` 包裹，飞书会显示为纯文本，完全无法渲染。**

#### 代码块
在创建 `code` 类型的块时，可以指定语言。

### 4. 读取文档内容
```
feishuDocRead(document_id="xxx")
```

### 5. 修改文档中的某段内容
**必须先获取块结构，再更新：**
```
feishuDocBlocks(document_id="xxx")
  → 找到目标块的 block_id
  → feishuDocUpdateBlock(
       document_id="xxx",
       block_id="block_xxx",
       text={ "elements": [{ "text_run": { "content": "新内容" } }] }
     )
```

### 6. 删除文档中的某段内容
**同样需要先获取块结构：**
```
feishuDocBlocks(document_id="xxx")
  → 找到目标块的 block_id
  → feishuDocDeleteBlock(document_id="xxx", block_id="block_xxx")
```

### 7. 发送飞书消息
```
feishuImSend(receive_id="ou_xxx", content="消息内容")
```
- `receive_id` 可以是 open_id、user_id、chat_id 或 email
- 默认 msg_type="text"

### 8. 知识库 (Wiki) 操作
```
feishuWikiSpaceList()                          # 列出知识库
feishuWikiNodeCreate(space_id="xxx", title="新文档")   # 在知识库中创建节点
feishuWikiMemberList(space_id="xxx")           # 获取成员列表
feishuWikiMemberAdd(space_id="xxx", member_id="ou_xxx", perm="view")  # 添加成员
```

### 9. 查找用户
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
