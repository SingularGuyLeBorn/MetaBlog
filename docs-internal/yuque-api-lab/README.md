# 语雀 (Yuque) API 测试实验室

> 使用语雀**内部 Web API**，通过浏览器 Cookie 认证，完全免费，无需超级会员。

---

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `01_yuque_webapi.ipynb` | 完整的 CRUD 测试 Notebook，包含全部 6 个 API 端点的可执行代码 |

---

## 🔐 认证方式

### 与 Open API v2 的区别

| 对比项 | Open API v2 | 内部 Web API（本实验室使用） |
|--------|------------|---------------------------|
| 认证方式 | `X-Auth-Token` | `Cookie: _yuque_session=xxx; _ctoken=xxx` |
| 需要会员 | ✅ 超级会员（299元/年） | ❌ **完全免费** |
| 端点前缀 | `/api/v2/...` | `/api/...` |
| 写操作 CSRF | 不需要 | 需要 `X-CSRF-Token` + `Referer` |
| 搜索功能 | ✅ 支持 | ❌ 不支持 |
| 内容格式 | Markdown / Lake | Lake HTML |

### 获取 Cookie 步骤

1. 登录语雀网页版：https://www.yuque.com
2. 按 **F12** 打开浏览器开发者工具
3. 切换到 **Application**（应用）标签
4. 左侧点击 **Cookies** → `https://www.yuque.com`
5. 复制以下两个值：
   - `_yuque_session` 的 **Value**
   - `_ctoken` 的 **Value**
6. 粘贴到项目根目录的 `.env` 文件：
   ```bash
   YUQUE_SESSION=复制的_yuque_session值
   YUQUE_CTOKEN=复制的_ctoken值
   ```

> ⚠️ **安全提醒**：这两个值是你的登录凭证，等同于账号密码。**不要泄露给他人，不要提交到 Git！**

---

## 📡 API 端点总览

### 读取操作（无需 CSRF）

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/books` | 列出知识库 |
| GET | `/api/books/{id}/toc` | 获取目录结构 |
| GET | `/api/docs/{slug}?book_id={id}` | 读取文档详情 |

### 写操作（需要 `X-CSRF-Token` + `Referer`）

| 方法 | 端点 | Body | 说明 |
|------|------|------|------|
| POST | `/api/docs` | `{book_id, title, body, format, public}` | 创建文档 |
| PUT | `/api/docs/{id}` | `{title, body, format}` | 更新文档（id 是数字 ID） |
| DELETE | `/api/docs/{id}?book_id={id}` | - | 删除文档（id 是数字 ID） |

### 关键字段说明

**body_asl（创建/更新必需）**
- 语雀内部 Web API 使用 `body_asl` 字段保存文档内容
- 使用 `body` 字段会导致 API 返回成功但内容为空（content 长度为 0）
- 格式为 Lake HTML，以 `<!doctype lake>` 开头

**content（读取返回）**
- 读取文档时返回 `content` 字段（已渲染的 Lake HTML）
- 不是 `body` 也不是 `body_asl`

### 请求头模板

```python
headers = {
    'Cookie': '_yuque_session=xxx; _ctoken=xxx',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-CSRF-Token': 'xxx',              # _ctoken 的值
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.yuque.com/{book_id}',  # 写操作必需！
}
```

---

## ⚠️ 常见错误

| 状态码 | 错误信息 | 原因 | 解决方法 |
|--------|----------|------|----------|
| 401 | Unauthorized | Cookie 过期或无效 | 重新登录语雀，获取新的 Cookie |
| 403 | missing csrf referer or origin | 缺少 Referer 头 | 写操作时添加 `Referer` 头 |
| 404 | Not Found | 文档/知识库不存在 | 检查 id/slug 是否正确 |
| 422 | id invalid | PUT 时 URL 或 Body 中 id 不对 | 确保使用数字 ID，且 URL 路径正确 |

---

## 🔗 相关文件

- **后端路由**：`server/routes/yuque.ts`
- **前端工具定义**：`src/theme/tools/yuque/definitions.ts`
- **前端工具执行器**：`src/theme/tools/yuque/executors.ts`
- **Agent Skill**：`.skills/yuque-assistant/SKILL.md`
