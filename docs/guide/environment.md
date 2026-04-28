# 环境变量配置

MetaBlog 通过 `.env` 文件管理所有配置。以下是目前支持的全部环境变量说明。

## 📋 配置文件位置

```
项目根目录/.env
```

> 项目已包含 `.env` 文件(不在版本控制中)。如需重置，可复制 `.env.example`(如果存在)。

---

## 🔑 AI 模型配置(必填至少一项)

所有 AI Provider 支持 `LLM_` 前缀(推荐)和 `VITE_` 前缀(兼容旧配置)。系统会优先读取 `LLM_` 前缀的变量。

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `LLM_DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-...` |
| `LLM_DEEPSEEK_MODEL` | 模型名称 | `deepseek-v4-pro` |
| `LLM_DEEPSEEK_BASE_URL` | 自定义 API 地址(可选) | `https://api.deepseek.com/v1` |
| `LLM_KIMI_API_KEY` | Kimi API Key | `sk-...` |
| `LLM_KIMI_MODEL` | 模型名称 | `kimi-k2.5` |
| `LLM_ZHIPU_API_KEY` | 智谱 API Key | `your-api-key` |
| `LLM_ZHIPU_MODEL` | 模型名称 | `glm-4` |
| `LLM_OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `LLM_OPENAI_MODEL` | 模型名称 | `gpt-4o` |
| `LLM_ANTHROPIC_API_KEY` | Anthropic API Key | `sk-ant-...` |
| `LLM_ANTHROPIC_MODEL` | 模型名称 | `claude-3-5-sonnet` |
| `LLM_GEMINI_API_KEY` | Gemini API Key | `...` |
| `LLM_GEMINI_MODEL` | 模型名称 | `gemini-1.5-pro` |
| `LLM_QWEN_API_KEY` | 通义千问 API Key | `sk-...` |
| `LLM_QWEN_MODEL` | 模型名称 | `qwen-plus` |
| `LLM_BAICHUAN_API_KEY` | 百川 API Key | `sk-...` |
| `LLM_BAICHUAN_MODEL` | 模型名称 | `Baichuan4` |
| `LLM_XAI_API_KEY` | xAI API Key | `...` |
| `LLM_XAI_MODEL` | 模型名称 | `grok-beta` |
| `LLM_COHERE_API_KEY` | Cohere API Key | `...` |
| `LLM_COHERE_MODEL` | 模型名称 | `command-r-plus` |
| `LLM_OPENROUTER_API_KEY` | OpenRouter API Key | `sk-...` |
| `LLM_OPENROUTER_MODEL` | 模型名称 | `anthropic/claude-3.5-sonnet` |

### 通用设置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `LLM_DEFAULT_PROVIDER` | 默认使用的 AI Provider | `deepseek` |
| `LLM_DAILY_BUDGET` | 每日预算上限(美元) | `10` |

---

## 📱 飞书集成(可选)

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| `FEISHU_APP_ID` | 飞书应用 ID | 飞书开放平台 → 应用详情 |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | 飞书开放平台 → 凭证管理 |
| `LARK_APP_ID` |  Lark 应用 ID(兼容) | 同上 |
| `LARK_APP_SECRET` | Lark 应用密钥(兼容) | 同上 |

> 配置后 AI 可调用 `feishuDocCreate`、`feishuDocAppend`、`feishuImSend` 等工具。

---

## 📖 语雀集成(可选)

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| `YUQUE_SESSION` | 语雀 Session Cookie | 浏览器开发者工具 → Application → Cookies → `_yuque_session` |
| `YUQUE_CTOKEN` | 语雀 CToken | 浏览器开发者工具 → Application → Cookies → `_ctoken` |

> 配置后 AI 可调用 `yuqueDocCreate`、`yuqueDocUpdate`、`yuqueImageUpload` 等工具。

---

## 🔧 GitHub 集成(可选)

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| `LLM_GITHUB_TOKEN` | GitHub Personal Access Token | GitHub Settings → Developer settings → Personal access tokens |

> 配置后 AI 可调用 `github_get_repo`、`github_search_code` 等工具，API 速率限制更高。

---

## 🌐 网络代理(可选)

| 变量名 | 说明 |
|--------|------|
| `HTTP_PROXY` | HTTP 代理地址 |
| `HTTPS_PROXY` | HTTPS 代理地址 |
| `ALL_PROXY` | 全局代理地址 |

---

## ✅ 最小配置示例

只需要配置一个 AI Provider 即可运行：

```env
# DeepSeek(推荐)
LLM_DEEPSEEK_API_KEY=sk-your-key-here
LLM_DEEPSEEK_MODEL=deepseek-v4-pro
LLM_DEFAULT_PROVIDER=deepseek

# 或 Kimi
# LLM_KIMI_API_KEY=sk-your-key-here
# LLM_KIMI_MODEL=kimi-k2.5
# LLM_DEFAULT_PROVIDER=kimi
```

---

## 🔒 安全提示

1. **不要提交 `.env` 文件到版本控制**(已配置 `.gitignore`)
2. **API Key 只在服务端使用**：前端通过 `/api/chat` 代理调用 AI API，不会暴露 Key
3. **定期轮换 API Key**：尤其是飞书 App Secret 等敏感凭证
4. **使用 `LLM_` 前缀**：新配置统一使用 `LLM_` 前缀，`VITE_` 前缀仅为兼容保留
