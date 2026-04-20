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
  - feishu_doc_create # 支持 owner_email/owner_mobile 自动下放权限
  - feishu_doc_read
  - feishu_doc_search
  - feishu_doc_blocks
  - feishu_doc_append # 支持 $latex$ 公式转换与代码语言高亮
  - feishu_doc_update_block # 支持 $latex$ 公式转换与样式叠加
  - feishu_doc_delete_block
  - feishu_im_send
  - feishu_user_search
usageScenarios:
  - 创建并自动分配权限的飞书文档
  - 在文档中插入数学公式 ($latex$)
  - 具有语法高亮的代码片段写入
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
文档内块（Block）的唯一标识。文档由多个块组成（标题、文本、列表、代码块等）。
- 要获取 block_id，先调用 `feishu_doc_blocks(document_id)`
- 每个块有 `block_type`（2=文本, 3=heading1, 4=heading2, ... 14=代码块, 15=引用）

## 工作流

### 1. 创建并自动分配权限
```typescript
feishu_doc_create(
  title="量子力学笔记", 
  owner_email="user@example.com" // 可选，指定后自动分配 Full Access 权限
) 
```
- 创建成功后，工具会返回 `permission_result` 告知权限分配状态。

### 2. 插入复杂排版 (公式与代码)
- **数学公式**：直接在文本中使用 `$公式内容$`，如 `$\int_{0}^{\infty} e^{-x^2} dx$`。后端会自动将其转换为飞书原生公式节点。
- **代码块**：在创建 `code` 类型的块时，可以指定语言。

### 3. 读取文档内容
```
feishu_doc_read(document_id="xxx")
```

### 3. 修改文档中的某段内容
**必须先获取块结构，再更新：**
```
feishu_doc_blocks(document_id="xxx")
  → 找到目标块的 block_id
  → feishu_doc_update_block(
       document_id="xxx",
       block_id="block_xxx",
       text={ "elements": [{ "text_run": { "content": "新内容" } }] }
     )
```

### 4. 删除文档中的某段内容
**同样需要先获取块结构：**
```
feishu_doc_blocks(document_id="xxx")
  → 找到目标块的 block_id
  → feishu_doc_delete_block(document_id="xxx", block_id="block_xxx")
```

### 5. 发送飞书消息
```
feishu_im_send(receive_id="ou_xxx", content="消息内容")
```
- `receive_id` 可以是 open_id、user_id、chat_id 或 email
- 默认 msg_type="text"

### 6. 查找用户
```
feishu_user_search(email="zhangsan@company.com")
```

## 注意事项
- **更新/删除前必须先获取块结构**：飞书 API 要求知道块在文档中的位置
- **追加内容**：使用 `feishu_doc_append`，可以传 `content`（纯文本字符串，自动分段）或 `blocks`（飞书块格式数组）
- **搜索文档**：`feishu_doc_search` 在云空间中搜索，不是搜索单个文档内容
- **文档权限**：应用创建的文档默认归应用所有，如需共享给用户，需额外授予权限

## 示例对话

用户："帮我创建一个周报文档"
→ `feishu_doc_create(title="周报 - 第X周")` → `feishu_doc_append(document_id=..., content="本周工作...")`

用户："把刚才的文档标题改成月报"
→ `feishu_doc_blocks(document_id=...)` 获取 heading1 块的 block_id → `feishu_doc_update_block(document_id=..., block_id=..., heading1={...})`

用户："给张三发一条飞书消息"
→ `feishu_user_search(email="zhangsan@company.com")` 获取 open_id → `feishu_im_send(receive_id=..., content="...")`
