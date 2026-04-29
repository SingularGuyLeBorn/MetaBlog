import type { ViteDevServer } from "vite";
import type { RouteContext, ParseResult } from "./types";
import { fetchContent, detectPlatform, fetchWithPlaywright } from "./fetcher";
import { parseHtmlToMarkdown } from "./parser";

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

const VALID_PLATFORMS = new Set([
  "zhihu", "wechat", "xiaohongshu", "douyin", "bilibili", "weibo",
  "juejin", "csdn", "cnblogs", "jianshu", "infoq", "segmentfault", "oschina", "unknown",
]);

export function registerPlatformParserRoutes(server: ViteDevServer, _ctx: RouteContext) {
  server.middlewares.use("/api/platform/parse", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      const body = await readBody(req);
      const { url, timeout = 30000, options, platform: aiPlatform } = body;

      if (!url) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "url is required" }));
        return;
      }

      let targetUrl: URL;
      try {
        targetUrl = new URL(url);
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "Invalid URL" }));
        return;
      }

      // 平台判断：优先用 AI 传入的，否则根据 URL hostname 自动判断
      let platform: string;
      if (aiPlatform && VALID_PLATFORMS.has(aiPlatform)) {
        platform = aiPlatform;
      } else {
        platform = detectPlatform(targetUrl.hostname);
      }

      // 1. 获取层：根据平台选择专用/通用获取链路，拿到原始 HTML
      let html: string;
      let fetcherName: string;
      let methodName: string;

      if (body.method === "playwright") {
        console.log(`[PlatformParser] Force Playwright render for ${url}`);
        html = await fetchWithPlaywright(url, { timeout });
        fetcherName = "playwright";
        methodName = "playwright";
      } else {
        const fetched = await fetchContent(url, platform, timeout);
        html = fetched.html;
        fetcherName = fetched.fetcher;
        methodName = fetched.method;
      }

      // 2. 解析层：统一解析器，不区分平台（平台差异通过配置体现）
      const result: ParseResult = await parseHtmlToMarkdown(
        html,
        url,
        platform,
        { fetcher: fetcherName, method: methodName },
        options
      );

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
