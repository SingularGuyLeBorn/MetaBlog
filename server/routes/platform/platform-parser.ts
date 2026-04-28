import type { ViteDevServer } from "vite";
import type { RouteContext, ParseResult } from "./types";
import { fetchContent } from "./fetcher";
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

function detectPlatform(hostname: string): string {
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

export function registerPlatformParserRoutes(server: ViteDevServer, _ctx: RouteContext) {
  server.middlewares.use("/api/platform/parse", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      const body = await readBody(req);
      const { url, timeout = 30000, options } = body;

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

      // 1. 获取层：根据平台选择专用/通用获取链路，拿到原始 HTML
      const fetched = await fetchContent(url, timeout);

      // 2. 解析层：统一解析器，不区分平台（平台差异通过配置体现）
      const platform = detectPlatform(targetUrl.hostname);
      const result: ParseResult = await parseHtmlToMarkdown(
        fetched.html,
        url,
        platform,
        { fetcher: fetched.fetcher, method: fetched.method },
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
