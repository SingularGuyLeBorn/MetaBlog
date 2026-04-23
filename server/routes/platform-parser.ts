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

async function fetchHtml(url: string, headers?: Record<string, string>): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
async function parseXiaohongshu(url: string, html: string): Promise<ParseResult> {
  const title = extractMeta(html, "og:title") || "小红书笔记";
  const desc = extractMeta(html, "og:description") || "";
  const ogImage = extractMeta(html, "og:image");

  return {
    title,
    author: "未知用户",
    content: desc.slice(0, 5000),
    images: ogImage ? [ogImage] : [],
    videos: [],
    comments: [],
    metadata: { source: "xiaohongshu", note: "小红书有反爬机制，完整内容可能需要 Playwright 渲染" },
    method: "og-extract",
    platform: "xiaohongshu",
    url,
  };
}

// ---------- 抖音 ----------
async function parseDouyin(url: string, html: string): Promise<ParseResult> {
  const title = extractMeta(html, "og:title") || "抖音视频";
  const desc = extractMeta(html, "og:description") || "";
  const ogImage = extractMeta(html, "og:image");
  let videos: string[] = [];

  const videoMatch = html.match(/<video[^>]*src="([^"]*)"/);
  if (videoMatch) videos.push(videoMatch[1]);

  return {
    title,
    author: "未知用户",
    content: desc.slice(0, 3000),
    images: ogImage ? [ogImage] : [],
    videos: videos.slice(0, 5),
    comments: [],
    metadata: { source: "douyin", note: "抖音有反爬机制，完整内容可能需要 Playwright 渲染" },
    method: "og-extract",
    platform: "douyin",
    url,
  };
}

// ---------- 通用网页 ----------
async function parseGeneric(url: string, html: string): Promise<ParseResult> {
  const title = extractMeta(html, "og:title") || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "未知标题";
  const desc = extractMeta(html, "og:description") || extractMeta(html, "description") || "";
  const ogImage = extractMeta(html, "og:image");

  let content = cleanHtml(html).slice(0, 5000);

  return {
    title,
    author: "",
    content,
    images: ogImage ? [ogImage] : [],
    videos: [],
    comments: [],
    metadata: { source: "generic" },
    method: "generic-og-extract",
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
      const { url, usePlaywright = false } = body;

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
      let html = "";

      // Playwright 兜底（如果启用且平台需要）
      if (usePlaywright && (hostname.includes("xiaohongshu") || hostname.includes("douyin"))) {
        try {
          // 动态导入 playwright，避免未安装时崩溃
          const { chromium } = await import("playwright");
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
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
        result = await parseXiaohongshu(url, html);
      } else if (hostname.includes("douyin.com") || hostname.includes("iesdouyin.com")) {
        result = await parseDouyin(url, html);
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
