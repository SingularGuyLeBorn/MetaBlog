/**
 * ============================================================================
 * 平台解析路由 - fetcher
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes/platform
 */


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
// Playwright 渲染器(复用)
// ============================================

/**
 * 获取WithPlaywright数据
 *
 * @param url - 参数(string)
 * @param opts - 参数({ isZhihu?: boolean; timeout?: number } = {})
 * @returns 返回值(Promise<string>)
 */
export async function fetchWithPlaywright(url: string, opts: { isZhihu?: boolean; timeout?: number } = {}): Promise<string> {
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

/** 知乎：必须用 Playwright + stealth,反爬极强 */
class ZhihuFetcher implements ContentFetcher {
  name = "zhihu";
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchWithPlaywright(url, { isZhihu: true, timeout });
  }
}

/** 微信：反爬强,Playwright 模拟浏览器 */
class WechatFetcher implements ContentFetcher {
  name = "wechat";
  async fetch(url: string, timeout?: number): Promise<string> {
    // 先尝试 HTTP(快),失败再用 Playwright(稳)
    try {
      const html = await fetchHtml(url, undefined, timeout);
      // 快速校验：如果 HTML 中没有正文特征,说明可能触发了反爬
      if (html.includes("id=\"js_content\"") && html.includes("rich_media")) {
        return html;
      }
      // 有 js_content 但内容明显是验证码/提示页,也走 Playwright
      if (html.includes("环境异常") || html.includes("完成验证")) {
        throw new Error("wechat anti-bot detected");
      }
      return html;
    } catch {
      console.warn(`[WechatFetcher] HTTP fetch failed or anti-bot detected for ${url}, falling back to Playwright...`);
      return fetchWithPlaywright(url, { timeout });
    }
  }
}

/** 小红书：反爬强,需要 Playwright */
class XiaohongshuFetcher implements ContentFetcher {
  name = "xiaohongshu";
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchWithPlaywright(url, { timeout });
  }
}

/** 抖音：反爬强,需要 Playwright */
class DouyinFetcher implements ContentFetcher {
  name = "douyin";
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchWithPlaywright(url, { timeout });
  }
}

/** B站：服务端渲染,普通 HTTP 即可 */
class BilibiliFetcher implements ContentFetcher {
  name = "bilibili";
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchHtml(url, undefined, timeout);
  }
}

/** 微博：服务端渲染,普通 HTTP 即可 */
class WeiboFetcher implements ContentFetcher {
  name = "weibo";
  async fetch(url: string, timeout?: number): Promise<string> {
    return fetchHtml(url, undefined, timeout);
  }
}

// ============================================
// 通用获取链路：HTTP → Jina → Playwright
// ============================================

class GenericFetcher implements ContentFetcher {
  name = "generic";

  async fetch(url: string, timeout?: number): Promise<string> {
    const effectiveTimeout = timeout ?? 10000;
    // L1: HTTP fetch(最快)
    try {
      const html = await fetchHtml(url, undefined, effectiveTimeout);
      return html;
    } catch {
      // continue
    }

    // L2: Jina Reader(云端渲染)
    try {
      const jinaUrl = `https://r.jina.ai/http://${url}`;
      const res = await fetchWithTimeout(jinaUrl, effectiveTimeout);
      if (res.ok) {
        const md = await res.text();
        return `<html><body><pre>${md}</pre></body></html>`;
      }
    } catch {
      // continue
    }

    // L3: Playwright 兜底(本地浏览器)
    return fetchWithPlaywright(url, { timeout });
  }
}

// ============================================
// 获取器注册表(按 platform 映射)
// ============================================

const FETCHER_MAP: Record<string, ContentFetcher> = {
  zhihu: new ZhihuFetcher(),
  wechat: new WechatFetcher(),
  xiaohongshu: new XiaohongshuFetcher(),
  douyin: new DouyinFetcher(),
  bilibili: new BilibiliFetcher(),
  weibo: new WeiboFetcher(),
};

/** 根据 URL 解析 hostname */
/**
 * detectPlatform 函数
 *
 * @param hostname - 参数(string)
 * @returns 返回值(string)
 */
export function detectPlatform(hostname: string): string {
  if (hostname.includes("zhihu.com")) return "zhihu";
  if (hostname.includes("mp.weixin.qq.com")) return "wechat";
  if (hostname.includes("xiaohongshu.com") || hostname.includes("xhslink.com")) return "xiaohongshu";
  if (hostname.includes("douyin.com") || hostname.includes("iesdouyin.com")) return "douyin";
  if (hostname.includes("bilibili.com") || hostname.includes("b23.tv")) return "bilibili";
  if (hostname.includes("weibo.com") || hostname.includes("weibo.cn")) return "weibo";
  if (hostname.includes("juejin.cn")) return "juejin";
  if (hostname.includes("csdn.net")) return "csdn";
  if (hostname.includes("cnblogs.com")) return "cnblogs";
  if (hostname.includes("jianshu.com")) return "jianshu";
  if (hostname.includes("infoq.cn")) return "infoq";
  if (hostname.includes("segmentfault.com")) return "segmentfault";
  if (hostname.includes("oschina.net")) return "oschina";
  return "unknown";
}

/** 根据 platform 标识获取原始 HTML */
export async function fetchContent(
  url: string,
  platform: string,
  timeout?: number
): Promise<FetchedContent> {
  const fetcher = FETCHER_MAP[platform];

  if (fetcher) {
    try {
      const html = await fetcher.fetch(url, timeout);
      return {
        html,
        fetcher: fetcher.name,
        method: fetcher.name,
      };
    } catch (err: any) {
      console.warn(`[Fetcher] ${fetcher.name} failed for ${url}: ${err.message}. Falling back to generic...`);
    }
  }

  // 兜底：通用获取器
  const generic = new GenericFetcher();
  const html = await generic.fetch(url, timeout);
  return {
    html,
    fetcher: generic.name,
    method: generic.name,
  };
}
