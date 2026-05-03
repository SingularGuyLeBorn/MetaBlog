/**
 * 知乎解析独立测试脚本
 * 用法: npx tsx scripts/test-zhihu-parser.ts <知乎链接>
 * 示例: npx tsx scripts/test-zhihu-parser.ts https://zhuanlan.zhihu.com/p/2025170632002794815
 */

import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_URL = process.argv[2] || "https://zhuanlan.zhihu.com/p/2025170632002794815";
const OUTPUT_DIR = path.join(__dirname, "..", "project", "experiments", "link-parsers", "test-output");

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function extractMeta(html: string, name: string): string {
  const re = new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

// 六层知乎解析(从 platform-parser.ts 提取)
function parseZhihu(url: string, html: string) {
  let title = extractMeta(html, "og:title") || "";
  let author = extractMeta(html, "og:article:author") || "";
  let content = "";
  let images: string[] = [];
  let method = "regex-extract";
  const layers: { layer: string; hit: boolean; contentPreview: string }[] = [];

  // L1: js-initialData
  const initialMatch = html.match(/<script id="js-initialData" type="text\/json">([\s\S]*?)<\/script>/);
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
          method = "js-initialData";
        }
      }
    } catch (e) {
      // ignore
    }
  }
  layers.push({
    layer: "L1: js-initialData",
    hit: !!content,
    contentPreview: content ? content.slice(0, 200) : "未命中",
  });

  // L2: window._INITIAL_STATE_
  if (!content) {
    const stateMatch = html.match(/window\._INITIAL_STATE_\s*=\s*({.+?});\s*<\/script>/s);
    if (stateMatch) {
      try {
        const data = JSON.parse(stateMatch[1]);
        const article = Object.values(data?.entities?.articles || {})[0] as any;
        if (article) {
          title = title || article.title || "";
          author = author || article.author?.name || "";
          content = (article.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          method = "window._INITIAL_STATE_";
        }
      } catch {
        // ignore
      }
    }
  }
  layers.push({
    layer: "L2: window._INITIAL_STATE_",
    hit: !!content,
    contentPreview: content ? content.slice(0, 200) : "未命中",
  });

  // L3: Post-RichTextContainer
  if (!content) {
    const columnMatch = html.match(/<div[^>]*class="[^"]*Post-RichTextContainer[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*ContentItem-actions|<\/div>\s*<\/div>)/);
    if (columnMatch) {
      content = columnMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      method = "Post-RichTextContainer-regex";
    }
  }
  layers.push({
    layer: "L3: Post-RichTextContainer",
    hit: !!content,
    contentPreview: content ? content.slice(0, 200) : "未命中",
  });

  // L4: RichContent-inner
  if (!content) {
    const answerMatch = html.match(/<div[^>]*class="[^"]*RichContent-inner[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*class="[^"]*ContentItem-actions|<\/div>\s*<\/div>)/);
    if (answerMatch) {
      content = answerMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      method = "RichContent-inner-regex";
    }
  }
  layers.push({
    layer: "L4: RichContent-inner",
    hit: !!content,
    contentPreview: content ? content.slice(0, 200) : "未命中",
  });

  // L5: h1 Post-Title / UserLink-link
  if (!title) {
    const h1Match = html.match(/<h1[^>]*class="[^"]*Post-Title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
    if (h1Match) {
      title = h1Match[1].replace(/<[^>]+>/g, "").trim();
    }
  }
  if (!author) {
    const authorMatch = html.match(/<a[^>]*class="[^"]*UserLink-link[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (authorMatch) {
      author = authorMatch[1].replace(/<[^>]+>/g, "").trim();
    }
  }
  layers.push({
    layer: "L5: h1/UserLink 标题作者",
    hit: !!(title || author),
    contentPreview: `title=${title.slice(0, 50)}, author=${author.slice(0, 50)}`,
  });

  // L6: OG
  if (!title) title = extractMeta(html, "og:title") || "知乎内容";
  if (!content) {
    content = extractMeta(html, "og:description") || "";
    method = "og-extract";
  }
  layers.push({
    layer: "L6: OG 兜底",
    hit: !!(title || content),
    contentPreview: content ? content.slice(0, 200) : "未命中",
  });

  return {
    title: title || "知乎内容",
    author: author || "未知作者",
    content: content.slice(0, 20000),
    images: images.slice(0, 10),
    method,
    platform: "zhihu",
    url,
    layers,
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("知乎解析独立测试脚本");
  console.log("=".repeat(60));
  console.log(`测试链接: ${TEST_URL}`);
  console.log("");

  console.log("[1/4] 启动 Playwright Chromium...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  console.log("[2/4] 访问页面并等待加载...");
  try {
    await page.goto(TEST_URL, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e: any) {
    console.log(`   ⚠️  networkidle 超时,但页面可能已加载: ${e.message}`);
  }

  // 等待正文容器
  console.log("[3/4] 等待正文容器...");
  try {
    await page.waitForSelector(".Post-RichTextContainer, .RichContent-inner", { timeout: 10000 });
    console.log("   ✅ 正文容器已出现");
  } catch {
    console.log("   ⚠️  未找到 .Post-RichTextContainer 或 .RichContent-inner(可能页面结构不同)");
  }

  // 等懒加载
  await page.waitForTimeout(800);

  console.log("[4/4] 获取页面 HTML...");
  const html = await page.content();
  await browser.close();

  // 保存原始 HTML(方便调试)
  const htmlFile = path.join(OUTPUT_DIR, `zhihu-${Date.now()}.html`);
  fs.writeFileSync(htmlFile, html, "utf-8");
  console.log(`   ✅ HTML 已保存: ${htmlFile} (${(html.length / 1024).toFixed(1)} KB)`);
  console.log("");

  // 六层解析测试
  console.log("=".repeat(60));
  console.log("六层解析测试结果");
  console.log("=".repeat(60));

  const result = parseZhihu(TEST_URL, html);

  for (const layer of result.layers) {
    const icon = layer.hit ? "✅" : "❌";
    console.log(`\n${icon} ${layer.layer}`);
    console.log(`   预览: ${layer.contentPreview}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("最终结果");
  console.log("=".repeat(60));
  console.log(`标题: ${result.title}`);
  console.log(`作者: ${result.author}`);
  console.log(`命中方法: ${result.method}`);
  console.log(`内容长度: ${result.content.length} 字符`);
  console.log(`图片数: ${result.images.length}`);
  console.log("");
  console.log("--- 内容前 500 字符 ---");
  console.log(result.content.slice(0, 500));
  console.log("----------------------");

  // 同时保存解析结果
  const resultFile = path.join(OUTPUT_DIR, `zhihu-result-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify({
    url: TEST_URL,
    htmlSize: html.length,
    htmlFile,
    result,
  }, null, 2), "utf-8");
  console.log(`\n✅ 完整结果已保存: ${resultFile}`);
}

main().catch((err) => {
  console.error("测试失败:", err);
  process.exit(1);
});
