/**
 * OCR 路由
 *
 * 提供图片 OCR 提取接口，供前端在 DeepSeek 等非多模态模型对话中使用。
 *
 * POST /api/ocr
 *   - 上传图片文件，自动调用 OCR 引擎提取文本
 *   - 引擎优先级: PaddleOCR → Tesseract → OCR.space（自动降级）
 *
 * GET /api/ocr/status
 *   - 查看各 OCR 引擎的可用性状态
 */

import type { ViteDevServer } from "vite";
import fs from "fs";
import path from "path";
import { performOCR, getOCRStatus } from "../../services/ocr";

interface ServerContext {
  system: any;
}

// 上传文件临时目录
const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads", "ocr");

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * 解析 multipart/form-data（简化版，用于图片上传）
 */
function parseMultipart(req: any): Promise<{ fields: Record<string, string>; file?: { filename: string; data: Buffer; mimetype: string } }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      reject(new Error("Content-Type must be multipart/form-data"));
      return;
    }

    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      reject(new Error("Missing boundary in Content-Type"));
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const data = Buffer.concat(chunks);
        const parts = data.toString("binary").split(`--${boundary}`);
        const fields: Record<string, string> = {};
        let file: { filename: string; data: Buffer; mimetype: string } | undefined;

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed || trimmed === "--") continue;

          const headerEnd = trimmed.indexOf("\r\n\r\n");
          if (headerEnd === -1) continue;

          const header = trimmed.substring(0, headerEnd);
          const body = trimmed.substring(headerEnd + 4);

          // 解析 Content-Disposition
          const nameMatch = header.match(/name="([^"]+)"/);
          const filenameMatch = header.match(/filename="([^"]+)"/);
          const typeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);

          if (filenameMatch && nameMatch) {
            // 文件字段
            const filename = filenameMatch[1];
            // 从原始 binary 数据中提取文件内容（避免 toString 编码问题）
            const bodyStart = data.indexOf(Buffer.from(`\r\n\r\n`, "binary"), data.indexOf(Buffer.from(`filename="${filename}"`, "binary")));
            if (bodyStart !== -1) {
              // 重新精确定位这个 part 在原始 buffer 中的位置
              const partHeader = `Content-Disposition: form-data; name="${nameMatch[1]}"; filename="${filename}"`;
              const partStart = data.indexOf(Buffer.from(partHeader, "binary"));
              const contentStart = data.indexOf(Buffer.from("\r\n\r\n", "binary"), partStart) + 4;

              // 找到下一个 boundary 的位置
              const nextBoundary = data.indexOf(Buffer.from(`\r\n--${boundary}`, "binary"), contentStart);
              const fileData = data.slice(contentStart, nextBoundary);

              file = {
                filename,
                data: fileData,
                mimetype: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
              };
            }
          } else if (nameMatch) {
            // 普通字段
            fields[nameMatch[1]] = body.trim();
          }
        }

        resolve({ fields, file });
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function registerOCRRoutes(server: ViteDevServer, _ctx: ServerContext) {
  // POST /api/ocr — 上传图片进行 OCR
  server.middlewares.use("/api/ocr", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }

    try {
      ensureUploadDir();
      const parsed = await parseMultipart(req);

      if (!parsed.file) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "未上传图片文件" }));
        return;
      }

      // 检查文件类型
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/bmp"];
      if (!allowedTypes.includes(parsed.file.mimetype)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: false,
          error: `不支持的文件类型: ${parsed.file.mimetype}。仅支持: ${allowedTypes.join(", ")}`,
        }));
        return;
      }

      // 保存临时文件
      const ext = path.extname(parsed.file.filename) || ".png";
      const tempName = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const tempPath = path.join(UPLOAD_DIR, tempName);
      fs.writeFileSync(tempPath, parsed.file.data);

      // 调用 OCR 服务
      const language = parsed.fields.language || "auto";
      const result = await performOCR({ imagePath: tempPath, language });

      // 清理临时文件（异步，不阻塞响应）
      fs.unlink(tempPath, (err) => {
        if (err) console.error("[OCR] 清理临时文件失败:", err.message);
      });

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: result.success,
        data: {
          text: result.text,
          engine: result.engine,
        },
        error: result.error || undefined,
      }));
    } catch (err: any) {
      console.error("[OCR] 处理请求失败:", err.message);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });

  // GET /api/ocr/status — 查看 OCR 引擎状态
  server.middlewares.use("/api/ocr/status", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }

    try {
      const status = await getOCRStatus();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: true,
        data: {
          engines: status,
          recommended: status.find((s) => s.available)?.name || "none",
        },
      }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}
