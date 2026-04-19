# 语雀 (Yuque) API 测试实验室

> 使用语雀**内部 Web API**，通过浏览器 Cookie 认证，完全免费，无需超级会员。

---

## 文件结构

模仿飞书测试实验室的组织方式：

| 文件 | 说明 |
|------|------|
| `01_yuque_webapi.ipynb` | 基础 API 介绍：认证、列出知识库、获取目录、端点速查 |
| `02_doc_crud.ipynb` | **文档 CRUD 完整验证**：创建→读取验证→更新→再读取验证→删除 |
| `03_rich_formats.ipynb` | **富格式元素测试**：标题、列表、加粗斜体、表格、代码块、公式、引用 |
| `04_update_delete.ipynb` | **更新删除细粒度测试**：只更新标题、只更新内容、同时更新、边界测试 |
| `yuque_client.py` | 语雀 API 通用客户端（封装认证、请求、便捷方法） |
| `lake_builder.py` | Lake HTML 构建工具（`markdown_to_lake()` 及各种元素函数） |
| `requirements.txt` | Python 依赖 |
| `README.md` | 本文件 |

---

## 快速开始

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置 Cookie（项目根目录的 .env 文件）
# YUQUE_SESSION=从浏览器复制的值
# YUQUE_CTOKEN=从浏览器复制的值

# 3. 按顺序运行 notebook
# 01_yuque_webapi.ipynb -> 02_doc_crud.ipynb -> 03_rich_formats.ipynb -> 04_update_delete.ipynb
```

---

## 核心发现

### body_asl 字段（重要！）

语雀内部 Web API 创建/更新文档时，**必须使用 `body_asl` 字段**保存内容。

| 字段 | 用途 | 结果 |
|------|------|------|
| `body` | 创建/更新 | ❌ API 返回成功，但内容为空（0 chars） |
| `body_asl` | 创建/更新 | ✅ **内容正确保存** |
| `content` | 读取返回 | ✅ 已渲染的 Lake HTML |

这是内部 Web API 与 Open API v2 的重要区别之一。

### 认证方式

| 对比项 | Open API v2 | 内部 Web API（本实验室使用） |
|--------|------------|---------------------------|
| 认证方式 | `X-Auth-Token` | `Cookie: _yuque_session + _ctoken` |
| 需要会员 | ✅ 超级会员（299元/年） | ❌ **完全免费** |
| 端点前缀 | `/api/v2/...` | `/api/...` |
| 写操作 CSRF | 不需要 | 需要 `X-CSRF-Token` + `Referer` |
| 搜索功能 | ✅ 支持 | ❌ 不支持 |

### 获取 Cookie 步骤

1. 登录语雀网页版：https://www.yuque.com
2. 按 **F12** 打开浏览器开发者工具
3. 切换到 **Application**（应用）标签
4. 左侧点击 **Cookies** → `https://www.yuque.com`
5. 复制以下两个值：
   - `_yuque_session` 的 **Value**
   - `_ctoken` 的 **Value**
6. 粘贴到项目根目录的 `.env` 文件

> ⚠️ **安全提醒**：这两个值是你的登录凭证，等同于账号密码。**不要泄露给他人，不要提交到 Git！**

---

## API 端点总览

### 读取操作（无需 CSRF）

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/books` | 列出知识库 |
| GET | `/api/books/{id}/toc` | 获取目录 |
| GET | `/api/docs/{slug}?book_id={id}` | 读取文档 |

### 写操作（需要 `X-CSRF-Token` + `Referer`）

| 方法 | 端点 | Body | 说明 |
|------|------|------|------|
| POST | `/api/docs` | `{book_id, title, body_asl, format, public}` | 创建文档 |
| PUT | `/api/docs/{id}` | `{title, body_asl, format}` | 更新文档（id 是数字 ID）|
| DELETE | `/api/docs/{id}?book_id={id}` | - | 删除文档（id 是数字 ID）|

---

## 常见错误

| 状态码 | 错误信息 | 原因 | 解决方法 |
|--------|----------|------|----------|
| 401 | Unauthorized | Cookie 过期或无效 | 重新登录语雀，获取新的 Cookie |
| 403 | missing csrf referer or origin | 缺少 Referer 头 | 写操作时添加 `Referer` 头 |
| 404 | Not Found | 文档/知识库不存在 | 检查 id/slug 是否正确 |
| 422 | id invalid | PUT 时缺少 id 参数 | 确保使用数字 doc_id |

---

## 相关文件

- **后端路由**：`server/routes/yuque.ts`
- **前端工具定义**：`src/theme/tools/yuque/definitions.ts`
- **前端工具执行器**：`src/theme/tools/yuque/executors.ts`
- **Agent Skill**：`.skills/yuque-assistant/SKILL.md`
