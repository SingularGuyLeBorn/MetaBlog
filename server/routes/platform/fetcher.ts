import type { ContentFetcher, FetchedContent } from "./types";

// ============================================
// 基础工具
// ============================================

async function fetchWithTimeout(url: string, timeoutMs = 15000, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url: string, headers?: Record<string, string>, timeoutMs?: number): Promise<string> {
  const effectiveTimeout = timeoutMs ?? 15000;
  const res = await fetchWithTimeout(url, effectiveTimeout, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      ...headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.text();
}

// ============================================
// Playwright 渲染器（复用）
// ============================================

async function fetchWithPlaywright(url: string, opts: { isZhihu?: boolean; timeout?: number } = {}): Promise<string> {
  const { chromium } = await import("playwright");
  const fs = await import("fs");

  const hasSystemChrome = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].some((p) => fs.existsSync(p));

  const isZhihu = opts.isZhihu ?? false;

  const browser = await chromium.launch({
    headless: isZhihu ? false : true,
    channel: hasSystemChrome ? "chrome" : undefined,
    args: isZhihu ? ["--disable-blink-features=AutomationControlled"] : [],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: isZhihu ? "zh-CN" : undefined,
    timezoneId: isZhihu ? "Asia/Shanghai" : undefined,
  });

  if (isZhihu) {
    await context.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    `);
  }

  const page = await context.newPage();
  await page.goto(url, {
    waitUntil: isZhihu ? "domcontentloaded" : "networkidle",
    timeout: opts.timeout ?? 30000,
  });

  if (isZhihu) {
    try {
      await page.waitForSelector(".Post-RichTextContainer, .RichContent-inner", { timeout: 15000 });
    } catch { /* ignore */ }
    await page.waitForTimeout(3000);
  } else {
    await page.waitForTimeout(500);
  }

  const html = await page.content();
  await browser.close();
  return html;
}

// ============================================
// 平台专用获取器
// ============================================

/** 知乎：必须用 Playwright + stealth，反爬极强 */
class ZhihuFetcher implements ContentFetcher {
  name = "zhihu";
  canHandle(_url: string, hostname: string) {
    return hostname.includes("zhihu.com");
  }
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchWithPlaywright(url, { isZhihu: true, timeout });
  }
}

/** 微信：服务端渲染，普通 HTTP 即可 */
class WechatFetcher implements ContentFetcher {
  name = "wechat";
  canHandle(_url: string, hostname: string) {
    return hostname.includes("mp.weixin.qq.com");
  }
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchHtml(url, undefined, timeout);
  }
}

/** 小红书：反爬强，需要 Playwright */
class XiaohongshuFetcher implements ContentFetcher {
  name = "xiaohongshu";
  canHandle(_url: string, hostname: string) {
    return hostname.includes("xiaohongshu.com") || hostname.includes("xhslink.com");
  }
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchWithPlaywright(url, { timeout });
  }
}

/** 抖音：反爬强，需要 Playwright */
class DouyinFetcher implements ContentFetcher {
  name = "douyin";
  canHandle(_url: string, hostname: string) {
    return hostname.includes("douyin.com") || hostname.includes("iesdouyin.com");
  }
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchWithPlaywright(url, { timeout });
  }
}

// ============================================
// 通用获取链路：HTTP → Jina → Playwright
// ============================================

class GenericFetcher implements ContentFetcher {
  name = "generic";
  canHandle() {
    return true; // 兜底，最后匹配
  }

  async fetch(url: string, timeout?: number): Promise<string> {
    const effectiveTimeout = timeout ?? 10000;
    // L1: HTTP fetch（最快）
    try {
      const html = await fetchHtml(url, undefined, effectiveTimeout);
      return html;
    } catch {
      // continue
    }

    // L2: Jina Reader（云端渲染）
    try {
      const jinaUrl = `https://r.jina.ai/http://${url}`;
      const res = await fetchWithTimeout(jinaUrl, effectiveTimeout);
      if (res.ok) {
        // Jina 返回的是 Markdown，但这里我们需要 HTML
        // 为了兼容，我们把 Jina 的 Markdown 包装成简单 HTML
        const md = await res.text();
        return `<html><body><pre>${md}</pre></body></html>`;
      }
    } catch {
      // continue
    }

    // L3: Playwright 兜底（本地浏览器）
    return fetchWithPlaywright(url, { timeout });
  }
}

// ============================================
// 获取器注册表
// ============================================

const FETCHERS: ContentFetcher[] = [
  new ZhihuFetcher(),
  new WechatFetcher(),
  new XiaohongshuFetcher(),
  new DouyinFetcher(),
  new GenericFetcher(), // 必须放最后，作为兜底
];

/** 根据 URL 选择合适的获取器，获取原始 HTML */
export async function fetchContent(url: string, timeout?: number): Promise<FetchedContent> {
  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  const hostname = targetUrl.hostname;

  // 按注册顺序匹配第一个能处理的获取器
  for (const fetcher of FETCHERS) {
    if (fetcher.canHandle(url, hostname)) {
      try {
        const html = await fetcher.fetch(url, timeout);
        return {
          html,
          fetcher: fetcher.name,
          method: fetcher.name === "generic" ? "http-jina-playwright" : fetcher.name,
        };
      } catch (err: any) {
        // 专用获取器失败，继续尝试下一个（主要是 generic fallback）
        if (fetcher.name !== "generic") {
          console.warn(`[Fetcher] ${fetcher.name} failed for ${url}: ${err.message}. Falling back...`);
          continue;
        }
        throw err;
      }
    }
  }

  throw new Error("No fetcher available for this URL");
}
