# Agent 网页读取能力设计文档

> 文档版本: v1.0  
> 最后更新: 2026-04-23  
> 关联系统: `server/routes/platform-parser.ts`, `src/theme/tools/platform/`

---

## 一、当前架构总览

Agent 读取网页的能力由 **Backend 统一解析器** + **Frontend 工具执行器** 两层构成：

```
用户输入链接
    │
    ▼
LLM 选择工具(parsePlatformLink / parseZhihu / parseBilibili ...)
    │
    ▼
Frontend Tool Executor ─────────────────────────────┐
    │                                               │
    │ 统一入口: parsePlatformLink                    │ Legacy 独立工具
    │    POST /api/platform/parse                   │    parseZhihu
    │        { url }                                │    parseXiaohongshu
    │                                               │    parseWechat
    ▼                                               │
Backend /api/platform/parse ◄───────────────────────┘
    │
    ├─ 平台检测(hostname 路由)
    ├─ HTML 获取(fetch / Playwright)
    ├─ 平台专用解析器
    └─ 返回结构化 ParseResult
```

### 1.1 为什么 Backend 做解析？

| 问题 | 前端直接 fetch | Backend 代理 |
|---|---|---|
| CORS | 知乎/B站 会拦截 | 无限制 |
| 反爬 | 拿不到内容 | 可控制 UA、Cookie、Playwright |
| 密钥安全 | API key 暴露给浏览器 | 藏在 backend env |
| JS 渲染 | 前端无法做 | Playwright / CDP |

### 1.2 数据契约

Backend 返回统一结构 `ParseResult`：

```ts
interface ParseResult {
  title: string;           // 页面标题
  author?: string;         // 作者/UP主/公众号名
  content?: string;        // 正文(已清洗、已截断)
  images?: string[];       // 图片 URL 列表
  videos?: string[];       // 视频 URL 列表
  comments?: any[];        // 热评(预留)
  metadata?: Record<string, any>;  // 平台特有字段
  platform: string;        // 平台标识: zhihu / wechat / bilibili / ...
  method: string;          // 解析方式: jina-reader / readability-js / playwright-render / ...
  url: string;             // 原始 URL
}
```

---

## 二、当前实现详解

### 2.1 专用平台解析器(6 个平台)

#### 知乎 —— 双路提取(JSON + Regex)

知乎页面在 SSR 时将完整数据注入 `<script id="js-initialData">`：

```ts
const initialMatch = html.match(
  /<script id="js-initialData" type="text\/json">([\s\S]*?)<\/script>/
);
const data = JSON.parse(initialMatch[1]);
const item = Object.values(data.initialState.entities.articles)[0];
// item.title / item.author.name / item.content / img[src]
```

**第一路**(最可靠)：提取内嵌 JSON。  
**第二路**(兜底)：Regex 匹配 `.Post-RichTextContainer`。

截断：8000 字 / 10 图。

#### 微信公众号 —— Regex 精准定位

微信文章 DOM 结构稳定，关键元素有固定 ID：

| 元素 | 选择器 |
|---|---|
| 标题 | `h1.rich_media_title` |
| 公众号名 | `a#js_name` |
| 正文 | `div#js_content` |

图片特殊处理：微信用 `data-src` 做懒加载，提取时需替换占位符。

截断：8000 字 / 10 图。

#### B站 —— `__INITIAL_STATE__` 提取

B站页面注入 `window.__INITIAL_STATE__`：

```ts
const data = JSON.parse(html.match(/window\.__INITIAL_STATE__=([\s\S]*?);\(function\(\)/)[1]);
const videoData = data?.videoData || data?.epInfo;
// videoData.title / videoData.owner.name / videoData.desc / videoData.pic
```

截断：5000 字 / 10 图(视频简介通常较短)。

#### 微博 —— OG 元数据

微博页面结构变化频繁，目前只提取稳定的 OG meta：

```ts
extractMeta(html, "og:title");
extractMeta(html, "og:description");
extractMeta(html, "og:image");
```

**局限**：只有标题 + 一句话描述 + 一张图，无正文。

#### 小红书 —— Playwright 渲染 + DOM 提取

小红书有强反爬，直接 fetch 返回骨架屏。Backend 对反爬平台**默认启用 Playwright**：

```ts
const isAntiCrawlPlatform = hostname.includes("xiaohongshu") || hostname.includes("douyin");
const shouldUsePlaywright = usePlaywright !== false && isAntiCrawlPlatform;
```

Playwright 渲染后，从完整 DOM 中提取：
- 标题：`h1` → `div.title`
- 正文：`#detail-desc` → `.desc`
- 作者：`.author-name` → `.nickname`
- 图片：所有 `<img src>`(过滤 avatar/icon)

**当前状态**：Playwright Chromium 未安装时，fallback 到 fetchHtml，解析效果退化为 OG 级别。

#### 抖音 —— 同小红书策略

渲染后提取：`h1` / `.nickname` / `.desc` / `video[src]` / `img[src]`。

---

### 2.2 通用网页解析器 —— 三层兜底

非上述 6 个平台的任意 URL，走 `parseGeneric`，优先级如下：

```
L1: Jina Reader(云端 API，零 Key，8秒超时)
    ↓ 失败或返回空
L2: Readability.js(本地，jsdom + @mozilla/readability)
    ↓ 失败或返回空
L3: OG 元数据 + cleanHtml(最后兜底)
```

#### L1: Jina Reader

- **格式**：`https://r.jina.ai/http://{原始URL}`(保留协议)
- **返回**：Markdown 格式，第一行通常是 `# 标题`
- **适用**：文章、博客、文档、PDF 等以正文为核心的页面
- **陷阱**：数据面板、商品页等非文章结构可能提取到错误区块
- **限制**：免费层 20 RPM

#### L2: Readability.js

- **原理**：Mozilla 的去噪算法，模拟浏览器阅读模式
- **输入**：HTML + URL(用于相对路径解析)
- **输出**：`article.title` + `article.content`(HTML)+ `article.textContent`
- **图片提取**：从 `article.content` 中提取 `<img src>`，比原始 HTML 更干净

#### L3: OG + cleanHtml

- `extractMeta()` 提取 `og:title` / `og:description` / `og:image`
- `cleanHtml()` 剥离 script/style/nav/header/footer 后取纯文本
- **噪音大**：会包含导航文字、广告文案

---

### 2.3 网络层设计

#### fetchWithTimeout

所有 HTTP 请求带 15 秒超时：

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
fetch(url, { signal: controller.signal });
```

#### fetchHtml

统一 UA + Accept-Language，模拟真实浏览器：

```ts
"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ..."
"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
```

#### Playwright 渲染

```ts
const { chromium } = await import("playwright");  // 动态导入，未安装不崩溃
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
html = await page.content();
await browser.close();
```

**动态导入**：`playwright` 未安装时不会导致 backend 崩溃，会 catch 到并 fallback 到 fetchHtml。

---

### 2.4 前端 Executor 设计

#### 统一入口：parsePlatformLink

```ts
const response = await fetch('/api/platform/parse', {
  method: 'POST',
  body: JSON.stringify({ url })
});
const result = await response.json();
return createSuccessResult({
  title: data.title,
  author: data.author,
  content: content.slice(0, max_content_length),  // LLM 可控截断
  images: extract_images ? data.images : undefined,
  comments: extract_comments ? data.comments : undefined,
  ...
});
```

LLM 可调参数：
- `extract_content`(默认 true)
- `max_content_length`(默认 5000)
- `extract_images`(默认 false)
- `extract_comments`(默认 false)

#### Legacy 独立工具

`parseZhihu` / `parseXiaohongshu` / `parseWechat` 仍保留，直接调用 `/api/proxy/fetch`(另一个 backend 代理路由)，在前端自己做 HTML 解析。

**保留原因**：向后兼容、backend 不可用时降级、差异化 UA 控制。

#### 新增薄包装工具

`parseDouyin` / `parseBilibili` / `parseWeibo` 是薄包装，直接调用 `parsePlatformLink`。

---

## 三、与 web-access 的对比分析

### 3.1 web-access 是什么？

- **类型**：Agent Skill(prompt + 本地脚本)，非 npm 库
- **核心**：CDP Proxy 直连用户本地 Chrome，天然携带登录态
- **作者**：一泽 Eze(eze-is/web-access)
- **能力**：搜索 / 抓取 / 点击 / 滚动 / 截图 / 文件上传 / 视频截帧

### 3.2 架构差异

| 维度 | 我们的 platform-parser | web-access |
|---|---|---|
| **定位** | Backend API(server 端运行) | Agent Skill(用户本地运行) |
| **浏览器** | Playwright(独立无头 Chromium) | CDP(用户日常 Chrome) |
| **登录态** | ❌ 无 | ✅ 天然携带 |
| **交互能力** | 只读 | 可读可写(点击、滚动、上传) |
| **部署** | `pnpm install` 即可 | 需用户开 Chrome 远程调试 |
| **站点经验** | ❌ 无 | ✅ 按域名存储解析策略 |
| **工具选择** | 固定优先级 | LLM 自主判断(Jina / curl / CDP) |

### 3.3 不能简单集成/取代的原因

1. **不是可导入的库** — 没有 npm 包导出，无法 `import` 使用
2. **依赖用户本地 Chrome** — 我们的 backend 在 server 端，无法保证用户开了 Chrome
3. **场景不同** — 它是桌面 Agent 的联网方案，我们是后端服务的平台解析器

### 3.4 可借鉴的点

| 借鉴点 | 实现成本 | 价值 |
|---|---|---|
| **工具选择策略** | 低 | 按页面类型选择解析器(文章→Jina，面板→Readability) |
| **站点经验积累** | 中 | 按域名存储解析策略，跨 session 复用 |
| **CDP Proxy 模式** | 高 | 作为可选组件，检测到本地 Chrome 时优先使用 |
| **页面类型判断** | 低 | Jina 不适合数据面板/商品页，需要前置判断 |

---

## 四、已知问题与限制

### 4.1 当前问题

| 问题 | 影响 | 临时方案 |
|---|---|---|
| Playwright Chromium 未安装 | 小红书/抖音只有 OG 数据 | 后续手动安装 |
| pnpm 10 忽略 build scripts | esbuild 等原生模块可能异常 | 需执行 `pnpm approve-builds` |
| 微博解析太浅 | 只有标题+一句话 | 待补充 `__INITIAL_STATE__` 提取 |
| 无缓存机制 | 同一链接每次重新抓取 | 可加内存缓存(TTL 5分钟) |
| 无 Rate Limit | 高频调用可能触发平台封 IP | 后端加请求限流或代理池 |

### 4.2 代码层面已修复的 Bug

| Bug | 修复 |
|---|---|
| Jina Reader URL 去掉 https 前缀 | 保留原始协议 |
| Jina 返回解析假设第一行总是标题 | 检测 `# ` 前缀，否则整段作为正文 |
| 图片 CDN 过滤太严格 | 放宽过滤，只排除 avatar/icon |
| `content` 空字符串 falsy fallback | 用 `trim().length > 0` 判断 |
| Readability.js 图片从原始 HTML 提取 | 改从 `article.content` 提取 |
| Playwright `networkidle` 可能超时 | 改为 `domcontentloaded` |

---

## 五、未来更新路线图

### Phase 1: 策略优化(短期，1-2 天)

#### 5.1.1 页面类型判断

在调用 Jina Reader 前，先判断页面是否"文章类"：

```ts
function isArticlePage(url: string, html: string): boolean {
  // 信号 1: OG type
  const ogType = extractMeta(html, "og:type");
  if (ogType.includes("article")) return true;
  
  // 信号 2: 结构化数据
  if (html.includes('"@type":"Article"')) return true;
  if (html.includes('"@type":"BlogPosting"')) return true;
  
  // 信号 3: 域名白名单
  const articleDomains = ['medium.com', 'zhihu.com', 'juejin.cn', 'csdn.net', 'mp.weixin.qq.com'];
  if (articleDomains.some(d => hostname.includes(d))) return true;
  
  // 信号 4: 正文密度
  const textDensity = cleanHtml(html).length / html.length;
  if (textDensity > 0.15) return true;
  
  return false;
}
```

**非文章类页面**(数据面板、商品页、搜索结果页)跳过 Jina，直接用 Readability.js 或 OG。

#### 5.1.2 站点经验系统

在 `.data/site-patterns/` 下按域名存储解析策略：

```
.data/
  site-patterns/
    zhihu.com.json
    xiaohongshu.com.json
    douyin.com.json
    ...
```

文件格式：

```json
{
  "domain": "zhihu.com",
  "aliases": ["知乎"],
  "updated": "2026-04-23",
  "method": "html-json-extract",
  "selectors": {
    "title": ["h1", "meta[property='og:title']"],
    "content": ["div.Post-RichTextContainer", "div.RichContent-inner"],
    "author": ["meta[property='og:article:author']"]
  },
  "traps": [
    "xsec_token 机制：部分回答需要特定 token 才能访问",
    "登录墙：未登录时部分内容折叠"
  ],
  "recommendedTool": "parseZhihu"
}
```

解析流程：

```
1. 检测 hostname
2. 查 site-patterns/{domain}.json
3. 有 → 按经验解析
4. 无 → 走通用流程
5. 通用流程成功后 → 自动生成/更新站点经验
```

### Phase 2: 架构扩展(中期，1 周)

#### 5.2.1 CDP Proxy 可选模式

将 web-access 的 `cdp-proxy.mjs` 改造为可选组件：

```
Backend 平台检测
    │
    ├─ 检测 localhost:3456 /health
    │   ├─ 健康 → 走 CDP Proxy(快，带登录态)
    │   └─ 不健康 → 走 Playwright / fetch
    │
    └─ 无 CDP → 现有流程
```

CDP 优于 Playwright 的场景：
- 需要登录态(知乎个人主页、微信公众号后台、小红书创作者平台)
- 需要与页面交互(点击"展开全文"、滚动加载)
- 反爬严格的平台(小红书、抖音)

实现方式：在 `platform-parser.ts` 中增加 `parseViaCDP()` 函数，通过 HTTP 调用本地 CDP Proxy。

#### 5.2.2 缓存层

内存缓存(TTL 5 分钟)：

```ts
const cache = new Map<string, { result: ParseResult; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(url: string) {
  return crypto.createHash('md5').update(url).digest('hex');
}
```

适用场景：用户重复解析同一链接、分页链接的前几页。

#### 5.2.3 请求限流

按域名限流，防止触发平台封禁：

```ts
const rateLimiters = new Map<string, { lastRequest: number; count: number }>();
const DOMAIN_MIN_INTERVAL = 2000; // 同域名最小间隔 2 秒
```

### Phase 3: 深度优化(长期)

#### 5.3.1 微博正文提取

微博页面也有内嵌 JSON(类似 B站)，可提取完整微博正文：

```ts
const weiboMatch = html.match(/\$CONFIG\['render_data']\s*=\s*\[0\]\s*\|\|\s*(\[.*?\]);/);
// 或从 window.$CONFIG 中提取
```

#### 5.3.2 评论提取

知乎回答评论、B站弹幕、微博热评 —— 这些平台都有独立的评论 API 或内嵌 JSON。

#### 5.3.3 视频内容分析

通过 CDP Proxy 的 `/eval` 操控 `<video>` 元素：
- seek 到任意时间点
- 配合 `/screenshot` 采帧
- 对视频内容进行离散采样分析

#### 5.3.4 整站爬取

参考 Firecrawl 的设计：给定入口 URL，自动发现子页面并批量解析。

---

## 六、接入指南

### 6.1 添加新平台(以 Twitter/X 为例)

**Step 1**: Backend 添加解析器

```ts
// server/routes/platform-parser.ts
async function parseTwitter(url: string, html: string): Promise<ParseResult> {
  const title = extractMeta(html, "og:title");
  const desc = extractMeta(html, "og:description");
  return {
    title, author: "", content: desc,
    images: [extractMeta(html, "og:image")].filter(Boolean),
    videos: [], comments: [],
    metadata: { source: "twitter" },
    method: "og-extract",
    platform: "twitter", url,
  };
}
```

**Step 2**: 添加路由分支

```ts
} else if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
  result = await parseTwitter(url, html);
}
```

**Step 3**(可选): 前端注册独立工具

```ts
// src/theme/tools/platform/definitions.ts
export const parseTwitterDef: ToolDefinition = { ... };

// src/theme/tools/index.ts
import { parseTwitterDef } from './platform/definitions';
toolDefinitions.push(parseTwitterDef);
```

**完成**。`parsePlatformLink` 自动覆盖，无需改 LLM prompt。

### 6.2 环境准备检查清单

```bash
# 1. 依赖安装
pnpm install

# 2. 允许 build scripts(pnpm 10 必需)
pnpm approve-builds

# 3. Playwright 浏览器(可选，小红书/抖音深度解析需要)
pnpm exec playwright install chromium

# 4. 验证
pnpm exec playwright chromium --version
```

---

## 七、附录

### 7.1 工具清单(当前 9 个)

| 工具名 | 类型 | 后端依赖 | 解析深度 |
|---|---|---|---|
| `parsePlatformLink` | 统一入口 | `/api/platform/parse` | 按平台自动 |
| `parseZhihu` | Legacy 独立 | `/api/proxy/fetch` | ⭐⭐⭐⭐⭐ |
| `parseXiaohongshu` | Legacy 独立 | `/api/proxy/fetch` | ⭐⭐ |
| `parseWechat` | Legacy 独立 | `/api/proxy/fetch` | ⭐⭐⭐⭐⭐ |
| `parseDouyin` | 薄包装 | `/api/platform/parse` | ⭐⭐ |
| `parseBilibili` | 薄包装 | `/api/platform/parse` | ⭐⭐⭐⭐ |
| `parseWeibo` | 薄包装 | `/api/platform/parse` | ⭐⭐ |
| `ocrImage` | 未实现 | — | ❌ |
| `processImage` | 元数据 | HEAD 请求 | ⭐ |

### 7.2 相关文件索引

| 文件 | 说明 |
|---|---|
| `server/routes/platform-parser.ts` | Backend 统一解析器(核心) |
| `server/routes/proxy.ts` | `/api/proxy/fetch` 代理路由 |
| `src/theme/tools/platform/executors.ts` | 前端工具执行器 |
| `src/theme/tools/platform/definitions.ts` | 工具定义(LLM 可见) |
| `src/theme/tools/platform/index.ts` | 工具导出 |
| `src/theme/tools/index.ts` | 工具注册中心 |
