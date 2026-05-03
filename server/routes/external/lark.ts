/**
 * ============================================================================
 * 外部 API BFF 路由 - lark
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes/external
 */


import type { ViteDevServer } from "vite";
import { lark as larkEnv } from "../../config/env";
import { rateLimitExternal } from "../../middleware/rate-limit";
import { translateLarkError } from "../../utils/lark-error-translator";
import {
  getUserAccessToken,
  getTokenStatus,
  refreshTokenManually,
  RefreshTokenExpiredError,
} from "../../services/lark-token-manager";
import type { RouteContext } from "./proxy";

/**
 * 飞书 Open API 直连路由
 * 使用 App ID + App Secret 获取 tenant_access_token,直接调用飞书 REST API
 * 无需 lark-cli OAuth 登录
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

// Token 缓存
let tokenCache: { token: string; expireAt: number } | null = null;

/** 获取 tenant_access_token(带缓存) */
async function getTenantAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expireAt > Date.now() + 5 * 60 * 1000) {
    return tokenCache.token;
  }

  const appId = larkEnv.appId;
  const appSecret = larkEnv.appSecret;

  if (!appId || !appSecret) {
    throw new Error(
      "FEISHU_APP_ID / LARK_APP_ID 或 FEISHU_APP_SECRET / LARK_APP_SECRET 未配置. 请在 .env 中设置: FEISHU_APP_ID=cli_xxx FEISHU_APP_SECRET=xxx"
    );
  }

  const res = await fetch(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`飞书认证失败: ${data.msg} (code: ${data.code})`);
  }

  tokenCache = {
    token: data.tenant_access_token,
    expireAt: Date.now() + data.expire * 1000,
  };

  return tokenCache.token;
}

/** 获取 user_access_token(从 TokenManager 读取,支持热更新和自动刷新) */
async function getUserAccessTokenFromManager(): Promise<string> {
  try {
    return await getUserAccessToken();
  } catch (e: any) {
    if (e.name === "RefreshTokenExpiredError") {
      throw new Error(
        "user_access_token 已过期且 refresh_token 也已失效. \n" +
        "原因：用户授权已满 365 天,或 refresh_token 已被使用. \n" +
        "解决：需要重新走 OAuth 授权流程. \n" +
        "步骤：1) 运行 notebook 生成授权链接 → 2) 浏览器扫码 → 3) 复制 code → 4) 换 token"
      );
    }
    throw e;
  }
}

/** 通用飞书 API 调用
 * 自动 Token 选择策略：
 * - 显式 useUserToken=true → 用 user_access_token
 * - 路径以 /wiki/ 开头且配置了 user token → 自动用 user_access_token
 * - 其他 → 用 tenant_access_token
 */
async function feishuApi(
  method: string,
  path: string,
  body?: any,
  query?: Record<string, string>,
  useUserToken: boolean = false
): Promise<any> {
  // 自动判断：Wiki 路径优先使用 user token(避免 131006 permission denied)
  const hasUserTokenCache = !!getTokenStatus().exists;
  const shouldUseUserToken = useUserToken || (path.startsWith('/wiki/') && hasUserTokenCache);
  const token = shouldUseUserToken ? await getUserAccessTokenFromManager() : await getTenantAccessToken();

  let url = `${FEISHU_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += "?" + params.toString();
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return data;
}

/** 解析 JSON body */
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalLength = 0;
    req.on("data", (chunk: Buffer) => {
      totalLength += chunk.length;
      if (totalLength > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body too large (max 10MB)"));
        return;
      }
      chunks.push(chunk);
    });
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

/** 发送 JSON 响应 */
function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
/** 发送 Lark 业务结果(自动翻译错误) */
function sendLarkResult(res: any, result: any) {
  if (result.code === 0) {
    sendJson(res, 200, result);
  } else {
    const translated = translateLarkError(result.msg, result.code);
    sendJson(res, 400, { code: result.code, msg: translated.message, suggestion: translated.suggestion, original: result });
  }
}


/** 统一布尔值转换 */
function normalizeBoolean(value: any): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

/** 快速参数校验 */
function requireParams(res: any, params: Record<string, any>, ...keys: string[]): boolean {
  const missing = keys.filter((k) => {
    const v = params[k];
    return v === undefined || v === null || v === '';
  });
  if (missing.length > 0) {
    sendJson(res, 400, { code: -1, msg: `缺少参数: ${missing.join(', ')}` });
    return false;
  }
  return true;
}

/** 通用飞书 API 调用(支持 multipart/form-data) */
async function feishuApiMultipart(
  path: string,
  formData: FormData,
  useUserToken: boolean = false
): Promise<any> {
  const hasUserTokenCache = !!getTokenStatus().exists;
  const shouldUseUserToken = useUserToken || (path.startsWith('/wiki/') && hasUserTokenCache);
  const token = shouldUseUserToken ? await getUserAccessTokenFromManager() : await getTenantAccessToken();

  const res = await fetch(`${FEISHU_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();
  return data;
}

/**
 * 注册飞书(Lark)Open API BFF 路由
 *
 * 挂载 /api/lark/* 全量端点,覆盖：
 * - 文档生命周期：创建、读取、更新、删除、搜索、分享
 * - 块操作：插入、更新、删除、批量替换(支持 Markdown 批量转 Block)
 * - 表格：创建、填充、格式设置
 * - 图片：上传并内嵌到文档
 * - 消息：发送文本/富文本/卡片到群聊
 *
 * 双 Token 策略：
 * - tenant_access_token(应用级)：用于文档、块、表格等通用操作
 * - user_access_token(用户级)：仅用于 Wiki 知识库操作
 *
 * @param server - Vite 开发服务器实例
 * @param ctx    - 路由上下文(含 structuredLog)
 */
export function registerLarkRoutes(server: ViteDevServer, ctx: RouteContext) {
  server.middlewares.use("/api/lark", rateLimitExternal);
  const { structuredLog } = ctx;

  // ============================================
  // 文档: 创建(通用双 Token 策略)
  // POST /api/lark/doc/create
  // Body: {
  //   title?: string, folder_token?: string,
  //   owner_email?: string, owner_mobile?: string,
  //   use_user_token?: boolean   // true=user创建(可迁Wiki), false=tenant创建+自动分享
  // }
  // ============================================
  server.middlewares.use("/api/lark/doc/create", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const useUserToken = normalizeBoolean(body.use_user_token);
      const payload: any = {};
      if (body.title) payload.title = String(body.title);
      if (body.folder_token) payload.folder_token = String(body.folder_token);

      structuredLog.info("lark.doc.create", "创建飞书文档", { title: body.title, use_user_token: useUserToken });
      const result = await feishuApi("POST", "/docx/v1/documents", payload, undefined, useUserToken);

      if (result.code === 0 && result.document) {
        const docId = result.document.document_id;

        // --- 权限自动下放逻辑 ---
        const ownerEmail = body.owner_email;
        const ownerMobile = body.owner_mobile;
        const enablePermission = body.enable_permission !== false; // 默认开启

        if (enablePermission) {
          let shared = false;

          // 方式1: 显式指定了 owner_email / owner_mobile
          if (ownerEmail || ownerMobile) {
            try {
              const searchPayload: any = {};
              if (ownerEmail) searchPayload.emails = [ownerEmail];
              if (ownerMobile) searchPayload.mobiles = [ownerMobile];

              const userRes = await feishuApi("POST", "/contact/v3/users/batch_get_id", searchPayload, { user_id_type: "open_id" });
              const openId = userRes.data?.user_list?.[0]?.user_id;

              if (openId) {
                const permResult = await feishuApi("POST", `/drive/v1/permissions/${docId}/members`, {
                  member_type: "openid",
                  member_id: openId,
                  perm: "full_access"
                }, { type: "docx" });

                (result as any).permission_result = permResult;

                if (permResult.code === 0) {
                  structuredLog.info("lark.doc.permission", "权限已自动下放", { email: ownerEmail, mobile: ownerMobile, open_id: openId });
                  shared = true;
                } else {
                  structuredLog.error("lark.doc.permission", "权限下放失败", { email: ownerEmail, mobile: ownerMobile, error: permResult });
                }
              }
            } catch (e) {
              structuredLog.warn("lark.doc.permission", "身份识别失败,跳过权限下放", e);
            }
          }

          // 方式2: tenant token 创建且未显式指定 owner → 自动分享给当前 user token 用户
          if (!shared && !useUserToken && getTokenStatus().exists) {
            try {
              const meRes = await feishuApi("GET", "/contact/v3/users/me", undefined, undefined, true);
              const myOpenId = meRes.data?.user?.user_id;
              if (myOpenId) {
                const permResult = await feishuApi("POST", `/drive/v1/permissions/${docId}/members`, {
                  member_type: "openid",
                  member_id: myOpenId,
                  perm: "full_access"
                }, { type: "docx" });

                if (permResult.code === 0) {
                  (result as any).permission_auto_shared = true;
                  (result as any).permission_open_id = myOpenId;
                  structuredLog.info("lark.doc.permission", "已自动分享给当前用户", { open_id: myOpenId });
                }
              }
            } catch (e: any) {
              structuredLog.warn("lark.doc.permission", "自动分享失败(请确认应用有 contact:user.department:readonly 用户权限)", e.message);
            }
          }
        }
      }

      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 读取纯文本
  // GET /api/lark/doc/read?document_id=xxx
  // ============================================
  // 社区标准做法：raw_content 获取纯文本 + blocks 获取公式/富文本结构
  // 合并返回,确保不遗漏任何内容
  // ============================================
  server.middlewares.use("/api/lark/doc/read", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const documentId = url.searchParams.get("document_id");
      if (!documentId) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 参数" });
        return;
      }

      structuredLog.info("lark.doc.read", "读取飞书文档", { document_id: documentId });
      const useUserToken = normalizeBoolean(url.searchParams.get("use_user_token"));

      // 1. raw_content 获取纯文本(速度快,含表格文本但格式扁平)
      const rawResult = await feishuApi("GET", `/docx/v1/documents/${documentId}/raw_content`, undefined, undefined, useUserToken);
      if (rawResult.code !== 0) {
        sendLarkResult(res, rawResult);
        return;
      }
      const rawText = rawResult.data?.content || "";

      // 2. blocks 获取富文本结构(提取公式、图片标记)
      const blocksResult = await feishuApi("GET", `/docx/v1/documents/${documentId}/blocks`, undefined, { page_size: "500" }, useUserToken);
      let formulas: string[] = [];
      let images: string[] = [];

      if (blocksResult.code === 0) {
        const items = blocksResult.data?.items || [];
        for (const block of items) {
          // 提取所有 elements 里的 equation 和 image
          const elements = extractBlockElements(block);
          for (const el of elements) {
            if (el.equation?.content) {
              formulas.push(el.equation.content);
            }
            if (el.image?.token) {
              images.push(el.image.token);
            }
          }
        }
      }

      // 3. 合并：raw_content 文本 + 公式列表 + 图片标记
      const parts: string[] = [rawText];
      if (formulas.length > 0) {
        parts.push("\n\n【文档中的数学公式】");
        formulas.forEach((f, i) => parts.push(`${i + 1}. $$${f}$$`));
      }
      if (images.length > 0) {
        parts.push(`\n\n【文档中包含 ${images.length} 张图片,图片 token: ${images.join(", ")}】`);
      }

      sendJson(res, 200, {
        code: 0,
        msg: "success",
        data: {
          content: parts.join("\n"),
          raw_content: rawText,
          formulas,
          images,
          document_id: documentId,
        },
      });
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  /** 从 block 中提取所有 elements(递归处理常见字段) */
  function extractBlockElements(block: any): any[] {
    if (!block) return [];
    const elements: any[] = [];

    // 常见包含 elements 的字段
    const fields = [
      "text", "heading1", "heading2", "heading3", "heading4",
      "heading5", "heading6", "heading7", "heading8", "heading9",
      "bullet", "ordered", "code", "quote", "todo",
    ];
    for (const f of fields) {
      if (block[f]?.elements) {
        elements.push(...block[f].elements);
      }
    }

    // 图片块
    if (block.image) {
      elements.push({ image: block.image });
    }

    // 表格块的 children 是 cell blocks,需要递归
    if (block.block_type === 31 && block.children) {
      // table 的 children 只是 ID 列表,不在这里递归(避免大量 API 调用)
      // 公式通常不在 table cell 里,或者 raw_content 已经包含了表格文本
    }

    return elements;
  }

  // ============================================
  // 文档: 读取元数据(标题、所有者等)
  // GET /api/lark/doc/meta?document_id=xxx
  // ============================================
  server.middlewares.use("/api/lark/doc/meta", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const documentId = url.searchParams.get("document_id");
      if (!documentId) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 参数" });
        return;
      }

      const useUserToken = normalizeBoolean(url.searchParams.get("use_user_token"));
      const result = await feishuApi("GET", `/docx/v1/documents/${documentId}`, undefined, undefined, useUserToken);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 搜索
  // POST /api/lark/doc/search
  // Body: { search_key: string, count?: number }
  // ============================================
  server.middlewares.use("/api/lark/doc/search", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      if (!body.search_key) {
        sendJson(res, 400, { code: -1, msg: "缺少 search_key 参数" });
        return;
      }

      structuredLog.info("lark.doc.search", "搜索飞书文档", { search_key: body.search_key });
      const payload = {
        search_key: String(body.search_key),
        count: Math.min(Number(body.count) || 20, 50),
      };
      const result = await feishuApi("POST", "/suite/docs-api/search/object", payload);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 获取块结构
  // GET /api/lark/doc/blocks?document_id=xxx&page_size=500
  // ============================================
  server.middlewares.use("/api/lark/doc/blocks", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const documentId = url.searchParams.get("document_id");
      if (!documentId) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 参数" });
        return;
      }

      const pageSize = Math.min(Number(url.searchParams.get("page_size")) || 500, 500);
      const result = await feishuApi(
        "GET",
        `/docx/v1/documents/${documentId}/blocks`,
        undefined,
        { page_size: String(pageSize) }
      );
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 追加内容块
  // POST /api/lark/doc/append
  // Body: { document_id, blocks: [{ block_type, content? }] }
  //
  // 特殊处理：table block (block_type: 31) 不支持嵌套 children,
  // 需要先创建 table,再创建 cell blocks,最后更新 table.cells
  // ============================================
  server.middlewares.use("/api/lark/doc/append", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const documentId = body.document_id;
      const blocks = body.blocks;

      if (!documentId || !Array.isArray(blocks) || blocks.length === 0) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 或 blocks 参数" });
        return;
      }

      structuredLog.info("lark.doc.append", "追加文档内容", {
        document_id: documentId,
        block_count: blocks.length,
      });
      // 如果前端未显式指定 use_user_token,且本地有 user token 缓存,默认使用 user token
      // 原因：Wiki 节点创建的文档必须用 user token 写入,而大模型经常遗漏该参数
      let useUserToken = normalizeBoolean(body.use_user_token);
      if (body.use_user_token === undefined && getTokenStatus().exists) {
        useUserToken = true;
      }

      const results: any[] = [];
      let normalBatch: any[] = [];

      for (const block of blocks) {
        if (block.block_type === 31 && Array.isArray(block._cell_contents) && block._cell_contents.length > 0) {
          // 先提交前面的普通 blocks
          if (normalBatch.length > 0) {
            const r = await feishuApi(
              "POST",
              `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
              { children: normalBatch },
              undefined,
              useUserToken
            );
            results.push(r);
            if (r.code !== 0) {
              sendLarkResult(res, r);
              return;
            }
            normalBatch = [];
          }

          // 创建 table(多步：table → cells → update cells)
          const tableResult = await createTableBlock(documentId, block, useUserToken);
          results.push(tableResult);
          if (tableResult.code !== 0) {
            sendLarkResult(res, tableResult);
            return;
          }
        } else {
          normalBatch.push(block);
        }
      }

      // 提交最后一批普通 blocks
      if (normalBatch.length > 0) {
        const r = await feishuApi(
          "POST",
          `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
          { children: normalBatch },
          undefined,
          useUserToken
        );
        results.push(r);
        if (r.code !== 0) {
          sendLarkResult(res, r);
          return;
        }
      }

      sendJson(res, 200, {
        code: 0,
        msg: "success",
        data: { results },
      });
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  /** 创建 table block(两步：创建空 table → GET cell → PATCH auto-generated text child)
   *  用 PATCH update_text_elements 更新飞书自动生成的空 text child,消除空 child 副作用. 
   */
  async function createTableBlock(documentId: string, tableBlock: any, useUserToken: boolean = false): Promise<any> {
    const cellContents: any[][] = tableBlock._cell_contents || [];
    const { _cell_contents: _, ...tableData } = tableBlock;

    // 1. 创建 table block(只含 property,不含 _cell_contents)
    const tableResult = await feishuApi(
      "POST",
      `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
      { children: [tableData] },
      undefined,
      useUserToken
    );

    if (tableResult.code !== 0) return tableResult;

    const tableId = tableResult.data?.children?.[0]?.block_id;
    const cellIds: string[] = tableResult.data?.children?.[0]?.table?.cells || [];

    if (!tableId || cellIds.length === 0) {
      return { code: -1, msg: "创建 table block 后未返回 block_id 或 cell_ids" };
    }

    if (cellContents.length !== cellIds.length) {
      return {
        code: -1,
        msg: `cell 内容数量不匹配: _cell_contents=${cellContents.length}, cell_ids=${cellIds.length}`
      };
    }

    // 2. 对每个 cell：GET 获取 auto-generated text child → PATCH update_text_elements
    const results: any[] = [];
    for (let i = 0; i < cellIds.length; i++) {
      const cellId = cellIds[i];
      const elements = cellContents[i] || [];

      const hasContent = elements.some(
        (el: any) => el.text_run?.content || el.equation?.content
      );
      if (!hasContent) continue;

      // QPS 保护：每 3 个 cell 后延时 400ms(每个 cell 2 个请求)
      if (i > 0 && i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }

      // 2a. GET cell 获取 auto-generated text child
      const cellResult = await feishuApi(
        "GET",
        `/docx/v1/documents/${documentId}/blocks/${cellId}`,
        undefined,
        undefined,
        useUserToken
      );
      if (cellResult.code !== 0) {
        return {
          code: cellResult.code,
          msg: `Cell ${i} GET 失败: ${cellResult.msg}`,
          data: { results }
        };
      }

      const textChildId = cellResult.data?.block?.children?.[0];
      if (!textChildId) {
        return {
          code: -1,
          msg: `Cell ${i} 未找到 auto-generated text child`,
          data: { results }
        };
      }

      // 2b. PATCH text child
      const patchResult = await feishuApi(
        "PATCH",
        `/docx/v1/documents/${documentId}/blocks/${textChildId}`,
        { update_text_elements: { elements } },
        undefined,
        useUserToken
      );
      results.push(patchResult);
      if (patchResult.code !== 0) {
        return {
          code: patchResult.code,
          msg: `Cell ${i} PATCH 失败: ${patchResult.msg}`,
          data: { table_id: tableId, cell_results: results }
        };
      }
    }

    return {
      code: 0,
      msg: "success",
      data: { table_id: tableId, cell_ids: cellIds, cell_results: results }
    };
  }

  /** 把前端传来的 block content 转换为飞书 PATCH 所需的格式
   *  处理常规文本块以及数学公式块的特殊 Schema 映射
   */
  function convertPatchBody(updateData: any): any {
    const blockTypeFields = [
      "text", "heading1", "heading2", "heading3", "heading4",
      "heading5", "heading6", "heading7", "heading8", "heading9",
      "bullet", "ordered", "code", "quote"
    ];

    for (const field of blockTypeFields) {
      if (updateData[field] && Array.isArray(updateData[field].elements)) {
        // 对 elements 进行深度修复,转换数学公式节点
        const elements = updateData[field].elements.map((el: any) => {
          // 如果是一个特殊的数学公式标记块
          if (el.equation && typeof el.equation === 'string') {
            return {
              equation: { content: el.equation }
            };
          }
          // 支持直接传入文本
          if (typeof el === 'string') {
            return { text_run: { content: el } };
          }
          return el;
        });

        // 如果是代码块,需要确保 language 被正确映射
        if (field === "code" && updateData.code.style) {
          return {
            update_code: {
              elements,
              style: updateData.code.style
            }
          };
        }

        return { update_text_elements: { elements } };
      }
    }
    return updateData;
  }

  // ============================================
  // 文档: 更新块
  // PATCH /api/lark/doc/block
  // Body: { document_id, block_id, block_type, content }
  // ============================================
  server.middlewares.use("/api/lark/doc/block", async (req, res, next) => {
    if (req.method !== "PATCH") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      // 过滤 block_type,飞书 PATCH /blocks/{id} 不需要此字段
      const { document_id, block_id, block_type, ...updateData } = body;

      if (!document_id || !block_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 或 block_id 参数" });
        return;
      }

      structuredLog.info("lark.doc.update_block", "更新文档块", { document_id, block_id });
      const patchBody = convertPatchBody(updateData);
      let useUserToken = normalizeBoolean(body.use_user_token);
      if (body.use_user_token === undefined && getTokenStatus().exists) {
        useUserToken = true;
      }
      const result = await feishuApi(
        "PATCH",
        `/docx/v1/documents/${document_id}/blocks/${block_id}`,
        patchBody,
        undefined,
        useUserToken
      );
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 删除块
  // DELETE /api/lark/doc/block
  // Body: { document_id, block_id }
  // 后端自动查索引后调用 batch_delete
  // ============================================
  server.middlewares.use("/api/lark/doc/block", async (req, res, next) => {
    if (req.method !== "DELETE") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const documentId = body.document_id;
      const blockId = body.block_id;

      if (!documentId || !blockId) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 或 block_id 参数" });
        return;
      }

      structuredLog.info("lark.doc.delete_block", "删除文档块", { document_id: documentId, block_id: blockId });
      let useUserTokenDel = normalizeBoolean(body.use_user_token);
      if (body.use_user_token === undefined && getTokenStatus().exists) {
        useUserTokenDel = true;
      }

      // 1. 获取父块(文档根 Page)的所有子块,查找目标索引
      const listResult = await feishuApi(
        "GET",
        `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
        undefined,
        { page_size: "500" },
        useUserTokenDel
      );
      if (listResult.code !== 0) {
        sendJson(res, 400, listResult);
        return;
      }

      const items = listResult.data?.items || [];
      const index = items.findIndex((item: any) => item.block_id === blockId);
      if (index === -1) {
        sendJson(res, 400, { code: -1, msg: "未找到指定 block_id 的块" });
        return;
      }

      // 2. 调用 batch_delete 按索引删除
      const result = await feishuApi(
        "DELETE",
        `/docx/v1/documents/${documentId}/blocks/${documentId}/children/batch_delete`,
        { start_index: index, end_index: index + 1 },
        undefined,
        useUserTokenDel
      );
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 清空所有内容
  // POST /api/lark/doc/clear
  // Body: { document_id }
  // 保留文档本身(page 块),删除所有子块
  // ⚠️ 危险操作,删除后无法恢复
  // ============================================
  server.middlewares.use("/api/lark/doc/clear", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const documentId = body.document_id;
      let useUserTokenClear = normalizeBoolean(body.use_user_token);
      if (body.use_user_token === undefined && getTokenStatus().exists) {
        useUserTokenClear = true;
      }

      if (!documentId) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 参数" });
        return;
      }

      structuredLog.info("lark.doc.clear", "清空文档", { document_id: documentId });

      // 1. 获取文档根 Page 的所有子块
      const listResult = await feishuApi(
        "GET",
        `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
        undefined,
        { page_size: "500" },
        useUserTokenClear
      );
      if (listResult.code !== 0) {
        sendLarkResult(res, listResult);
        return;
      }

      const items = listResult.data?.items || [];
      if (items.length === 0) {
        sendJson(res, 200, { code: 0, data: { deleted: 0, message: "文档已经是空的" } });
        return;
      }

      // 2. 批量删除所有子块(start_index=0, end_index=items.length)
      const result = await feishuApi(
        "DELETE",
        `/docx/v1/documents/${documentId}/blocks/${documentId}/children/batch_delete`,
        { start_index: 0, end_index: items.length },
        undefined,
        useUserTokenClear
      );

      if (result.code === 0) {
        sendJson(res, 200, {
          code: 0,
          data: {
            deleted: items.length,
            document_id: documentId,
            message: `已清空文档,共删除 ${items.length} 个内容块`
          }
        });
      } else {
        sendLarkResult(res, result);
      }
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 图片: 插入文档(三步法封装)
  // POST /api/lark/doc/image/insert
  // Body: { document_id, image_url?, image_base64?, file_name?, caption? }
  // ============================================
  server.middlewares.use("/api/lark/doc/image/insert", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const { document_id, image_url, image_base64, file_name, caption } = body;

      if (!document_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 参数" });
        return;
      }
      if (!image_url && !image_base64) {
        sendJson(res, 400, { code: -1, msg: "缺少 image_url 或 image_base64 参数" });
        return;
      }

      // Step 1: 创建空图片块
      const emptyImageBlock = { block_type: 27, image: {} };
      const createResult = await feishuApi(
        "POST",
        `/docx/v1/documents/${document_id}/blocks/${document_id}/children`,
        { children: caption ? [{ block_type: 2, text: { elements: [{ text_run: { content: caption } }] } }, emptyImageBlock] : [emptyImageBlock] }
      );
      if (createResult.code !== 0) {
        sendJson(res, 400, { code: createResult.code, msg: `创建图片块失败: ${createResult.msg}` });
        return;
      }

      const children = createResult.data?.children || [];
      const imageBlockResult = children.find((c: any) => c.block_type === 27);
      if (!imageBlockResult) {
        sendJson(res, 500, { code: -1, msg: "创建图片块后未返回 block_id" });
        return;
      }
      const imageBlockId = imageBlockResult.block_id;

      // Step 2: 准备图片数据
      let imageBuffer: Buffer;
      let finalFileName: string;

      if (image_url) {
        const imgRes = await fetch(image_url, { timeout: 30000 } as any);
        if (!imgRes.ok) {
          sendJson(res, 400, { code: -1, msg: `下载图片失败: ${imgRes.status} ${imgRes.statusText}` });
          return;
        }
        imageBuffer = Buffer.from(await imgRes.arrayBuffer());
        finalFileName = image_url.split('/').pop()?.split('?')[0] || 'image.png';
        if (!finalFileName.includes('.')) finalFileName += '.png';
      } else {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
        finalFileName = file_name || 'image.png';
      }

      if (imageBuffer.length === 0) {
        sendJson(res, 400, { code: -1, msg: "图片数据为空" });
        return;
      }

      // Step 3: 上传素材(parent_node 必须是图片块 ID)
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)]);
      formData.append("file", blob, finalFileName);
      formData.append("file_name", finalFileName);
      formData.append("parent_type", "docx_image");
      formData.append("parent_node", imageBlockId);
      formData.append("size", String(imageBuffer.length));

      structuredLog.info("lark.image.insert", "插入图片到飞书文档", {
        document_id,
        image_block_id: imageBlockId,
        source: image_url ? 'url' : 'base64',
        size: imageBuffer.length,
      });

      const useUserTokenImg = normalizeBoolean(body.use_user_token);
      const uploadResult = await feishuApiMultipart("/drive/v1/medias/upload_all", formData, useUserTokenImg);
      if (uploadResult.code !== 0) {
        sendJson(res, 400, { code: uploadResult.code, msg: `上传素材失败: ${uploadResult.msg}` });
        return;
      }

      const fileToken = uploadResult.data?.file_token;

      // Step 4: PATCH 绑定图片
      const patchResult = await feishuApi(
        "PATCH",
        `/docx/v1/documents/${document_id}/blocks/${imageBlockId}`,
        { replace_image: { token: fileToken } },
        undefined,
        useUserTokenImg
      );
      if (patchResult.code !== 0) {
        sendJson(res, 400, { code: patchResult.code, msg: `绑定图片失败: ${patchResult.msg}` });
        return;
      }

      sendJson(res, 200, {
        code: 0,
        msg: "success",
        data: {
          block_id: imageBlockId,
          file_token: fileToken,
          image_url: image_url || undefined,
        },
      });
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 分享权限
  // POST /api/lark/doc/share
  // Body: { document_id, member_id, member_type?, perm? }
  //
  // 智能转换：
  // - member_id 为邮箱格式 → 自动使用 member_type="email"
  // - member_id 为手机号格式 → 自动调用 batch_get_id 获取 open_id
  // ============================================
  server.middlewares.use("/api/lark/doc/share", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      let { document_id, member_id, member_type = "openid", perm = "full_access" } = body;

      if (!document_id || !member_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 或 member_id 参数" });
        return;
      }

      member_id = String(member_id).trim();

      // 判断格式
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member_id);
      const isMobile = /^\+?\d{7,15}$/.test(member_id);

      let finalMemberId = member_id;
      let finalMemberType = member_type;

      if (finalMemberType === "email" || isEmail) {
        // 邮箱格式 → 直接用 email 类型分享(无需查 ID)
        finalMemberType = "email";
      } else if (finalMemberType === "phone" || finalMemberType === "mobile" || isMobile) {
        // 手机号格式 → 先通过 batch_get_id 获取 open_id
        const idResult = await feishuApi(
          "POST",
          "/contact/v3/users/batch_get_id",
          { mobiles: [member_id] },
          { user_id_type: "open_id" }
        );
        if (idResult.code !== 0) {
          sendJson(res, 400, {
            code: idResult.code,
            msg: `手机号转 open_id 失败: ${idResult.msg}. 请确认应用有 contact:user.id:readonly 权限,或改用邮箱分享. `,
          });
          return;
        }
        const openId = idResult.data?.user_list?.[0]?.user_id;
        if (!openId) {
          sendJson(res, 400, {
            code: -1,
            msg: `未找到手机号 ${member_id} 对应的用户. 请确认手机号正确且已加入企业通讯录. `,
          });
          return;
        }
        finalMemberId = openId;
        finalMemberType = "openid";
      }

      structuredLog.info("lark.doc.share", "分享文档权限", {
        document_id,
        member_id: finalMemberId,
        member_type: finalMemberType,
        perm,
      });
      const useUserTokenShare = normalizeBoolean(body.use_user_token);
      const result = await feishuApi(
        "POST",
        `/drive/v1/permissions/${document_id}/members`,
        { member_type: finalMemberType, member_id: finalMemberId, perm },
        { type: "docx" },
        useUserTokenShare
      );
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 取消权限
  // DELETE /api/lark/doc/share
  // Body: { document_id, member_id, member_type? }
  //
  // 智能转换：
  // - member_id 为邮箱格式 → 自动使用 member_type="email"
  // - member_id 为手机号格式 → 自动调用 batch_get_id 获取 open_id(再调用删除)
  // ============================================
  server.middlewares.use("/api/lark/doc/share", async (req, res, next) => {
    if (req.method !== "DELETE") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      let { document_id, member_id, member_type = "openid" } = body;

      if (!document_id || !member_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 或 member_id 参数" });
        return;
      }

      member_id = String(member_id).trim();

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member_id);
      const isMobile = /^\+?\d{7,15}$/.test(member_id);

      let finalMemberId = member_id;
      let finalMemberType = member_type;

      if (finalMemberType === "email" || isEmail) {
        finalMemberType = "email";
      } else if (finalMemberType === "phone" || finalMemberType === "mobile" || isMobile) {
        const idResult = await feishuApi(
          "POST",
          "/contact/v3/users/batch_get_id",
          { mobiles: [member_id] },
          { user_id_type: "open_id" }
        );
        if (idResult.code !== 0) {
          sendJson(res, 400, {
            code: idResult.code,
            msg: `手机号转 open_id 失败: ${idResult.msg}. 请确认应用有 contact:user.id:readonly 权限,或改用邮箱. `,
          });
          return;
        }
        const openId = idResult.data?.user_list?.[0]?.user_id;
        if (!openId) {
          sendJson(res, 400, {
            code: -1,
            msg: `未找到手机号 ${member_id} 对应的用户. `,
          });
          return;
        }
        finalMemberId = openId;
        finalMemberType = "openid";
      }

      structuredLog.info("lark.doc.unshare", "取消文档权限", { document_id, member_id: finalMemberId });
      const useUserTokenUnshare = normalizeBoolean(body.use_user_token);
      const result = await feishuApi(
        "DELETE",
        `/drive/v1/permissions/${document_id}/members/${finalMemberId}`,
        undefined,
        { type: "docx", member_type: finalMemberType },
        useUserTokenUnshare
      );
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 消息: 发送
  // POST /api/lark/im/send
  // Body: { receive_id, receive_id_type, msg_type, content }
  // ============================================
  server.middlewares.use("/api/lark/im/send", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const {
        receive_id,
        receive_id_type = "open_id",
        msg_type = "text",
        content,
      } = body;

      if (!receive_id || !content) {
        sendJson(res, 400, { code: -1, msg: "缺少 receive_id 或 content 参数" });
        return;
      }

      let messageContent = content;
      if (msg_type === "text" && !content.startsWith("{")) {
        messageContent = JSON.stringify({ text: content });
      }

      structuredLog.info("lark.im.send", "发送飞书消息", { receive_id, msg_type });
      const result = await feishuApi(
        "POST",
        "/im/v1/messages",
        {
          receive_id: String(receive_id),
          msg_type: String(msg_type),
          content: String(messageContent),
        },
        { receive_id_type: String(receive_id_type) }
      );
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 用户: 搜索/查找
  // POST /api/lark/user/search
  // Body: { query, type? }
  //   type: "phone" | "email" | "keyword" (默认 keyword)
  // ============================================
  server.middlewares.use("/api/lark/user/search", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const query = body.query ? String(body.query).trim() : "";
      const type = body.type ? String(body.type).trim().toLowerCase() : "keyword";

      if (!query) {
        sendJson(res, 400, { code: -1, msg: "缺少 query 参数" });
        return;
      }

      if (type === "phone" || type === "mobile") {
        // 手机号 → batch_get_id(只需要 contact:user.id:readonly)
        const result = await feishuApi(
          "POST",
          "/contact/v3/users/batch_get_id",
          { mobiles: [query] },
          { user_id_type: "open_id" }
        );
        sendLarkResult(res, result);
        return;
      }

      if (type === "email") {
        // 邮箱 → batch_get_id
        const result = await feishuApi(
          "POST",
          "/contact/v3/users/batch_get_id",
          { emails: [query] },
          { user_id_type: "open_id" }
        );
        sendLarkResult(res, result);
        return;
      }

      // 默认 keyword → GET /contact/v3/users(需要 contact:contact.base:readonly)
      const result = await feishuApi("GET", "/contact/v3/users", undefined, {
        query: query,
        page_size: "20",
      });
      // 权限错误时给 Agent 更清晰的提示
      if (result.code !== 0 && result.code === 99991672) {
        result.msg = `${result.msg} | 提示：搜索姓名/部门需要 contact:contact.base:readonly 权限. 如果只有 contact:user.id:readonly 权限,请使用 type="phone" 或 type="email" 精确查找. `;
      }
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 创建空间
  // POST /api/lark/wiki/space/create
  // ============================================
  server.middlewares.use("/api/lark/wiki/space/create", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const payload: any = { name: String(body.name) };
      if (body.description) payload.description = String(body.description);
      structuredLog.info("lark.wiki.space.create", "创建飞书知识库", { name: body.name });
      const result = await feishuApi("POST", "/wiki/v2/spaces", payload, undefined, true);
      if (result.code === 0 && result.data?.space?.space_id) {
        result.data.space.space_url = `https://feishu.cn/wiki/space/${result.data.space.space_id}`;
      }
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 列出空间(自动翻页)
  // GET /api/lark/wiki/space/list
  // ============================================
  server.middlewares.use("/api/lark/wiki/space/list", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      const url = new URL(req.url || "", `http://localhost`);
      const page_size = url.searchParams.get("page_size") || "10";
      structuredLog.info("lark.wiki.space.list", "获取飞书知识库列表");

      const allItems: any[] = [];
      let pageToken: string | null = null;
      while (true) {
        const params: Record<string, string> = { page_size };
        if (pageToken) params.page_token = pageToken;
        const result = await feishuApi("GET", "/wiki/v2/spaces", undefined, params);
        if (result.code !== 0) {
          sendJson(res, 400, result);
          return;
        }
        const items = result.data?.items || [];
        allItems.push(...items);
        if (!result.data?.has_more) break;
        pageToken = result.data?.page_token;
        if (!pageToken) break;
      }

      sendJson(res, 200, {
        code: 0,
        msg: "success",
        data: { items: allItems },
      });
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 获取空间详情
  // GET /api/lark/wiki/space/get
  // ============================================
  server.middlewares.use("/api/lark/wiki/space/get", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      const url = new URL(req.url || "", `http://localhost`);
      const space_id = url.searchParams.get("space_id");
      if (!space_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 参数" });
        return;
      }
      structuredLog.info("lark.wiki.space.get", "获取飞书知识库详情", { space_id });
      const result = await feishuApi("GET", `/wiki/v2/spaces/${space_id}`);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 更新空间
  // POST /api/lark/wiki/space/update
  // ============================================
  server.middlewares.use("/api/lark/wiki/space/update", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      if (!space_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 参数" });
        return;
      }
      const payload: any = {};
      if (body.name !== undefined) payload.name = String(body.name);
      if (body.description !== undefined) payload.description = String(body.description);
      structuredLog.info("lark.wiki.space.update", "更新飞书知识库", { space_id });
      const result = await feishuApi("PATCH", `/wiki/v2/spaces/${space_id}`, payload);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 删除空间
  // POST /api/lark/wiki/space/delete
  // ============================================
  server.middlewares.use("/api/lark/wiki/space/delete", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      if (!space_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 参数" });
        return;
      }
      structuredLog.info("lark.wiki.space.delete", "删除飞书知识库", { space_id });
      const result = await feishuApi("DELETE", `/wiki/v2/spaces/${space_id}`);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 创建节点
  // POST /api/lark/wiki/node/create
  // ============================================
  server.middlewares.use("/api/lark/wiki/node/create", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      if (!space_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 参数" });
        return;
      }
      const payload: any = {
        node_type: "origin",
        obj_type: body.obj_type || "docx",
      };
      if (body.title) payload.title = String(body.title);
      if (body.parent_node_token) payload.parent_node_token = String(body.parent_node_token);
      structuredLog.info("lark.wiki.node.create", "创建飞书知识库节点", { space_id, title: body.title });
      const result = await feishuApi("POST", `/wiki/v2/spaces/${space_id}/nodes`, payload);
      if (result.code === 0 && result.data?.node) {
        const node = result.data.node;
        if (node.node_token) node.node_url = `https://feishu.cn/wiki/${node.node_token}`;
        if (node.obj_token) node.doc_url = `https://feishu.cn/docx/${node.obj_token}`;
      }
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 列出节点(自动翻页)
  // GET /api/lark/wiki/node/list
  // ============================================
  server.middlewares.use("/api/lark/wiki/node/list", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      const url = new URL(req.url || "", `http://localhost`);
      const space_id = url.searchParams.get("space_id");
      if (!space_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 参数" });
        return;
      }
      const pageSize = url.searchParams.get("page_size") || "10";
      const parent_node_token = url.searchParams.get("parent_node_token");
      structuredLog.info("lark.wiki.node.list", "获取飞书知识库节点列表", { space_id });

      const allItems: any[] = [];
      let pageToken: string | null = null;
      while (true) {
        const params: Record<string, string> = { page_size: pageSize };
        if (parent_node_token) params.parent_node_token = parent_node_token;
        if (pageToken) params.page_token = pageToken;
        const result = await feishuApi("GET", `/wiki/v2/spaces/${space_id}/nodes`, undefined, params);
        if (result.code !== 0) {
          sendJson(res, 400, result);
          return;
        }
        const items = result.data?.items || [];
        allItems.push(...items);
        if (!result.data?.has_more) break;
        pageToken = result.data?.page_token;
        if (!pageToken) break;
      }

      sendJson(res, 200, {
        code: 0,
        msg: "success",
        data: { items: allItems },
      });
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 删除节点
  // POST /api/lark/wiki/node/delete
  // ============================================
  server.middlewares.use("/api/lark/wiki/node/delete", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      const node_token = body.node_token;
      if (!space_id || !node_token) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 或 node_token 参数" });
        return;
      }
      structuredLog.info("lark.wiki.node.delete", "删除飞书知识库节点", { space_id, node_token });
      const result = await feishuApi("DELETE", `/wiki/v2/spaces/${space_id}/nodes/${node_token}`);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 将外部文档迁入(自动轮询异步任务)
  // POST /api/lark/wiki/move_doc
  // Body: { space_id, obj_token, parent_wiki_token?, title? }
  // ============================================
  server.middlewares.use("/api/lark/wiki/move_doc", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      const obj_token = body.obj_token;
      if (!space_id || !obj_token) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 或 obj_token 参数" });
        return;
      }
      const payload: any = { obj_token, obj_type: "docx" };
      if (body.parent_wiki_token) payload.parent_wiki_token = String(body.parent_wiki_token);
      if (body.title) payload.title = String(body.title);
      structuredLog.info("lark.wiki.move_doc", "将文档迁入 Wiki", { space_id, obj_token });

      // 1. 提交迁入任务(异步)
      const submitResult = await feishuApi("POST", `/wiki/v2/spaces/${space_id}/nodes/move_docs_to_wiki`, payload, undefined, true);
      if (submitResult.code !== 0) {
        sendLarkResult(res, submitResult);
        return;
      }

      // 2. 获取 task_id 并轮询
      const task_id = submitResult.data?.task_id;
      if (!task_id) {
        // 如果直接返回了 wiki_token(极少数情况同步完成)
        sendJson(res, 200, { code: 0, msg: "success", data: submitResult.data });
        return;
      }

      // 轮询 task 状态(最多 15 秒)
      let finalResult: any = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const taskResult = await feishuApi("GET", `/wiki/v2/tasks/${task_id}`, { task_type: "move" }, undefined, true);
        if (taskResult.code !== 0) continue;
        const moveResult = taskResult.data?.task?.move_result?.[0];
        if (!moveResult) continue;
        if (moveResult.status === 0) {
          finalResult = moveResult;
          break;
        }
        if (moveResult.status === -1) {
          sendJson(res, 400, { code: -1, msg: `迁入失败: ${moveResult.status_msg || "未知错误"}` });
          return;
        }
        // status === 1: 处理中,继续轮询
      }

      if (!finalResult) {
        sendJson(res, 400, { code: -1, msg: "迁入任务超时,请稍后手动确认" });
        return;
      }

      sendJson(res, 200, { code: 0, msg: "success", data: { node: finalResult.node } });
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // 文档: 读取元数据
  // GET /api/lark/doc/meta?document_id=xxx
  // ============================================
  server.middlewares.use("/api/lark/doc/meta", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const documentId = url.searchParams.get("document_id");
      if (!documentId) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 参数" });
        return;
      }
      const useUserToken = normalizeBoolean(url.searchParams.get("use_user_token"));
      const result = await feishuApi("GET", `/docx/v1/documents/${documentId}`, undefined, undefined, useUserToken);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 移动节点
  // POST /api/lark/wiki/node/move
  // ============================================
  server.middlewares.use("/api/lark/wiki/node/move", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      const node_token = body.node_token;
      if (!requireParams(res, body, 'space_id', 'node_token')) return;
      const payload: any = {};
      if (body.parent_node_token) payload.target_parent_token = String(body.parent_node_token);
      structuredLog.info("lark.wiki.node.move", "移动飞书知识库节点", { space_id, node_token });
      const result = await feishuApi("POST", `/wiki/v2/spaces/${space_id}/nodes/${node_token}/move`, payload, undefined, true);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 成员列表
  // GET /api/lark/wiki/member/list?space_id=xxx
  // ============================================
  server.middlewares.use("/api/lark/wiki/member/list", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      const url = new URL(req.url || "", `http://localhost`);
      const space_id = url.searchParams.get("space_id");
      if (!space_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 space_id 参数" });
        return;
      }
      const page_size = url.searchParams.get("page_size") || "100";
      structuredLog.info("lark.wiki.member.list", "获取飞书知识库成员列表", { space_id });
      const result = await feishuApi("GET", `/wiki/v2/spaces/${space_id}/members`, undefined, { page_size });
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 添加成员
  // POST /api/lark/wiki/member/add
  // ============================================
  server.middlewares.use("/api/lark/wiki/member/add", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      const member_id = body.member_id;
      if (!requireParams(res, body, 'space_id', 'member_id')) return;
      const payload = {
        member_type: body.member_type || "user",
        member_id: String(member_id),
        perm: body.perm || "view",
      };
      structuredLog.info("lark.wiki.member.add", "添加飞书知识库成员", { space_id, member_id });
      const result = await feishuApi("POST", `/wiki/v2/spaces/${space_id}/members`, payload);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Wiki 知识库: 移除成员
  // POST /api/lark/wiki/member/remove
  // ============================================
  server.middlewares.use("/api/lark/wiki/member/remove", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const space_id = body.space_id;
      const member_id = body.member_id;
      if (!requireParams(res, body, 'space_id', 'member_id')) return;
      structuredLog.info("lark.wiki.member.remove", "移除飞书知识库成员", { space_id, member_id });
      const result = await feishuApi("DELETE", `/wiki/v2/spaces/${space_id}/members/${member_id}`);
      sendLarkResult(res, result);
    } catch (e: any) {
      const translated = translateLarkError(e.message);
      sendJson(res, 500, { code: -1, msg: translated.message, suggestion: translated.suggestion });
    }
  });

  // ============================================
  // Token 管理: 刷新
  // POST /api/lark/token/refresh
  // ============================================
  server.middlewares.use("/api/lark/token/refresh", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      structuredLog.info("lark.token.refresh", "手动刷新 user_access_token");
      const result = await refreshTokenManually();
      if (result.success) {
        sendJson(res, 200, {
          code: 0,
          msg: "刷新成功",
          data: {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            expires_in: result.expires_in,
          },
        });
      } else {
        sendJson(res, 400, { code: -1, msg: result.error });
      }
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // Token 管理: 状态查询
  // GET /api/lark/token/status
  // ============================================
  server.middlewares.use("/api/lark/token/status", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const status = getTokenStatus();
      sendJson(res, 200, {
        code: 0,
        msg: "查询成功",
        data: status,
      });
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 健康检查
  // GET /api/lark/health
  // ============================================
  server.middlewares.use("/api/lark/health", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const token = await getTenantAccessToken();
      sendJson(res, 200, {
        success: true,
        connected: true,
        token_valid: !!token,
        hint: "飞书 Open API 连接正常",
      });
    } catch (e: any) {
      sendJson(res, 200, {
        success: false,
        connected: false,
        error: e.message,
        hint: "请检查 FEISHU_APP_ID / LARK_APP_ID 和 FEISHU_APP_SECRET / LARK_APP_SECRET 配置",
      });
    }
  });
}
