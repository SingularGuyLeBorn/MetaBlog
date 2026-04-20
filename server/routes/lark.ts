import type { ViteDevServer } from "vite";
import type { RouteContext } from "./proxy";

/**
 * 飞书 Open API 直连路由
 * 使用 App ID + App Secret 获取 tenant_access_token，直接调用飞书 REST API
 * 无需 lark-cli OAuth 登录
 */

const FEISHU_BASE = "https://open.feishu.cn/open-apis";

// Token 缓存
let tokenCache: { token: string; expireAt: number } | null = null;

/** 获取 tenant_access_token（带缓存） */
async function getTenantAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expireAt > Date.now() + 5 * 60 * 1000) {
    return tokenCache.token;
  }

  const appId = process.env.FEISHU_APP_ID || process.env.LARK_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET || process.env.LARK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "FEISHU_APP_ID / LARK_APP_ID 或 FEISHU_APP_SECRET / LARK_APP_SECRET 未配置。请在 .env 中设置: FEISHU_APP_ID=cli_xxx FEISHU_APP_SECRET=xxx"
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

/** 通用飞书 API 调用 */
async function feishuApi(
  method: string,
  path: string,
  body?: any,
  query?: Record<string, string>
): Promise<any> {
  const token = await getTenantAccessToken();

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
function parseBody(req: any): Promise<any> {
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

/** 发送 JSON 响应 */
function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function registerLarkRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { structuredLog } = ctx;

  // ============================================
  // 文档: 创建
  // POST /api/lark/doc/create
  // Body: { title?: string, folder_token?: string, owner_email?: string, owner_mobile?: string }
  // ============================================
  server.middlewares.use("/api/lark/doc/create", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const payload: any = {};
      if (body.title) payload.title = String(body.title);
      if (body.folder_token) payload.folder_token = String(body.folder_token);

      structuredLog.info("lark.doc.create", "创建飞书文档", { title: body.title });
      const result = await feishuApi("POST", "/docx/v1/documents", payload);
      
      if (result.code === 0 && result.document) {
        const docId = result.document.document_id;
        
        // --- 权限自动下放逻辑 ---
        const ownerEmail = body.owner_email;
        const ownerMobile = body.owner_mobile;
        
        if (ownerEmail || ownerMobile) {
          try {
            // 1. 获取用户 OpenID
            const searchPayload: any = {};
            if (ownerEmail) searchPayload.emails = [ownerEmail];
            if (ownerMobile) searchPayload.mobiles = [ownerMobile];
            
            const userRes = await feishuApi("POST", "/contact/v3/users/batch_get_id", searchPayload, { user_id_type: "open_id" });
            const openId = userRes.data?.user_list?.[0]?.user_id; // 飞书返回的字段名为 user_id，不论请求类型如何
            
            if (openId) {
              // 2. 赋予管理权限 (同步进行，确保调用方能收到反馈)
              const permResult = await feishuApi("POST", `/drive/v1/permissions/${docId}/members`, {
                member_type: "openid",
                member_id: openId,
                perm: "full_access"
              }, { type: "docx" });
              
              (result as any).permission_result = permResult;
              
              if (permResult.code === 0) {
                structuredLog.info("lark.doc.permission", "权限已自动下放", { email: ownerEmail, mobile: ownerMobile, open_id: openId });
              } else {
                structuredLog.error("lark.doc.permission", "权限下放失败", { email: ownerEmail, mobile: ownerMobile, error: permResult });
              }
            }
          } catch (e) {
            structuredLog.warn("lark.doc.permission", "身份识别失败，跳过权限下放", e);
          }
        }
      }

      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 读取纯文本
  // GET /api/lark/doc/read?document_id=xxx
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
      const result = await feishuApi("GET", `/docx/v1/documents/${documentId}/raw_content`);
      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 读取元数据（标题、所有者等）
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

      const result = await feishuApi("GET", `/docx/v1/documents/${documentId}`);
      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
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
      const result = await feishuApi("POST", "/drive/v1/files/search", payload);
      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
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
        `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
        undefined,
        { page_size: String(pageSize) }
      );
      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 追加内容块
  // POST /api/lark/doc/append
  // Body: { document_id, blocks: [{ block_type, content? }] }
  //
  // 特殊处理：table block (block_type: 31) 不支持嵌套 children，
  // 需要先创建 table，再创建 cell blocks，最后更新 table.cells
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

      const results: any[] = [];
      let normalBatch: any[] = [];

      for (const block of blocks) {
        if (block.block_type === 31 && Array.isArray(block._cell_contents) && block._cell_contents.length > 0) {
          // 先提交前面的普通 blocks
          if (normalBatch.length > 0) {
            const r = await feishuApi(
              "POST",
              `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
              { children: normalBatch }
            );
            results.push(r);
            if (r.code !== 0) {
              sendJson(res, 400, r);
              return;
            }
            normalBatch = [];
          }

          // 创建 table（多步：table → cells → update cells）
          const tableResult = await createTableBlock(documentId, block);
          results.push(tableResult);
          if (tableResult.code !== 0) {
            sendJson(res, 400, tableResult);
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
          { children: normalBatch }
        );
        results.push(r);
        if (r.code !== 0) {
          sendJson(res, 400, r);
          return;
        }
      }

      sendJson(res, 200, {
        code: 0,
        msg: "success",
        data: { results },
      });
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  /** 创建 table block（两步：创建空 table → GET cell → PATCH auto-generated text child）
   *  用 PATCH update_text_elements 更新飞书自动生成的空 text child，消除空 child 副作用。
   */
  async function createTableBlock(documentId: string, tableBlock: any): Promise<any> {
    const cellContents: any[][] = tableBlock._cell_contents || [];
    const { _cell_contents: _, ...tableData } = tableBlock;

    // 1. 创建 table block（只含 property，不含 _cell_contents）
    const tableResult = await feishuApi(
      "POST",
      `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
      { children: [tableData] }
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

      // QPS 保护：每 3 个 cell 后延时 400ms（每个 cell 2 个请求）
      if (i > 0 && i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }

      // 2a. GET cell 获取 auto-generated text child
      const cellResult = await feishuApi(
        "GET",
        `/docx/v1/documents/${documentId}/blocks/${cellId}`
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
        { update_text_elements: { elements } }
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
        // 对 elements 进行深度修复，转换数学公式节点
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

        // 如果是代码块，需要确保 language 被正确映射
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
      // 过滤 block_type，飞书 PATCH /blocks/{id} 不需要此字段
      const { document_id, block_id, block_type, ...updateData } = body;

      if (!document_id || !block_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 document_id 或 block_id 参数" });
        return;
      }

      structuredLog.info("lark.doc.update_block", "更新文档块", { document_id, block_id });
      const patchBody = convertPatchBody(updateData);
      const result = await feishuApi(
        "PATCH",
        `/docx/v1/documents/${document_id}/blocks/${block_id}`,
        patchBody
      );
      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
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

      // 1. 获取父块（文档根 Page）的所有子块，查找目标索引
      const listResult = await feishuApi(
        "GET",
        `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
        undefined,
        { page_size: "500" }
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
        { start_index: index, end_index: index + 1 }
      );
      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
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
      sendJson(res, result.code === 0 ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 用户: 搜索/查找
  // POST /api/lark/user/search
  // Body: { query?, email? }
  // ============================================
  server.middlewares.use("/api/lark/user/search", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);

      if (body.email) {
        // 通过邮箱查找用户
        const result = await feishuApi("POST", "/contact/v3/users/batch_get_id", {
          emails: Array.isArray(body.email) ? body.email : [String(body.email)],
        });
        sendJson(res, result.code === 0 ? 200 : 400, result);
        return;
      }

      if (body.query) {
        // 搜索用户
        const result = await feishuApi("GET", "/contact/v3/users", undefined, {
          query: String(body.query),
          page_size: "20",
        });
        sendJson(res, result.code === 0 ? 200 : 400, result);
        return;
      }

      sendJson(res, 400, { code: -1, msg: "缺少 query 或 email 参数" });
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
