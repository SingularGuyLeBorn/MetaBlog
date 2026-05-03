/**
 * ============================================================================
 * 内部业务路由 - voice (语音合成与识别)
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范.
 *
 * 提供 TTS(文本转语音)和 ASR(语音转文本)的 HTTP 端点.
 * 底层依赖 Piper(本地 TTS)和 whisper.cpp(本地 ASR),完全离线.
 *
 * @module server/routes/internal
 */


import type { ViteDevServer } from "vite";
import fs from "fs";
import path from "path";
import { synthesizeSpeech, getTTSStatus, cleanupTTSFile } from "../../services/tts";
import { transcribeSpeech, getASRStatus } from "../../services/asr";

interface ServerContext {
  system: any;
}

// 上传文件临时目录(ASR 音频上传用)
const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads", "voice", "asr");

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * 解析 multipart/form-data(简化版,用于音频文件上传)
 * 与 ocr.ts 中的实现保持一致,避免引入额外依赖.
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

          const nameMatch = header.match(/name="([^"]+)"/);
          const filenameMatch = header.match(/filename="([^"]+)"/);
          const typeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);

          if (filenameMatch && nameMatch) {
            const filename = filenameMatch[1];
            const partHeader = `Content-Disposition: form-data; name="${nameMatch[1]}"; filename="${filename}"`;
            const partStart = data.indexOf(Buffer.from(partHeader, "binary"));
            const contentStart = data.indexOf(Buffer.from("\r\n\r\n", "binary"), partStart) + 4;
            const nextBoundary = data.indexOf(Buffer.from(`\r\n--${boundary}`, "binary"), contentStart);
            const fileData = data.slice(contentStart, nextBoundary);

            file = {
              filename,
              data: fileData,
              mimetype: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
            };
          } else if (nameMatch) {
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

/**
 * 注册语音服务路由
 *
 * POST /api/tts    — 文本转语音,返回 audio/wav 流
 * POST /api/asr    — 上传音频文件进行语音识别,返回 JSON 文本
 * GET  /api/voice/status — 查看 TTS/ASR 引擎可用性
 *
 * @param server - Vite 开发服务器实例
 * @param _ctx   - 路由上下文(预留)
 */
export function registerVoiceRoutes(server: ViteDevServer, _ctx: ServerContext) {
  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/tts — 文本转语音
  // ═══════════════════════════════════════════════════════════════════════════
  server.middlewares.use("/api/tts", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }

    try {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", resolve);
        req.on("error", reject);
      });

      const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
      const text = body.text;
      const format = body.format || "stream"; // "stream" | "json"

      if (!text || typeof text !== "string") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "缺少 text 参数或类型错误" }));
        return;
      }

      const result = await synthesizeSpeech({ text });

      if (!result.success || !result.audioPath) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: result.error || "TTS 合成失败" }));
        return;
      }

      if (format === "json") {
        // 返回 Base64,方便前端直接嵌入 data URL
        const audioBuffer = fs.readFileSync(result.audioPath);
        const base64 = audioBuffer.toString("base64");

        // 发送后异步清理
        cleanupTTSFile(result.audioPath);

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: true,
          data: {
            audioBase64: base64,
            mimeType: result.mimeType,
            size: audioBuffer.length,
          },
        }));
        return;
      }

      // 默认: 直接返回音频流(前端 <audio> 标签可直接播放)
      const audioBuffer = fs.readFileSync(result.audioPath);
      res.setHeader("Content-Type", result.mimeType);
      res.setHeader("Content-Length", audioBuffer.length);
      res.setHeader("Content-Disposition", "inline; filename=tts-output.wav");
      res.end(audioBuffer);

      // 发送完成后异步清理临时文件
      cleanupTTSFile(result.audioPath);
    } catch (err: any) {
      console.error("[Voice] TTS 路由处理失败:", err.message);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/asr — 语音转文本
  // ═══════════════════════════════════════════════════════════════════════════
  server.middlewares.use("/api/asr", async (req, res, next) => {
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
        res.end(JSON.stringify({ success: false, error: "未上传音频文件" }));
        return;
      }

      // 检查文件类型
      const allowedTypes = [
        "audio/wav", "audio/x-wav", "audio/wave",
        "audio/mpeg", "audio/mp3",
        "audio/mp4", "audio/x-m4a",
        "audio/ogg", "audio/opus",
        "audio/webm",
      ];
      const ext = path.extname(parsed.file.filename).toLowerCase();
      const validExts = [".wav", ".mp3", ".m4a", ".ogg", ".opus", ".webm"];

      if (!allowedTypes.includes(parsed.file.mimetype) && !validExts.includes(ext)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: false,
          error: `不支持的音频格式: ${parsed.file.mimetype} (${ext}). 支持: wav, mp3, m4a, ogg, opus, webm`,
        }));
        return;
      }

      // 保存临时文件(统一转为 .wav 扩展名,whisper 对 wav 支持最好)
      const tempName = `asr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.wav`;
      const tempPath = path.join(UPLOAD_DIR, tempName);
      fs.writeFileSync(tempPath, parsed.file.data);

      const language = parsed.fields.language || "zh";

      // 调用 ASR 服务
      const result = await transcribeSpeech({ audioPath: tempPath, language });

      // 清理临时文件(异步,不阻塞响应)
      fs.unlink(tempPath, (err) => {
        if (err) console.error("[Voice] 清理临时音频文件失败:", err.message);
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
      console.error("[Voice] ASR 路由处理失败:", err.message);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/voice/status — 查看语音引擎状态
  // ═══════════════════════════════════════════════════════════════════════════
  server.middlewares.use("/api/voice/status", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }

    try {
      const [ttsStatus, asrStatus] = await Promise.all([
        getTTSStatus(),
        getASRStatus(),
      ]);

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: true,
        data: {
          tts: {
            available: ttsStatus.piperAvailable && ttsStatus.modelAvailable,
            ...ttsStatus,
          },
          asr: {
            available: asrStatus.cliAvailable && asrStatus.modelAvailable,
            ...asrStatus,
          },
        },
      }));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}
