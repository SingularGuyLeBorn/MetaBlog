# 飞书 Open API 双 Token 认证与权限指南

> 本文档基于飞书开放平台实际接口验证整理，覆盖云文档(docx)、知识库(Wiki)、Drive、通讯录等核心 API 的权限依赖关系。
>
> 实验环境：`feishu_client.py` + 自建应用(企业自建应用)

---

## 1. 两个 Token 的本质区别

飞书开放平台提供两种访问令牌，**不是互斥关系，而是互补关系**。一个完整的应用通常需要同时配置两种 Token。

### 1.1 tenant_access_token(应用级令牌)

| 项目 | 说明 |
|------|------|
| **获取方式** | `POST /auth/v3/tenant_access_token/internal`，传入 `app_id` + `app_secret` |
| **身份代表** | 代表「应用」本身，不是某个具体用户 |
| **有效期** | 约 2 小时(7200 秒)，可缓存复用 |
| **适用场景** | 应用独立操作的 API：创建普通文档、上传文件、搜索文档、通讯录查询等 |
| **权限来源** | 开发者在飞书开放平台 → 应用管理 → 权限管理 中**为应用勾选**的权限 |

**关键特性**：
- 用 tenant token 创建的文档，**拥有者是「应用」**，不是任何真实用户
- 应用创建的文档默认只有应用自己能编辑，用户飞书客户端里看不到
- 如果需要让用户看到/编辑，必须通过 Drive API 分享权限给用户

### 1.2 user_access_token(用户级令牌)

| 项目 | 说明 |
|------|------|
| **获取方式** | 飞书开放平台 → 你的应用 → **API 调试台 → 获取 Token**(临时)<br>或走 OAuth2 授权流程(生产环境) |
| **身份代表** | 代表「某个具体用户」，具有该用户在飞书内的身份和权限 |
| **有效期** | 约 2 小时(临时调试 Token) |
| **适用场景** | 必须以用户身份执行的 API：创建 Wiki 知识库、Wiki 节点操作、将文档移入 Wiki 等 |
| **权限来源** | 需要应用**同时开通「用户权限」**，且用户本人授权 |

**关键特性**：
- 用 user token 创建的 Wiki 知识库，用户是空间管理员
- 用 user token 创建的文档，**用户是拥有者**，可以手动操作、分享、迁入 Wiki
- user token 操作 Wiki 时，受该用户在飞书内的实际权限约束(如是否有创建知识库的权限)

### 1.3 核心差异对比

| 维度 | tenant_access_token | user_access_token |
|------|---------------------|-------------------|
| 我是谁 | 应用(机器人) | 具体用户 |
| 创建文档的拥有者 | 应用 | 用户 |
| 创建 Wiki 知识库 | ❌ 不支持 | ✅ 必须 |
| 文档迁入 Wiki | ❌ 无权限移动 | ✅ 文档拥有者可移动 |
| 是否需要用户授权 | 不需要 | 需要(应用权限中勾选用户权限) |
| Token 获取难度 | 简单(代码自动获取) | 需手动复制或走 OAuth |
| 缓存 | 可本地缓存 | 建议每次重新获取 |

---

## 2. 必须开通的权限清单

在飞书开放平台 → 你的应用 → **权限管理** 中，以下权限需要**同时开通「应用权限」和「用户权限」**(如果两类都有的话)。

### 2.1 云文档权限(docx)

| 权限名称 | 应用权限 | 用户权限 | 说明 |
|----------|----------|----------|------|
| `docx:document` | ✅ 必须 | ✅ 必须 | 创建、读取、更新、删除 docx 文档块 |
| `docx:document:readonly` | 可选 | 可选 | 仅读取文档内容 |

**重要**：`docx:document` 的「用户权限」开通后，**必须重新获取 user_access_token**，旧 Token 不会自动获得新权限。

### 2.2 知识库权限(wiki)

| 权限名称 | 应用权限 | 用户权限 | 说明 |
|----------|----------|----------|------|
| `wiki:wiki` | ✅ 推荐 | ✅ 必须 | 知识库空间/节点的所有操作 |
| `wiki:wiki:readonly` | 可选 | 可选 | 仅读取知识库 |

**注意**：
- 创建 Wiki 空间(`POST /wiki/v2/spaces`)**只能用 user_access_token**，tenant token 直接报错
- 其他 Wiki API(list/get/update space、create/list node)虽然 tenant token 也能调通，但如果该 Wiki 是用 user token 创建的，tenant token 访问会报 `131006 permission denied`
- **最佳实践**：只要配置了 `user_access_token`，所有 `/wiki/*` 路径都自动使用 user token

### 2.3 Drive 权限(文件/素材/权限分享)

| 权限名称 | 应用权限 | 用户权限 | 说明 |
|----------|----------|----------|------|
| `drive:drive` | ✅ 必须 | ✅ 必须 | 文件上传、下载、权限管理、素材上传 |
| `drive:drive:readonly` | 可选 | 可选 | 仅读取文件元信息 |

**注意**：
- 上传图片到 docx 文档(`POST /drive/v1/medias/upload_all`)需要 `drive:drive`
- 将应用创建的文档分享给用户(`POST /drive/v1/permissions/{token}/members`)也需要 `drive:drive`
- 文档删除(`DELETE /drive/v1/files/{token}`)同样需要 `drive:drive`

### 2.4 通讯录权限(contact)

| 权限名称 | 应用权限 | 用户权限 | 说明 |
|----------|----------|----------|------|
| `contact:user.department:readonly` | ✅ 必须 | — | 通过邮箱/手机号查询用户 open_id |
| `contact:user.department` | 可选 | — | 读取 + 修改用户部门信息 |

**注意**：查询用户 open_id(`POST /contact/v3/users/batch_get_id`)需要通讯录权限，且被查询用户必须在同一企业租户内。

### 2.5 权限开通检查清单

在你开始实验前，请确认以下权限已全部勾选：

- [ ] `docx:document`(应用权限)
- [ ] `docx:document`(用户权限)
- [ ] `wiki:wiki`(用户权限)
- [ ] `drive:drive`(应用权限)
- [ ] `drive:drive`(用户权限)
- [ ] `contact:user.department:readonly`(应用权限)

> ⚠️ **权限修改后必须重新获取 `user_access_token`**！在 API 调试台点击「获取 Token」拿到新的 Token，更新到 `.env` 文件中。

---

## 3. API 分类与依赖关系

### 3.1 云文档 API(docx)

| API | 方法 | 路径 | 依赖 Token | 依赖权限 | 说明 |
|-----|------|------|------------|----------|------|
| 创建文档 | POST | `/docx/v1/documents` | tenant / user | `docx:document` | tenant 创建→拥有者是应用；user 创建→拥有者是用户 |
| 追加块 | POST | `/docx/v1/documents/{id}/blocks/{block_id}/children` | tenant / user | `docx:document` | 往文档末尾追加内容块 |
| 更新块 | PUT | `/docx/v1/documents/{id}/blocks/{block_id}` | tenant / user | `docx:document` | 替换整个块内容 |
| 删除块 | DELETE | `/docx/v1/documents/{id}/blocks/{block_id}/children/batch_delete` | tenant / user | `docx:document` | 按索引范围删除子块 |
| 读取纯文本 | GET | `/docx/v1/documents/{id}/raw_content` | tenant / user | `docx:document` 或 readonly | 获取文档纯文本内容 |
| 获取块结构 | GET | `/docx/v1/documents/{id}/blocks` | tenant / user | `docx:document` 或 readonly | 获取文档所有块信息 |
| 读取单个块 | GET | `/docx/v1/documents/{id}/blocks/{block_id}` | tenant / user | `docx:document` 或 readonly | 获取单个块详情 |

**特殊说明**：
- 文档块类型：`1=page`, `2=text`, `3-11=heading1-9`, `12=bullet`, `13=ordered`, `14=code`, `15=quote`, `27=image`, `31=table`, `32=table_cell`
- 公式块：在 `text` 块中使用 `equation` 元素，内容为 KaTeX 语法(`\frac` 需写成 `\\frac`)

### 3.2 知识库 API(wiki)

| API | 方法 | 路径 | 依赖 Token | 依赖权限 | 说明 |
|-----|------|------|------------|----------|------|
| **创建知识库** | POST | `/wiki/v2/spaces` | **user 必须** | `wiki:wiki` | 唯一必须用 user token 的接口 |
| 列出知识库 | GET | `/wiki/v2/spaces` | user(推荐) | `wiki:wiki` | 自动翻页获取全部 |
| 获取知识库 | GET | `/wiki/v2/spaces/{space_id}` | user(推荐) | `wiki:wiki` | 获取空间详情 |
| 更新知识库 | PUT | `/wiki/v2/spaces/{space_id}` | user(推荐) | `wiki:wiki` | 修改名称/描述 |
| 删除知识库 | DELETE | `/wiki/v2/spaces/{space_id}` | user(推荐) | `wiki:wiki` | 删除整个空间 |
| 创建节点 | POST | `/wiki/v2/spaces/{space_id}/nodes` | user(推荐) | `wiki:wiki` | 在知识库中创建新文档节点 |
| 列出节点 | GET | `/wiki/v2/spaces/{space_id}/nodes` | user(推荐) | `wiki:wiki` | 获取某层级下的节点列表 |
| 移动节点 | POST | `/wiki/v2/spaces/{space_id}/nodes/{token}/move` | user(推荐) | `wiki:wiki` | 改变节点在树中的位置 |
| **文档迁入 Wiki** | POST | `/wiki/v2/spaces/{space_id}/nodes/move_docs_to_wiki` | **user 必须** | `wiki:wiki` + `docx:document` | 将外部 docx 移入知识库 |

**重要规则**：
1. **创建知识库**和**文档迁入 Wiki**这两个操作**必须用 `user_access_token`**，tenant token 会直接报错
2. 用 user token 创建的 Wiki，tenant token 可能无法访问(`131006 permission denied`)
3. 飞书**未提供 Wiki 节点删除 API**，需在飞书客户端手动删除

### 3.3 Drive API(文件/素材/权限)

| API | 方法 | 路径 | 依赖 Token | 依赖权限 | 说明 |
|-----|------|------|------------|----------|------|
| 上传素材 | POST | `/drive/v1/medias/upload_all` | tenant / user | `drive:drive` | 上传图片等素材到文档 |
| 分享文档权限 | POST | `/drive/v1/permissions/{token}/members` | tenant / user | `drive:drive` | 将文档分享给指定用户 |
| 取消权限 | DELETE | `/drive/v1/permissions/{token}/members/{member_id}` | tenant / user | `drive:drive` | 移除协作者权限 |
| 搜索文档 | POST | `/suite/docs-api/search/object` | tenant / user | — | 按关键词搜索云文档 |

**素材上传注意事项**：
- docx 图片上传时，`parent_type` 必须为 `"docx_image"`，`parent_node` 必须为**图片块 ID**(不是 document_id)
- 上传成功后返回 `file_token`，再通过 PATCH 绑定到图片块

### 3.4 通讯录 API(contact)

| API | 方法 | 路径 | 依赖 Token | 依赖权限 | 说明 |
|-----|------|------|------------|----------|------|
| 批量查询用户 | POST | `/contact/v3/users/batch_get_id` | tenant | `contact:user.department:readonly` | 通过邮箱/手机号换 open_id |

---

## 4. 权限矩阵速查表

### 4.1 Token 选择决策树

```
操作目标是什么？
├── 创建/管理 Wiki 知识库
│   └── → 必须用 user_access_token
├── 操作 Wiki 节点(创建/列出/移动)
│   └── → 推荐 user_access_token(避免 131006 权限错误)
├── 将外部文档移入 Wiki
│   └── → 必须用 user_access_token
│   └── → 且文档必须用 user token 创建(用户是拥有者)
├── 创建/编辑普通云文档
│   └── → tenant_token 或 user_token 均可
├── 上传图片/文件素材
│   └── → tenant_token(简单)或 user_token
├── 分享文档给用户
│   └── → tenant_token 或 user_token
└── 查询用户 open_id
    └── → tenant_token
```

### 4.2 典型场景权限组合

| 场景 | tenant_token | user_token | 应用权限 | 用户权限 |
|------|:------------:|:----------:|:--------:|:--------:|
| 仅创建普通文档并编辑 | ✅ | — | `docx:document` | — |
| 创建文档 + 分享给人看 | ✅ | — | `docx:document`<br>`drive:drive`<br>`contact:...` | — |
| 创建 Wiki 知识库 | — | ✅ | — | `wiki:wiki` |
| 外部文档 → 写入内容 → 迁入 Wiki | ✅创建 | ✅迁入 | `docx:document`<br>`drive:drive` | `wiki:wiki`<br>`docx:document` |
| **推荐方案(本文档)** | ✅辅助 | ✅主用 | 全部开通 | 全部开通 |

---

## 5. 常见问题排查

### 5.1 `131006: permission denied`

**可能原因**：
1. 用 tenant token 访问了 user token 创建的 Wiki → 换成 user token
2. 用 tenant token 创建了文档，但用 user token 尝试将其移入 Wiki → 创建文档时也用 user token
3. 权限未开通或开通后未重新获取 user token → 检查权限清单并重新获取 Token

**排查步骤**：
```python
# 确认当前使用的是什么 token
print(f"user_token 配置: {client.user_access_token[:10]}..." if client.user_access_token else "未配置")

# 强制指定 token 类型测试
# tenant token
try:
    client.api("GET", f"/wiki/v2/spaces/{space_id}")
    print("tenant token: OK")
except Exception as e:
    print(f"tenant token: FAIL - {e}")

# user token
try:
    client.api("GET", f"/wiki/v2/spaces/{space_id}", use_user_token=True)
    print("user token: OK")
except Exception as e:
    print(f"user token: FAIL - {e}")
```

### 5.2 `1770001 invalid param`(上传图片)

- 创建图片块时只传 `"image": {}`，不要预填 token
- 上传素材时 `parent_type` 必须是 `"docx_image"`，`parent_node` 必须是图片块的 `block_id`

### 5.3 `relation mismatch`(上传图片)

- `parent_node` 错填成了 `document_id` → 必须填图片块的 `block_id`

### 5.4 `99991663 access_denied` 或 `99991661`

- 应用未发布或权限未申请 → 去飞书开放平台确认权限已勾选并**发布版本**

### 5.5 Wiki 节点删除 API 不存在

飞书开放平台**未提供**通过 API 删除 Wiki 节点的接口。 workaround：
- 在飞书客户端手动删除：知识库 → 找到文档 → 右键 → 删除
- 或者删除整个 Wiki 空间(`DELETE /wiki/v2/spaces/{space_id}`)

---

## 6. 获取 user_access_token

### 6.1 临时调试(推荐实验阶段使用)

1. 打开 [飞书开放平台](https://open.feishu.cn/)
2. 进入「你的应用」→「API 调试台」
3. 选择需要调试的 API(如 Wiki 相关)
4. 点击「获取 Token」按钮
5. 复制得到的 `u-xxxxxxxx` 格式 Token
6. 写入 `.env` 文件：`FEISHU_USER_ACCESS_TOKEN=u-xxxxxxxx`

### 6.2 生产环境(OAuth2 授权)

```
1. 引导用户访问授权链接：
   https://open.feishu.cn/open-apis/authen/v1/authorize?
     app_id=YOUR_APP_ID&
     redirect_uri=YOUR_REDIRECT_URI

2. 用户授权后，飞书回调 redirect_uri 并附带 code

3. 用 code 换取 user_access_token：
   POST /open-apis/authen/v1/access_token
   { "grant_type": "authorization_code", "code": "xxx" }
```

详见官方文档：[飞书 OAuth2 授权流程](https://open.feishu.cn/document/server-docs/authentication-management/access-token/ obtain-user_access_token)

---

## 7. 最佳实践总结

1. **同时配置两种 Token**：`.env` 中同时写入 `FEISHU_APP_ID`/`FEISHU_APP_SECRET` + `FEISHU_USER_ACCESS_TOKEN`

2. **Wiki 操作统一用 user token**：在 `feishu_client.py` 中已实现自动判断——只要配置了 user token 且路径以 `/wiki/` 开头，自动使用 user token

3. **需要迁入 Wiki 的文档用 user token 创建**：这样用户才是文档拥有者，才有权限将其移入 Wiki

4. **权限修改后必刷新 user token**：开通新权限 → 重新获取 Token → 更新 `.env`

5. **tenant token 自动缓存**：`feishu_client.py` 已内置 token 缓存机制，无需手动管理

6. **文档分享需要通讯录权限**：如果想把应用创建的文档分享给真实用户查看，需要开通 `contact:user.department:readonly` 查询用户 open_id，再用 `drive:drive` 分享权限

---

*文档版本：2026-04-23*
*基于飞书 Open API v2 验证*
