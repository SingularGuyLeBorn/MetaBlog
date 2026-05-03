---
id: feishu-assistant
name: 飞书助手
description: 当用户需要操作飞书文档、发送飞书消息、查找飞书用户、管理飞书知识库或进行文档权限分享时加载. 触发信号：用户提到"飞书"、"文档"、"消息"、"知识库"、"Lark". 不适用：与飞书无关的任务. 
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
  - feishuTokenRefresh # 手动刷新 user_access_token
  - feishuTokenStatus # 查询 token 状态
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
通过飞书 Open API 直接操作云文档、发送即时消息、查找用户,无需用户手动登录. 

## 核心概念

### document_id
飞书文档的唯一标识,从文档 URL 中获取：
- URL 形如 `https://xxx.feishu.cn/docx/AbCdEfGh`
- `document_id = AbCdEfGh`

### block_id
文档内块(Block)的唯一标识. 文档由多个块组成(标题、文本、列表、代码块等). 
- 要获取 block_id,先调用 `feishuDocBlocks(document_id)`
- 每个块有 `block_type`(2=文本, 3=heading1, 4=heading2, ... 14=代码块, 15=引用)

## 工作流

### 1. 创建并自动分配权限
```typescript
feishuDocCreate(
  title="量子力学笔记", 
  owner_email="user@example.com" // 可选,指定后自动分配 Full Access 权限
) 
```
- 创建成功后,工具会返回 `permission_result` 告知权限分配状态. 

### 2. 插入复杂排版 (公式与代码)

### 2. 追加内容时的 Markdown 格式规范(⚠️ 必须严格遵守)

`feishuDocAppend` 的 `content` 参数支持 Markdown 语法,后端会自动解析为飞书 block 格式. **格式错误会导致渲染异常或内容丢失. **

#### Markdown 格式强制规范

| 元素 | 正确写法 | 错误写法 | 说明 |
|------|----------|----------|------|
| **段落** | 顶格写,行首无空格 | `  段落开头有空格` | 行首空格会被视为代码块 |
| **无序列表** | `- 项目` | `* 项目` 或 `+ 项目` | 统一用 `-` 加空格 |
| **有序列表** | `1. 项目` | `1) 项目` | 必须用点号 |
| **加粗** | `**重点**` | `** 重点 **` 或 `__重点__` | 星号紧贴文本,内侧无空格 |
| **图片** | `![描述](URL)` | `<img src="...">` | 必须用 Markdown 语法,URL 需可访问 |
| **代码块** | \`\`\`python\n代码\n\`\`\` | 无语言标识或缩进代码块 | 必须带语言标识(fenced code block) |
| **表格** | 标准 Markdown 表格 | HTML 表格 | 飞书支持 Markdown 表格 |
| **分隔线** | `---` | `***` 或 `___` | 统一用三个减号 |
| **引用** | `> 引用内容` | 无 | 引用块 |

**绝对禁止**：
- ❌ 段落行首出现空格(会被解析为代码块)
- ❌ 用 `*` 或 `+` 作为列表标记(必须用 `-`)
- ❌ 加粗符号内侧有空格(`** 重点 **` ❌ → `**重点**` ✅)
- ❌ 用 HTML 标签(`<div>`、`<img>`、`<br>`)
- ❌ 用缩进代码块(四个空格开头的代码),必须用 fenced code block

#### 文档内部链接(⚠️ 必须严格遵守)

本项目使用 VitePress 构建,`srcDir: "./docs"`,所有页面 URL 以 `/sections/` 开头. **链接路径写错会导致 404 页面无法加载**. 

**正确写法(二选一)**：

1. **绝对路径**(推荐)：以 `/sections/` 开头,以 `/` 结尾,不写 `.md` 或 `index.md`
   - ✅ `/sections/knowledge/opd-series/02-paradigm-shift/`
   - ✅ `/sections/posts/my-article/`

2. **相对路径**：使用 `../` 或 `./`
   - ✅ `../02-paradigm-shift/`(从 `01-overview/index.md` 链接到同级目录)
   - ✅ `./image/diagram.png`(引用同目录下的图片)

**常见错误**：
- ❌ `/knowledge/opd-series/02-paradigm-shift/index.md` → 缺少 `/sections/` 前缀,且多余 `index.md`
- ❌ `/knowledge/opd-series/02-paradigm-shift/` → 缺少 `/sections/` 前缀,404
- ❌ `knowledge/opd-series/02-paradigm-shift/` → 缺少开头的 `/`,被解析为相对路径
- ❌ `../02-paradigm-shift/index.md` → 多余 `index.md`,应去掉

**总结**：内部链接要么用 `/sections/.../` 绝对路径,要么用 `../` 相对路径. 永远不要省略 `/sections/`,永远不要写 `.md` 后缀. 

#### 数学公式(⚠️ 必须严格遵守)

飞书文档支持 LaTeX 公式渲染,但**只有被 `$` 包裹的公式才能被正确识别和渲染**. 

**绝对禁止**：将公式写成纯文本,如 `J(θ) = E[...]`、`log π(a|s)` 等. 

**必须写成**(标准 LaTeX 语法,无需额外转义)：
- 行内公式(短公式,嵌入段落中)：`$J(\theta) = \mathbb{E}_{\pi_\theta}[\log \pi_\theta(a|s) \cdot A(s,a)]$`
- 块级公式(重要公式,独立一行)：`$$\mathcal{L}_{PPO}(\theta) = \mathbb{E}_{t}[\min(r_t(\theta)\hat{A}_t, \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon)\hat{A}_t)]$$`

**重要提醒**：你只需写标准 LaTeX 语法(如 `\pi`、`\theta`、`\frac`),JSON 序列化由框架自动处理. 不要在 content 中写双重反斜杠(如 `\\pi`),否则飞书会渲染为 `\pi` 纯文本. 

**常见错误自查**：
- ❌ `KL divergence: D_KL(π_θ || π_ref)` → ✅ `$D_{KL}(\pi_\theta \| \pi_{ref})$`
- ❌ `reward = r + γV(s')` → ✅ `$r + \gamma V(s')$`
- ❌ `PPO loss = E[min(...)]` → ✅ `$\mathcal{L}_{PPO} = \mathbb{E}[\min(\cdots)]$`
- ❌ `\\pi`(双重反斜杠) → ✅ `\pi`(标准 LaTeX)
- ❌ `** 重点 **` → ✅ `**重点**`
- ❌ `  - 项目`(行首空格) → ✅ `- 项目`

后端会自动将 `$...$` 和 `$$...$$` 转换为飞书原生公式节点. **如果公式没有用 `$` 包裹,飞书会显示为纯文本,完全无法渲染. **

#### 表格中的公式(⚠️ 高风险区域)

Markdown 表格使用 `|` 作为列分隔符. 如果公式中包含 `|`(如条件概率 `$P(A|B)$`、KL 散度 `$D_{KL}(P \| Q)$`),**`|` 会被当作列分隔符,导致公式被撕碎拆分到不同单元格**. 

**表格内公式必须用 `\vert` 或 `\mid` 替代 `|`**：
- ❌ `$P(A|B)$` → ✅ `$P(A \vert B)$`
- ❌ `$D_{KL}(P \| Q)$` → ✅ `$D_{KL}(P \Vert Q)$`(范数用 `\Vert`,竖线用 `\vert`)
- ❌ `$\pi_{\text{ref}}(y|x)$` → ✅ `$\pi_{\text{ref}}(y \vert x)$`
- ❌ `$Q(y|x) + \tau^{(t)}$` → ✅ `$Q(y \vert x) + \tau^{(t)}$`

**表格内公式禁止末尾带 `\\`**：
- ❌ `$\text{KL}(\pi_{\text{ref}})\\` → ✅ `$\text{KL}(\pi_{\text{ref}})$`
- `\\` 在 LaTeX 中是换行命令,飞书表格单元格中的公式若包含 `\\` 会被强制换行,导致显示错乱. 

#### 代码块
在创建 `code` 类型的块时,可以指定语言. 代码块必须用 fenced code block 格式(三个反引号 + 语言标识)：

\`\`\`python
def hello():
    print("Hello")
\`\`\`

支持的常见语言标识：`python`、`javascript`、`typescript`、`java`、`go`、`rust`、`cpp`、`bash`、`json`、`yaml`、`markdown`. 

### 4. 读取文档内容
```
feishuDocRead(document_id="xxx")
```

### 5. 修改文档中的某段内容
**必须先获取块结构,再更新：**
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

#### 创建知识库空间
```
feishuWikiSpaceCreate(name="产品文档库", description="存放所有产品相关文档")
```
- **必须使用 user_access_token**,后端已自动处理. 
- **权限**：创建者自动拥有 owner 权限,无需额外分享. 

#### 在知识库内创建文档节点(推荐)
```
feishuWikiNodeCreate(space_id="xxx", title="新文档", parent_node_token="xxx")
```
- 直接在知识库内创建 docx 节点,无需迁入步骤. 
- **权限**：创建者自动拥有编辑权限,无需额外分享. 

#### 将外部文档迁入知识库
```
# 步骤1：用 user_access_token 创建文档(关键！tenant token 创建的文档无法迁入)
feishuDocCreate(title="外部文档", use_user_token=true)
  → 得到 obj_token(即 document_id)

# 步骤2：迁入知识库
feishuWikiMoveDoc(space_id="xxx", obj_token="doxcnxxx")
```
- **限制**：只有 user_access_token 创建的文档才能迁入,tenant_access_token(应用级)创建的文档会报 permission denied. 
- **注意**：迁入是异步操作,工具内部会自动轮询 task 状态直到完成. 

#### 权限策略总结
| 创建方式 | Token 类型 | 创建后权限 | 是否需要额外分享 |
|----------|-----------|-----------|-----------------|
| feishuWikiSpaceCreate | user | 创建者=owner | ❌ 不需要 |
| feishuWikiNodeCreate | user | 创建者=edit | ❌ 不需要 |
| feishuDocCreate(use_user_token=true) | user | 创建者=owner | ❌ 不需要 |
| feishuDocCreate(默认) | tenant | 应用所有 | ✅ 需要手动分享 |

#### Token 类型详解(⚠️ 必须严格区分,用错必失败)

飞书 API 有两种 token,**权限边界完全不同,不能互相替代**：

**1. tenant_access_token(应用级 token,也叫 tenant token)**
- **获取方式**：后端用 `.env` 中的 `FEISHU_APP_ID` + `FEISHU_APP_SECRET` 自动换取,无需用户授权
- **能做什么**：
  - ✅ 创建普通云文档(`feishuDocCreate`)
  - ✅ 读取任何文档内容(`feishuDocRead`)
  - ✅ 搜索文档(`feishuDocSearch`)
  - ✅ 发送应用消息(`feishuImSend`,发给用户或群聊)
  - ✅ 上传图片到素材库
- **不能做什么**：
  - ❌ 创建知识库(`feishuWikiSpaceCreate`)→ 报 99991679
  - ❌ 创建知识库内文档(`feishuWikiNodeCreate`)→ 报 99991679
  - ❌ 写入知识库内的文档(`feishuDocAppend` 到 Wiki 文档)→ 报 1770032
  - ❌ 迁入文档到知识库(`feishuWikiMoveDoc`)→ 报 permission denied
- **特点**：文档归应用所有,默认用户看不到,需要额外分享权限

**2. user_access_token(用户级 token)**
- **获取方式**：用户扫码 OAuth 授权,后端保存到 `.data/config/feishu_oauth.json`
- **能做什么**：
  - ✅ 创建知识库(`feishuWikiSpaceCreate`)
  - ✅ 创建知识库内文档(`feishuWikiNodeCreate`)
  - ✅ 写入知识库内文档(`feishuDocAppend` 到 Wiki 文档)
  - ✅ 创建普通文档(`feishuDocCreate` 传 `use_user_token=true`)
  - ✅ 迁入文档到知识库(`feishuWikiMoveDoc`)
- **不能做什么**：
  - ❌ 没有特别限制,user_access_token 权限覆盖 tenant_access_token 的所有能力
- **特点**：文档归用户个人所有,创建者自动拥有 owner/edit 权限

#### 创建操作 Token 对照表

| 你想创建什么 | 调用哪个工具 | 需要什么 Token | 前端是否需要传 `use_user_token` | 创建后归属 |
|-------------|-------------|--------------|------------------------------|-----------|
| 普通云文档(知识库外) | `feishuDocCreate` | tenant(默认) | 不需要(默认 false) | 应用所有 |
| 普通云文档(计划迁入知识库) | `feishuDocCreate(title=..., use_user_token=true)` | **user** | **必须传 `true`** | 用户所有 |
| 知识库空间 | `feishuWikiSpaceCreate` | **user** | 不需要(后端自动) | 用户所有 |
| 知识库内文档节点 | `feishuWikiNodeCreate` | **user** | 不需要(后端自动) | 用户所有 |

#### 写入操作 Token 对照表

| 你要写入哪类文档 | 调用哪个工具 | 需要什么 Token | 前端是否需要传 `use_user_token` |
|-----------------|-------------|--------------|------------------------------|
| 知识库内文档(`feishuWikiNodeCreate` 创建的) | `feishuDocAppend` | **user** | **必须传 `true`**(默认值已为 true) |
| 普通文档(`feishuDocCreate` 默认 tenant 创建的) | `feishuDocAppend` | tenant | 可传 `false` |
| 普通文档(`feishuDocCreate` 传了 `use_user_token=true` 创建的) | `feishuDocAppend` | **user** | **必须传 `true`** |

**关键规则**：
- **Wiki 知识库内的所有文档**(`feishuWikiNodeCreate` 创建)**只能用 user_access_token 写入**,tenant token 会报 1770032
- `feishuDocAppend` 默认 `use_user_token=true`,覆盖最常见的 Wiki 文档写入场景
- 如果向普通文档追加内容且报错,可尝试显式传 `use_user_token=false`

#### Token 管理策略(热更新 + 自动刷新)

`user_access_token` 有效期约 2 小时,**不再依赖 `.env` 中的静态配置**(进程启动后不会重新加载 env). 后端采用以下策略：

1. **存储位置**：token 保存在独立的 JSON 缓存文件(`D:\ALL IN AI\MetaBlog\.data\config\feishu_oauth.json`),支持热更新
2. **自动刷新**：后端每次使用 user_access_token 前会检查有效期,若即将过期(< 5 分钟)则**自动调用 refresh_token 续期**,无需人工干预
3. **手动刷新**：如果自动刷新失败,可调用 `feishuTokenRefresh()` 手动刷新
4. **状态查询**：调用 `feishuTokenStatus()` 查看 token 剩余有效期和 refresh_token 状态

##### Token 过期处理流程

```
调用飞书 API(如 feishuWikiSpaceCreate)
    ↓
后端自动读取缓存文件中的 access_token
    ↓
如果 access_token 即将过期(< 5 分钟)
    → 自动调用 refresh_token 刷新
    → 新 token 写回缓存文件
    → 继续执行原操作
    ↓
如果自动刷新成功 → 操作完成 ✅
    ↓
如果自动刷新失败(refresh_token 过期)
    → 返回错误：需要重新授权
    → 引导用户执行重新授权流程(见下文)
```

##### 重新授权流程(refresh_token 过期,约 365 天后)

当 `feishuTokenRefresh` 返回 "refresh_token 已失效" 时,必须重新走 OAuth 授权：

**Step 1：确认权限已开通**
- 飞书开发者后台 → 应用详情 → **权限管理**
- 确保已开通所需权限(如创建知识库需 `wiki:wiki`、`wiki:space:write_only`)
- 确保已开通 `offline_access`(获取 refresh_token 必须)

**Step 2：生成授权链接**
运行 notebook `project/experiments/feishu-api/manual_get_token.ipynb` 中的 Cell 1,或手动拼接：
```
https://accounts.feishu.cn/open-apis/authen/v1/authorize?
  app_id={APP_ID}
  &redirect_uri=http%3A//localhost%3A8088
  &scope=wiki%3Awiki%20wiki%3Aspace%3Awrite_only%20offline_access
  &state={随机字符串}
```
> **scope 必须包含所需权限**,否则即使授权成功,token 也没有对应权限(会报 99991679). 

**Step 3：浏览器扫码授权**
- 将链接粘贴到浏览器地址栏
- 扫码或点击【同意授权】
- 浏览器跳转到 `http://localhost:8088/?code=xxx&state=yyy`

**Step 4：复制 code 换 token**
- 从地址栏复制 `code=` 后面的值
- 粘贴到 notebook Cell 2 的 `CODE` 变量中
- 运行 Cell 2,token 自动保存到缓存文件

**Step 5：继续操作**
- 新 token 已生效,后端会自动读取
- 无需重启服务(热更新)

##### 常见 Token 错误码

| 错误码 | 含义 | 处理方式 |
|--------|------|----------|
| `99991677` | access_token 过期 | 后端自动刷新,若失败则调用 `feishuTokenRefresh()` |
| `99991679` | 缺少 scope 权限 | 开发者后台开通权限 → 重新授权(scope 包含新权限)→ 换 token |
| `20026` | refresh_token 无效 | 重新授权 |
| `20037` | refresh_token 已过期(满365天)| 重新授权 |
| `20064`/`20073` | refresh_token 已被使用/撤销 | 重新授权 |
| `20074` | 应用未开启刷新 token 开关 | 开发者后台 → 安全设置 → 开启刷新开关 → 发版 |

> 为什么不再把 token 放 `.env`？因为进程启动后 `.env` 不会重新加载,刷新 token 后必须重启服务才能生效. 独立 JSON 缓存文件实现了**热更新**. 

#### 知识库成员管理
```
feishuWikiMemberList(space_id="xxx")           # 获取成员列表
feishuWikiMemberAdd(space_id="xxx", member_id="ou_xxx", perm="view")  # 添加成员
```

### 9. 查找用户
```
feishuUserSearch(email="zhangsan@company.com")
```

## 输出约束(⚠️ 必须严格遵守)

### 禁止大段输出到 MessageBubble

**绝不允许**将工具返回的原始数据(文档列表、搜索结果、用户列表、块结构等)直接复制粘贴到对话消息中. 

✅ **正确做法**：
- 用 **一句话摘要** 报告结果(如"已创建文档并写入 3 个内容块"、"找到 5 篇匹配文档")
- 详细数据已通过工具返回,用户可在右侧抽屉查看
- 如需引用具体数据,只摘取最关键的一两条

❌ **错误做法**：
- 把 `feishuDocBlocks` 返回的 50 个 block 逐行列出
- 把 `feishuDocSearch` 返回的 20 条结果全部粘贴到消息里
- 把 `feishuUserSearch` 返回的用户 JSON 直接输出

### 任务进度记录

涉及多步骤的操作(创建文档→追加内容→分享权限),**必须在每步完成后记录当前进度**：

```
[进度] 步骤 1/3: 文档已创建 → document_id: xxx
[进度] 步骤 2/3: 内容已追加 → 写入 15 个块
[进度] 步骤 3/3: 权限已分享 → 3 位用户获得访问权
```

如果某一步失败,记录失败位置和原因,不要静默跳过或从头重来. 

## 错误码精确映射(⚠️ 必须根据 code 精准处理)

工具返回的错误结果中包含 `code` 和 `details` 字段. `details` 中可能有 `field`(具体参数名)和 `fieldMessage`(具体原因). 

| 错误码 | 精确含义 | 常见触发场景 | 处理方式 |
|--------|---------|-------------|---------|
| `1770001` | 参数不合法 | block_type 与内容不匹配、content 格式错误、缺少必填参数 | 检查 `details.field` 指出哪个参数有问题,对照 API 文档修正 |
| `1770002` | 文档/块不存在 | document_id 或 block_id 错误 | 确认 ID 是否正确,文档是否被删除 |
| `1770003` | 无权限访问文档 | 文档未分享给当前用户/应用 | 检查文档权限或改用 user_access_token |
| `1770032` | 块内容为空 | 所有 elements 被过滤掉或 text_run.content 为空 | 检查 content 是否为空字符串或只有空格 |
| `1770033` | 单个文本块超 10000 字符 | 单个 text_run.content 太长 | 拆分内容,使用多个段落 |
| `1770034` | 单次请求块数超 50 | blocks 数组长度 > 50 | 分批写入,每批不超过 50 个 |
| `99991661` | 缺少必填参数 | 请求体缺少必填字段 | 检查 `details.fieldViolations` 中缺失的字段 |
| `99991662` | 参数类型错误 | 传了字符串但 API 要求数字/数组 | 检查 `details.field` 和 `details.expected` |
| `99991679` | 缺少 scope 权限 | 当前 token 没有该 API 的权限 | 开发者后台开通权限 → 重新授权 → 换 token |
| `99991677` | access_token 过期 | token 超过有效期 | 后端自动刷新,或手动调用 `feishuTokenRefresh()` |
| `131006` | Wiki 需要 user_access_token | 用 tenant token 操作 Wiki | 改用 user_access_token 或传 `use_user_token=true` |

**处理原则**：
1. 先读 `code`,再读 `details.field` 和 `details.fieldMessage`
2. 如果 `details` 包含具体参数名,在错误报告中明确指出(如"参数 `blocks[0].block_type` 不合法")
3. 不要只报告"参数不合法",必须定位到具体参数

## 注意事项
- **更新/删除前必须先获取块结构**：飞书 API 要求知道块在文档中的位置
- **追加内容**：使用 `feishuDocAppend`,可以传 `content`(纯文本字符串,自动分段)或 `blocks`(飞书块格式数组)
- **搜索文档**：`feishuDocSearch` 在云空间中搜索,不是搜索单个文档内容
- **文档权限**：应用创建的文档默认归应用所有,如需共享给用户,需额外授予权限

## 示例对话

用户："帮我创建一个周报文档"
→ `feishuDocCreate(title="周报 - 第X周")` → `feishuDocAppend(document_id=..., content="本周工作...")`

用户："把刚才的文档标题改成月报"
→ `feishuDocBlocks(document_id=...)` 获取 heading1 块的 block_id → `feishuDocUpdateBlock(document_id=..., block_id=..., heading1={...})`

用户："给张三发一条飞书消息"
→ `feishuUserSearch(email="zhangsan@company.com")` 获取 open_id → `feishuImSend(receive_id=..., content="...")`
