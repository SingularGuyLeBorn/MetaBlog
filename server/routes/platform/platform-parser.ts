import type { ViteDevServer } from "vite";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

// ============================================
// 平台万能解析器
// ============================================

interface ParseResult {
  title: string;
  author: string;
  content: string;
  images: string[];
  videos: string[];
  comments: any[];
  metadata: Record<string, any>;
  method: string;
  platform: string;
  url: string;
}

async function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function fetchWithTimeout(url: string, timeoutMs = 15000, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url: string, headers?: Record<string, string>, timeoutMs = 15000): Promise<string> {
  const res = await fetchWithTimeout(url, timeoutMs, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...headers,
    },
  });
  if (!res.ok) {
    const msg = res.status === 404
      ? "页面不存在"
      : res.status === 403
        ? "页面访问被拒绝（可能是反爬虫）"
        : res.status === 429
          ? "请求过于频繁"
          : res.status === 500
            ? "目标服务器内部错误"
            : `HTTP ${res.status} 错误`;
    throw new Error(`网页抓取失败 (${res.status}): ${msg}。建议: 检查 URL 是否正确，或尝试使用 /api/proxy/fetch 获取内容`)
  }
  return res.text();
}

function extractMeta(html: string, name: string): string {
  const re = new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- 知乎 ----------
async function parseZhihu(url: string, html: string): Promise<ParseResult> {
  // 尝试提取内嵌 JSON
  const initialMatch = html.match(/<script id="js-initialData" type="text\/json">([\s\S]*?)<\/script>/);
  let title = extractMeta(html, "og:title") || "";
  let author = extractMeta(html, "og:article:author") || "";
  let content = "";
  let images: string[] = [];

  if (initialMatch) {
    try {
      const data = JSON.parse(initialMatch[1]);
      const entities = data?.initialState?.entities;
      if (entities) {
        const articles = entities.articles || {};
        const answers = entities.answers || {};
        const item = Object.values(articles)[0] as any || Object.values(answers)[0] as any;
        if (item) {
          title = title || item.title || "";
          author = author || item.author?.name || "";
          content = (item.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          images = (item.content || "").match(/<img[^>]*src="([^"]+)"/g)?.map((s: string) => {
            const m = s.match(/src="([^"]+)"/);
            return m ? m[1] : "";
          }).filter(Boolean) || [];
        }
      }
    } catch {
      // 忽略解析错误
    }
  }

  if (!content) {
    const contentMatch = html.match(/<div[^>]*class="[^"]*Post-RichTextContainer[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
    if (contentMatch) {
      content = contentMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  return {
    title: title || "知乎内容",
    author: author || "未知作者",
    content: content.slice(0, 8000),
    images: images.slice(0, 10),
    videos: [],
    comments: [],
    metadata: { source: "zhihu" },
    method: "html-json-extract",
    platform: "zhihu",
    url,
  };
}

// ---------- 微信公众号 ----------
async function parseWechat(url: string, html: string): Promise<ParseResult> {
  const titleMatch = html.match(/<h1[^>]*class="rich_media_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : extractMeta(html, "og:title") || "公众号文章";

  const authorMatch = html.match(/<a[^>]*id="js_name"[^>]*>([\s\S]*?)<\/a>/);
  const author = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, "").trim() : extractMeta(html, "og:article:author") || "未知公众号";

  const contentMatch = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  let content = "";
  if (contentMatch) {
    content = contentMatch[1]
      .replace(/<img[^>]*data-src="([^"]*)"[^>]*>/g, "[图片: $1]")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const imgMatches = html.matchAll(/<img[^>]*data-src="([^"]*)"/g);
  const images = Array.from(imgMatches).map((m) => m[1]).filter(Boolean).slice(0, 10);

  return {
    title,
    author,
    content: content.slice(0, 8000),
    images,
    videos: [],
    comments: [],
    metadata: { source: "wechat" },
    method: "regex-extract",
    platform: "wechat",
    url,
  };
}

// ---------- B站 ----------
async function parseBilibili(url: string, html: string): Promise<ParseResult> {
  let title = extractMeta(html, "og:title") || "";
  let author = extractMeta(html, "og:author") || "";
  let content = "";
  let images: string[] = [];

  const initialMatch = html.match(/<script>window\.__INITIAL_STATE__=([\s\S]*?);\(function\(\)/);
  if (initialMatch) {
    try {
      const data = JSON.parse(initialMatch[1]);
      const videoData = data?.videoData || data?.epInfo;
      if (videoData) {
        title = title || videoData.title || "";
        author = author || videoData.owner?.name || videoData.up?.name || "";
        content = (videoData.desc || "").replace(/\n/g, " ").trim();
        const pic = videoData.pic || videoData.cover;
        if (pic) images.push(pic);
      }
    } catch {
      // 忽略
    }
  }

  const ogImage = extractMeta(html, "og:image");
  if (ogImage && !images.includes(ogImage)) images.push(ogImage);

  return {
    title: title || "B站视频",
    author: author || "未知UP主",
    content: content.slice(0, 5000),
    images: images.slice(0, 10),
    videos: [],
    comments: [],
    metadata: { source: "bilibili" },
    method: "__INITIAL_STATE__-extract",
    platform: "bilibili",
    url,
  };
}

// ---------- 微博 ----------
async function parseWeibo(url: string, html: string): Promise<ParseResult> {
  const title = extractMeta(html, "og:title") || "微博内容";
  const author = extractMeta(html, "og:author") || extractMeta(html, "wb:webmaster") || "未知用户";
  const desc = extractMeta(html, "og:description") || "";

  const ogImage = extractMeta(html, "og:image");
  const images = ogImage ? [ogImage] : [];

  return {
    title,
    author,
    content: desc.slice(0, 5000),
    images,
    videos: [],
    comments: [],
    metadata: { source: "weibo" },
    method: "og-extract",
    platform: "weibo",
    url,
  };
}

// ---------- 小红书 ----------
async function parseXiaohongshu(url: string, html: string, renderedByPlaywright = false): Promise<ParseResult> {
  let title = extractMeta(html, "og:title") || "";
  let author = "未知用户";
  let content = "";
  let images: string[] = [];

  // 1. 尝试从渲染后的 DOM 提取标题（h1 优先级最高）
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, "").trim() || title;
  }
  if (!title) {
    const titleMatch = html.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
  }

  // 2. 尝试提取正文（多层 fallback）
  // 小红书渲染后的正文通常在 detail-desc 或 desc 相关节点中
  const descPatterns = [
    /<div[^>]*id="detail-desc"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  ];
  for (const re of descPatterns) {
    const m = html.match(re);
    if (m) {
      content = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (content.length > 20) break; // 过滤掉太短的误匹配
    }
  }

  // 3. 尝试提取作者
  const authorPatterns = [
    /<a[^>]*class="[^"]*author[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    /<div[^>]*class="[^"]*nickname[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*class="[^"]*nickname[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  ];
  for (const re of authorPatterns) {
    const m = html.match(re);
    if (m) {
      author = m[1].replace(/<[^>]+>/g, "").trim();
      if (author) break;
    }
  }

  // 4. 提取图片（渲染后图片通常已加载到 src）
  const imgMatches = html.matchAll(/<img[^>]*src="(https?:\/\/[^"]+)"/g);
  images = Array.from(imgMatches)
    .map((m) => m[1])
    .filter((src) => !src.includes("avatar") && !src.includes("icon") && src.length > 10)
    .slice(0, 20);

  // 5. 如果 DOM 提取不足，用 OG 兜底
  if (!content) {
    content = extractMeta(html, "og:description") || "";
  }
  if (!title) {
    title = "小红书笔记";
  }
  const ogImage = extractMeta(html, "og:image");
  if (ogImage && !images.includes(ogImage)) {
    images.unshift(ogImage);
  }

  return {
    title,
    author,
    content: content.slice(0, 8000),
    images: images.slice(0, 20),
    videos: [],
    comments: [],
    metadata: { source: "xiaohongshu", method: renderedByPlaywright ? "playwright-render" : "og-extract" },
    method: renderedByPlaywright ? "playwright-render" : "og-extract",
    platform: "xiaohongshu",
    url,
  };
}

// ---------- 抖音 ----------
async function parseDouyin(url: string, html: string, renderedByPlaywright = false): Promise<ParseResult> {
  let title = extractMeta(html, "og:title") || "";
  let author = "未知用户";
  let content = "";
  const ogImage = extractMeta(html, "og:image");
  let videos: string[] = [];
  let images: string[] = ogImage ? [ogImage] : [];

  // 1. 尝试从渲染后的 DOM 提取标题
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, "").trim() || title;
  }
  if (!title) {
    const titleMatch = html.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (titleMatch) title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
  }

  // 2. 尝试提取作者
  const authorPatterns = [
    /<a[^>]*class="[^"]*author[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    /<div[^>]*class="[^"]*nickname[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*class="[^"]*nickname[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  ];
  for (const re of authorPatterns) {
    const m = html.match(re);
    if (m) {
      author = m[1].replace(/<[^>]+>/g, "").trim();
      if (author) break;
    }
  }

  // 3. 尝试提取描述/正文
  const descPatterns = [
    /<div[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<span[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  ];
  for (const re of descPatterns) {
    const m = html.match(re);
    if (m) {
      content = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (content.length > 10) break;
    }
  }
  if (!content) {
    content = extractMeta(html, "og:description") || "";
  }

  // 4. 提取视频地址
  const videoMatches = html.matchAll(/<video[^>]*src="([^"]+)"/g);
  videos = Array.from(videoMatches).map((m) => m[1]).filter(Boolean).slice(0, 5);

  // 5. 提取封面图
  const imgMatches = html.matchAll(/<img[^>]*src="(https?:\/\/[^"]+)"/g);
  const extraImages = Array.from(imgMatches)
    .map((m) => m[1])
    .filter((src) => !src.includes("avatar") && !src.includes("icon") && src.length > 10)
    .slice(0, 10);
  for (const img of extraImages) {
    if (!images.includes(img)) images.push(img);
  }

  if (!title) title = "抖音视频";

  return {
    title,
    author,
    content: content.slice(0, 5000),
    images: images.slice(0, 10),
    videos: videos.slice(0, 5),
    comments: [],
    metadata: { source: "douyin", method: renderedByPlaywright ? "playwright-render" : "og-extract" },
    method: renderedByPlaywright ? "playwright-render" : "og-extract",
    platform: "douyin",
    url,
  };
}

// ---------- 通用网页 ----------
async function parseGeneric(url: string, html: string): Promise<ParseResult> {
  let title = "";
  let content = "";
  let method = "";
  let images: string[] = [];

  // L1: Jina Reader（零 Key 云端 API，最快）
  // 官方格式：https://r.jina.ai/http://example.com（保留原始协议）
  try {
    const jinaUrl = `https://r.jina.ai/http://${url}`;
    const jinaRes = await fetchWithTimeout(jinaUrl, 8000);
    if (jinaRes.ok) {
      const jinaText = await jinaRes.text();
      const lines = jinaText.split("\n");
      // Jina 返回 Markdown。如果第一行是 # 标题则提取，否则整段作为正文
      const firstLine = lines[0]?.trim() || "";
      if (firstLine.startsWith("# ")) {
        title = firstLine.replace(/^#\s+/, "").trim();
        content = lines.slice(1).join("\n").trim();
      } else if (firstLine.startsWith("## ") || firstLine.startsWith("### ")) {
        title = firstLine.replace(/^#+\s+/, "").trim();
        content = jinaText.trim();
      } else {
        content = jinaText.trim();
      }
      method = "jina-reader";
    }
  } catch {
    // Jina 失败，继续下一层
  }

  // L2: Readability.js（本地最强去噪，需要 jsdom）
  if (!content) {
    try {
      const { JSDOM } = await import("jsdom");
      const { Readability } = await import("@mozilla/readability");
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article) {
        title = title || article.title || "";
        // Readability 返回的是 HTML，转成纯文本
        const textDom = new JSDOM(article.content || "");
        content = textDom.window.document.body.textContent || "";
        method = "readability-js";
        // 从 Readability 提取的正文中提取图片（比原始 HTML 更干净）
        const articleImgMatches = (article.content || "").matchAll(/<img[^>]*src="(https?:\/\/[^"]+)"/g);
        images = Array.from(articleImgMatches).map((m) => m[1]).filter(Boolean).slice(0, 10);
      }
    } catch {
      // Readability 失败，继续兜底
    }
  }

  // L3: OG + cleanHtml 兜底
  if (!title) {
    title = extractMeta(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "未知标题";
  }
  if (!content) {
    content = extractMeta(html, "og:description") || "";
    method = method || "generic-og-extract";
  }
  if (!method) method = "generic-og-extract";

  const ogImage = extractMeta(html, "og:image");
  if (ogImage && !images.includes(ogImage)) images.unshift(ogImage);

  // 如果前面都没提取到正文，用 cleanHtml 兜底
  // 注意：content 可能是空字符串（falsy），要用长度判断
  const finalContent = (content && content.trim().length > 0) ? content : cleanHtml(html);

  return {
    title,
    author: "",
    content: finalContent.slice(0, 8000),
    images: images.slice(0, 10),
    videos: [],
    comments: [],
    metadata: { source: "generic", method },
    method,
    platform: "unknown",
    url,
  };
}

// ---------- 路由注册 ----------
export function registerPlatformParserRoutes(server: ViteDevServer, _ctx: RouteContext) {
  server.middlewares.use("/api/platform/parse", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      const body = await readBody(req);
      const { url, usePlaywright } = body;

      if (!url) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "url is required" }));
        return;
      }

      // 验证 URL
      let targetUrl: URL;
      try {
        targetUrl = new URL(url);
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Invalid URL" }));
        return;
      }

      const hostname = targetUrl.hostname;
      const isAntiCrawlPlatform = hostname.includes("xiaohongshu") || hostname.includes("douyin");
      // 对反爬平台默认启用 Playwright，但允许前端通过 usePlaywright: false 显式关闭
      const shouldUsePlaywright = usePlaywright !== false && isAntiCrawlPlatform;
      let html = "";

      // Playwright 渲染（反爬平台默认启用）
      if (shouldUsePlaywright) {
        try {
          // 动态导入 playwright，避免未安装时崩溃
          const { chromium } = await import("playwright");
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
          html = await page.content();
          await browser.close();
        } catch (pwErr: any) {
          console.warn("[PlatformParser] Playwright failed, fallback to fetch:", pwErr.message);
          html = await fetchHtml(url);
        }
      } else {
        html = await fetchHtml(url);
      }

      // 平台路由
      let result: ParseResult;
      if (hostname.includes("zhihu.com")) {
        result = await parseZhihu(url, html);
      } else if (hostname.includes("mp.weixin.qq.com")) {
        result = await parseWechat(url, html);
      } else if (hostname.includes("bilibili.com") || hostname.includes("b23.tv")) {
        result = await parseBilibili(url, html);
      } else if (hostname.includes("weibo.com") || hostname.includes("weibo.cn")) {
        result = await parseWeibo(url, html);
      } else if (hostname.includes("xiaohongshu.com") || hostname.includes("xhslink.com")) {
        result = await parseXiaohongshu(url, html, shouldUsePlaywright);
      } else if (hostname.includes("douyin.com") || hostname.includes("iesdouyin.com")) {
        result = await parseDouyin(url, html, shouldUsePlaywright);
      } else {
        result = await parseGeneric(url, html);
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (error: any) {
      console.error("[PlatformParser] Error:", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}
