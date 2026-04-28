import type { ParseResult, PlatformExtractConfig, ParseOptions } from "./types";
import { MAX_CONTENT_CHARS } from "./types";

// ============================================
// 基础工具
// ============================================

export function extractMeta(html: string, name: string): string {
  const re = new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

export function cleanHtml(html: string): string {
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

/** 从对象按路径取值，支持 * 通配符（取第一个匹配） */
function getByPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    if (part === "*") {
      if (Array.isArray(current)) {
        current = current[0];
      } else if (typeof current === "object") {
        const keys = Object.keys(current);
        current = keys.length > 0 ? current[keys[0]] : undefined;
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  return current;
}

/** 从 HTML 中提取图片 URL */
function extractImagesFromHtml(html: string, attributes: string[] = ["src"]): string[] {
  const attrPattern = attributes.join("|");
  const regex = new RegExp(`<img[^>]*(?:${attrPattern})="([^"]+)"`, "g");
  const matches = Array.from(html.matchAll(regex));
  return matches
    .map((m) => m[1])
    .filter((src) => src.startsWith("http") && !src.includes("avatar") && !src.includes("icon"))
    .slice(0, 20);
}

// ============================================
// HTML → Markdown（核心）
// ============================================

export function htmlToMarkdown(html: string): string {
  try {
    const TurndownService = require("turndown");
    const turndownService = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
    });

    // figure 处理
    turndownService.addRule("figure", {
      filter: ["figure"],
      replacement: (content: string, node: any) => {
        const img = node.querySelector("img");
        const caption = node.querySelector("figcaption");
        if (img) {
          const src = img.getAttribute("src") || img.getAttribute("data-actualsrc") || "";
          const capText = caption ? caption.textContent.trim() : "";
          return capText
            ? `\n\n![${capText}](${src})\n\n*${capText}*\n\n`
            : `\n\n![](${src})\n\n`;
        }
        return content;
      },
    });

    // noscript 懒加载图片
    turndownService.addRule("noscriptImg", {
      filter: ["noscript"],
      replacement: (content: string) => {
        const imgMatch = content.match(/<img[^>]*src="([^"]+)"/);
        if (imgMatch) {
          return `\n\n![](${imgMatch[1]})\n\n`;
        }
        return "";
      },
    });

    return turndownService.turndown(html).trim();
  } catch {
    return cleanHtml(html);
  }
}

// ============================================
// 平台预处理钩子（配置化，非独立解析器）
// ============================================

function preprocessZhihuHtml(html: string): string {
  // 知乎图片懒加载：data-actualsrc → src
  return html.replace(
    /<img([^>]*)data-actualsrc="([^"]+)"([^>]*)>/g,
    '<img$1src="$2"$3>'
  );
}

function preprocessWechatHtml(html: string): string {
  // 微信图片：data-src → src
  return html.replace(
    /<img([^>]*)data-src="([^"]+)"([^>]*)>/g,
    '<img$1src="$2"$3>'
  );
}

// ============================================
// 平台适配配置（不是"专用解析器"）
// ============================================

const PLATFORM_CONFIGS: Record<string, PlatformExtractConfig> = {
  zhihu: {
    jsonScriptPatterns: [
      // 专栏文章
      {
        selector: '#js-initialData',
        contentPath: 'initialState.entities.articles.*.content',
        titlePath: 'initialState.entities.articles.*.title',
        authorPath: 'initialState.entities.articles.*.author.name',
      },
      // 问题/回答页面
      {
        selector: '#js-initialData',
        contentPath: 'initialState.entities.answers.*.content',
        titlePath: 'initialState.entities.answers.*.question.title',
        authorPath: 'initialState.entities.answers.*.author.name',
      },
    ],
    inlineScriptPatterns: [
      // 专栏文章
      {
        regex: 'window\\._INITIAL_STATE_\\s*=\\s*({.+?});\\s*</script>',
        flags: 's',
        contentPath: 'entities.articles.*.content',
        titlePath: 'entities.articles.*.title',
        authorPath: 'entities.articles.*.author.name',
      },
      // 问题/回答页面
      {
        regex: 'window\\._INITIAL_STATE_\\s*=\\s*({.+?});\\s*</script>',
        flags: 's',
        contentPath: 'entities.answers.*.content',
        titlePath: 'entities.questions.*.title',
        authorPath: 'entities.answers.*.author.name',
      },
    ],
    contentSelectors: ['.Post-RichTextContainer', '.RichContent-inner'],
    titleSelectors: ['.Post-Title', '.QuestionHeader-title', 'h1'],
    authorSelectors: ['.AuthorInfo-name', 'a.UserLink-link'],
    imageAttributes: ['src', 'data-actualsrc'],
    preprocess: preprocessZhihuHtml,
  },
  wechat: {
    contentSelectors: ['#js_content'],
    titleSelectors: ['h1.rich_media_title'],
    authorSelectors: ['#js_name'],
    imageAttributes: ['src', 'data-src'],
    preprocess: preprocessWechatHtml,
  },
  xiaohongshu: {
    contentSelectors: ['#detail-desc', '.desc', 'span.desc'],
    titleSelectors: ['h1', '.title'],
    authorSelectors: ['.author', '.nickname'],
  },
  bilibili: {
    inlineScriptPatterns: [
      {
        regex: 'window\\.__INITIAL_STATE__=([\\s\\S]*?);\\(function\\(\\)',
        contentPath: 'videoData.desc',
        titlePath: 'videoData.title',
        authorPath: 'videoData.owner.name',
      },
    ],
    titleSelectors: ['h1'],
  },
  weibo: {},
  douyin: {
    contentSelectors: ['.desc'],
    titleSelectors: ['h1', '.title'],
    authorSelectors: ['.author', '.nickname'],
  },
  // ─── 技术文章平台 ───
  juejin: {
    contentSelectors: ['.markdown-body', '.article-content', '.main-area article'],
    titleSelectors: ['.article-title', 'h1'],
    authorSelectors: ['.author-info-box .username', '.username'],
    imageAttributes: ['src', 'data-src'],
  },
  csdn: {
    contentSelectors: ['#content_views', '.blog_container', '.article-content'],
    titleSelectors: ['#articleContentId', 'h1', '.title-article'],
    authorSelectors: ['.profile-intro-name', '.name', '.user-name'],
    imageAttributes: ['src', 'data-src'],
  },
  cnblogs: {
    contentSelectors: ['#cnblogs_post_body', '#post_detail', '.postBody'],
    titleSelectors: ['#cb_post_title_url', '#topics .postTitle', 'h1'],
    authorSelectors: ['.postDesc', '.author'],
    imageAttributes: ['src'],
  },
  jianshu: {
    contentSelectors: ['.show-content', '.article-content', 'article'],
    titleSelectors: ['h1.title', '.article-title', 'h1'],
    authorSelectors: ['.author-name', '.name'],
    imageAttributes: ['src', 'data-original-src'],
  },
  infoq: {
    contentSelectors: ['.article-content', '.content', 'article'],
    titleSelectors: ['h1', '.article-title'],
    authorSelectors: ['.author-name', '.author'],
    imageAttributes: ['src', 'data-src'],
  },
  segmentfault: {
    contentSelectors: ['#articleContent', '.article-content', '.article'],
    titleSelectors: ['h1', '.article-title'],
    authorSelectors: ['.user-info-name', '.username', '.author'],
    imageAttributes: ['src', 'data-src'],
  },
  oschina: {
    contentSelectors: ['.article-content', '.content', '#articleContent'],
    titleSelectors: ['h1', '.article-title'],
    authorSelectors: ['.user-name', '.author-name'],
    imageAttributes: ['src', 'data-src'],
  },
};

// ============================================
// 统一解析器
// ============================================

export async function parseHtmlToMarkdown(
  html: string,
  url: string,
  platform: string,
  fetcherMeta: { fetcher: string; method: string },
  options?: ParseOptions
): Promise<ParseResult> {
  const config = PLATFORM_CONFIGS[platform] || {};

  let title = "";
  let author = "";
  let contentHtml = "";
  let content = "";
  let images: string[] = [];
  let method = fetcherMeta.method;
  let videos: string[] = [];

  // 预处理 HTML
  if (config.preprocess) {
    html = config.preprocess(html);
  }

  // ====== L1: 从 script#id 标签提取 JSON ======
  if (config.jsonScriptPatterns && !contentHtml) {
    for (const pattern of config.jsonScriptPatterns) {
      const regex = new RegExp(`<script[^>]*id="${pattern.selector.replace('#', '')}"[^>]*>[\\s\\S]*?</script>`, "i");
      const match = html.match(regex);
      if (match) {
        try {
          const jsonStr = match[0].replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim();
          const data = JSON.parse(jsonStr);

          // 知乎特殊处理：提取多个回答
          if (platform === "zhihu" && options?.maxAnswers && options.maxAnswers > 1) {
            const entities = data?.initialState?.entities;
            const answers = entities?.answers || {};
            const answerValues = Object.values(answers) as any[];
            if (answerValues.length > 0) {
              const max = Math.min(options.maxAnswers, answerValues.length);
              const parts: string[] = [];
              const authors: string[] = [];
              for (let i = 0; i < max; i++) {
                const ans = answerValues[i];
                if (ans?.content) {
                  parts.push(`<h3>回答 ${i + 1}${ans.author?.name ? `（${ans.author.name}）` : ""}</h3>`);
                  parts.push(ans.content);
                  if (ans.author?.name) authors.push(ans.author.name);
                }
              }
              if (parts.length > 0) {
                contentHtml = parts.join("\n");
                title = title || getByPath(data, pattern.titlePath || "") || "";
                author = authors.join(", ") || getByPath(data, pattern.authorPath || "") || "";
                method = `zhihu-${max}-answers`;
                break; // 成功提取多个回答，跳出 pattern 循环
              }
            }
          }

          const extractedContent = getByPath(data, pattern.contentPath);
          if (extractedContent) {
            contentHtml = extractedContent;
            title = title || getByPath(data, pattern.titlePath || "") || "";
            author = author || getByPath(data, pattern.authorPath || "") || "";
            method = `${pattern.selector}-json`;
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // ====== L2: 从 inline script 变量提取 JSON ======
  if (config.inlineScriptPatterns && !contentHtml) {
    for (const pattern of config.inlineScriptPatterns) {
      const regex = new RegExp(pattern.regex, pattern.flags || "");
      const match = html.match(regex);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const extractedContent = getByPath(data, pattern.contentPath);
          if (extractedContent) {
            contentHtml = extractedContent;
            title = title || getByPath(data, pattern.titlePath || "") || "";
            author = author || getByPath(data, pattern.authorPath || "") || "";
            method = "inline-script-json";
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // ====== L3: Readability.js（通用最强去噪） ======
  if (!contentHtml) {
    try {
      const { JSDOM } = await import("jsdom");
      const { Readability } = await import("@mozilla/readability");
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article) {
        title = title || article.title || "";
        contentHtml = article.content || "";
        method = method || "readability-js";
        const articleImgMatches = (article.content || "").matchAll(/<img[^>]*src="(https?:\/\/[^"]+)"/g);
        images = Array.from(articleImgMatches).map((m) => m[1]).filter(Boolean).slice(0, 10);
      }
    } catch {
      // ignore
    }
  }

  // ====== L4: DOM 选择器（平台适配配置） ======
  if (config.contentSelectors && !contentHtml) {
    for (const selector of config.contentSelectors) {
      // 用正则模拟 CSS 选择器（服务端无完整 DOM）
      const className = selector.startsWith(".") ? selector.slice(1) : selector;
      const idName = selector.startsWith("#") ? selector.slice(1) : "";
      const attr = idName ? `id="${idName}"` : `class="[^"]*${className}[^"]*"`;
      const regex = new RegExp(`<[^>]*${attr}[^>]*>([\\s\\S]*?)</[^>]+>`, "i");
      const match = html.match(regex);
      if (match) {
        contentHtml = match[1];
        method = method || `dom-selector-${selector}`;
        break;
      }
    }
  }

  // 标题选择器
  if (config.titleSelectors && !title) {
    for (const selector of config.titleSelectors) {
      const className = selector.startsWith(".") ? selector.slice(1) : "";
      const tagName = /^[a-zA-Z0-9]+$/.test(selector) ? selector : "";
      let regex: RegExp;
      if (tagName) {
        regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
      } else {
        regex = new RegExp(`<[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)</[^>]+>`, "i");
      }
      const match = html.match(regex);
      if (match) {
        title = match[1].replace(/<[^>]+>/g, "").trim();
        if (title) break;
      }
    }
  }

  // 作者选择器
  if (config.authorSelectors && !author) {
    for (const selector of config.authorSelectors) {
      const className = selector.startsWith(".") ? selector.slice(1) : "";
      const idName = selector.startsWith("#") ? selector.slice(1) : "";
      const attr = idName ? `id="${idName}"` : `class="[^"]*${className}[^"]*"`;
      const regex = new RegExp(`<[^>]*${attr}[^>]*>([\\s\\S]*?)</[^>]+>`, "i");
      const match = html.match(regex);
      if (match) {
        author = match[1].replace(/<[^>]+>/g, "").trim();
        if (author) break;
      }
    }
  }

  // ====== L5: OG 标签兜底 ======
  if (!title) {
    title = extractMeta(html, "og:title")
      || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim()
      || "未知标题";
  }
  if (!author) {
    author = extractMeta(html, "og:article:author")
      || extractMeta(html, "og:author")
      || "";
  }
  if (!contentHtml) {
    content = extractMeta(html, "og:description") || "";
    method = method || "og-extract";
  }

  // ====== 转换为 Markdown ======
  if (contentHtml) {
    content = htmlToMarkdown(contentHtml);
    method = method || "html-to-markdown";
  }

  // 最终兜底
  if (!content || content.trim().length === 0) {
    content = cleanHtml(html);
    method = method || "clean-html";
  }

  // 提取图片
  if (!images.length) {
    images = extractImagesFromHtml(contentHtml || html, config.imageAttributes);
  }
  const ogImage = extractMeta(html, "og:image");
  if (ogImage && !images.includes(ogImage)) {
    images.unshift(ogImage);
  }

  // 视频（抖音）
  if (platform === "douyin") {
    const videoMatches = html.matchAll(/<video[^>]*src="([^"]+)"/g);
    videos = Array.from(videoMatches).map((m) => m[1]).filter(Boolean).slice(0, 5);
  }

  return {
    title: title || `${platform} 内容`,
    author: author || "",
    content: content.slice(0, MAX_CONTENT_CHARS),
    images: images.slice(0, 20),
    videos,
    comments: [],
    metadata: { source: platform, method, fetcher: fetcherMeta.fetcher },
    method,
    platform,
    url,
  };
}
