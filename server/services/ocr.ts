/**
 * OCR 服务模块
 *
 * 三引擎自动降级策略：
 *   1. PaddleOCR — 本地最强中文 OCR（需 pip install paddleocr）
 *   2. Tesseract — 本地轻量降级（需安装 tesseract-ocr + pip install pytesseract）
 *   3. OCR.space — 云端兜底（需 API Key，免费 25K/月）
 *
 * 降级顺序：PaddleOCR → Tesseract → OCR.space → 失败返回提示
 */

import fs from "fs";
import https from "https";
import http from "http";
import { URL } from "url";
import FormData from "form-data";
import { spawn } from "child_process";
import path from "path";

// 上传文件临时目录
const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads", "ocr");

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/** 根据 URL 获取对应的 Referer（绕过防盗链） */
function getRefererForUrl(url: string): string {
  if (url.includes("mmbiz.qpic.cn") || url.includes("mmbiz.qlogo.cn")) {
    return "https://mp.weixin.qq.com/";
  }
  if (url.includes("zhimg.com")) {
    return "https://zhuanlan.zhihu.com/";
  }
  if (url.includes("byteimg.com")) {
    return "https://www.toutiao.com/";
  }
  return "";
}

/** 后端下载远程图片到临时文件 */
export async function downloadImageToTemp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const protocol = parsed.protocol === "https:" ? https : http;
    const referer = getRefererForUrl(url);

    const ext = path.extname(parsed.pathname) || ".png";
    const tempName = `ocr_dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const tempPath = path.join(UPLOAD_DIR, tempName);

    const request = protocol.request(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
          Referer: referer,
        },
        timeout: 15000,
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`上游返回 HTTP ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          try {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(tempPath, buffer);
            resolve(tempPath);
          } catch (err: any) {
            reject(new Error(`保存临时文件失败: ${err.message}`));
          }
        });
      }
    );

    request.on("error", (err) => reject(new Error(`下载失败: ${err.message}`)));
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("下载超时"));
    });
    request.end();
  });
}

/** 对远程图片 URL 执行 OCR（下载 + 识别，自动清理临时文件） */
export async function ocrRemoteImage(url: string, language = "auto"): Promise<OCRResult> {
  ensureUploadDir();
  const tempPath = await downloadImageToTemp(url);
  try {
    const result = await performOCR({ imagePath: tempPath, language });
    return result;
  } finally {
    fs.unlink(tempPath, (err) => {
      if (err) console.error("[OCR] 清理临时文件失败:", err.message);
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═════════════════════════════════════════════════════════════════════════════

export interface OCROptions {
  /** 图片文件路径 */
  imagePath: string;
  /** 语言，默认 auto（让引擎自己判断） */
  language?: string;
}

export interface OCRResult {
  /** 提取的文本 */
  text: string;
  /** 使用的引擎 */
  engine: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  error?: string;
  /** 原始引擎输出（调试用） */
  raw?: any;
}

// ═════════════════════════════════════════════════════════════════════════════
// 配置
// ═════════════════════════════════════════════════════════════════════════════

function env(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

const OCR_CONFIG = {
  // OCR.space API Key（从环境变量读取）
  ocrSpaceApiKey: env("OCR_SPACE_API_KEY", ""),
  // OCR.space 默认语言
  ocrSpaceDefaultLang: env("OCR_SPACE_DEFAULT_LANG", "chs"),
  // PaddleOCR 语言包映射
  paddleLangMap: {
    auto: "ch",
    chs: "ch",
    cht: "ch",
    en: "en",
    jpn: "japan",
    kor: "korean",
  } as Record<string, string>,
  // PaddleOCR CLI 脚本路径
  paddleCliPath: env("PADDLEOCR_CLI_PATH", path.join(process.cwd(), "project/experiments/paddleocr-test/paddleocr_cli.py")),
  // 默认使用 baseenv 的 Python 3.11（PaddleOCR 2.7.3 安装在此环境中）
  paddlePythonPath: env(
    "PADDLEOCR_PYTHON_PATH",
    process.platform === "win32"
      ? "d:\\python-envs\\baseenv\\Scripts\\python.exe"
      : "python"
  ),
  // Tesseract 语言包映射
  tesseractLangMap: {
    auto: "chi_sim+eng",
    chs: "chi_sim",
    cht: "chi_tra",
    en: "eng",
    jpn: "jpn",
    kor: "kor",
  } as Record<string, string>,
};

// ═════════════════════════════════════════════════════════════════════════════
// 引擎 1: PaddleOCR (通过 CLI 脚本调用 Python paddleocr 2.7.3)
// ═════════════════════════════════════════════════════════════════════════════

async function ocrWithPaddleOCR(imagePath: string, lang: string): Promise<OCRResult> {
  const startTime = Date.now();

  // 检查 CLI 脚本是否存在
  if (!fs.existsSync(OCR_CONFIG.paddleCliPath)) {
    return {
      text: "",
      engine: "PaddleOCR",
      success: false,
      error: `PaddleOCR CLI 脚本未找到: ${OCR_CONFIG.paddleCliPath}`,
    };
  }

  const paddleLang = OCR_CONFIG.paddleLangMap[lang] || "ch";

  return new Promise<OCRResult>((resolve) => {
    const proc = spawn(OCR_CONFIG.paddlePythonPath, [
      OCR_CONFIG.paddleCliPath,
      imagePath,
      paddleLang,
    ]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        console.error(`[OCR] PaddleOCR CLI 退出码 ${code}: ${stderr}`);
        resolve({
          text: "",
          engine: "PaddleOCR",
          success: false,
          error: `PaddleOCR CLI 失败 (exit ${code}): ${stderr || "未知错误"}`,
        });
        return;
      }

      try {
        // PaddleOCR 2.x 会把 warning 日志输出到 stdout，需要提取 JSON 部分
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(stdout.trim());
        if (!result.success) {
          resolve({
            text: "",
            engine: "PaddleOCR",
            success: false,
            error: result.error || "PaddleOCR 识别失败",
          });
          return;
        }

        const text = result.data?.text || "";
        const lines = result.data?.lines || [];
        console.log(`[OCR] PaddleOCR 成功，耗时 ${Date.now() - startTime}ms，提取 ${lines.length} 行`);
        resolve({ text, engine: "PaddleOCR", success: true, raw: result.data });
      } catch (parseErr: any) {
        resolve({
          text: "",
          engine: "PaddleOCR",
          success: false,
          error: `PaddleOCR 输出解析失败: ${parseErr.message}\n原始输出: ${stdout.slice(0, 500)}`,
        });
      }
    });

    proc.on("error", (err: Error) => {
      resolve({
        text: "",
        engine: "PaddleOCR",
        success: false,
        error: `PaddleOCR 进程启动失败: ${err.message}`,
      });
    });

    // 超时保护（30秒）
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        text: "",
        engine: "PaddleOCR",
        success: false,
        error: "PaddleOCR 识别超时（30秒）",
      });
    }, 30000);

    proc.on("close", () => clearTimeout(timeout));
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 引擎 2: Tesseract
// ═════════════════════════════════════════════════════════════════════════════

async function ocrWithTesseract(imagePath: string, lang: string): Promise<OCRResult> {
  const startTime = Date.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pytesseract = require("pytesseract");
    if (!pytesseract) {
      return {
        text: "",
        engine: "Tesseract",
        success: false,
        error: "pytesseract 未安装。请运行: pip install pytesseract",
      };
    }

    // 检查 tesseract 可执行文件是否可用
    try {
      pytesseract.get_tesseract_version();
    } catch {
      return {
        text: "",
        engine: "Tesseract",
        success: false,
        error:
          "Tesseract OCR 引擎未安装。\n" +
          "Windows: 下载安装包 https://github.com/UB-Mannheim/tesseract/wiki\n" +
          "macOS: brew install tesseract tesseract-lang\n" +
          "Ubuntu: apt install tesseract-ocr tesseract-ocr-chi-sim",
      };
    }

    const tessLang = OCR_CONFIG.tesseractLangMap[lang] || "chi_sim+eng";
    const text = pytesseract.image_to_string(imagePath, { lang: tessLang });

    console.log(`[OCR] Tesseract 成功，耗时 ${Date.now() - startTime}ms`);
    return { text: text.trim(), engine: "Tesseract", success: true };
  } catch (err: any) {
    console.error(`[OCR] Tesseract 失败:`, err.message);
    return { text: "", engine: "Tesseract", success: false, error: err.message };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 引擎 3: OCR.space
// ═════════════════════════════════════════════════════════════════════════════

async function ocrWithOCRSpace(imagePath: string, lang: string): Promise<OCRResult> {
  const startTime = Date.now();
  try {
    if (!OCR_CONFIG.ocrSpaceApiKey) {
      return {
        text: "",
        engine: "OCR.space",
        success: false,
        error:
          "OCR.space API Key 未配置。\n" +
          "1. 访问 https://ocr.space/ocrapi/freekey 注册获取免费 API Key\n" +
          "2. 在 .env 中添加: OCR_SPACE_API_KEY=your_key_here",
      };
    }

    const form = new FormData();
    form.append("apikey", OCR_CONFIG.ocrSpaceApiKey);
    form.append("language", lang === "auto" ? OCR_CONFIG.ocrSpaceDefaultLang : lang);
    form.append("isOverlayRequired", "false");
    form.append("file", fs.createReadStream(imagePath));
    form.append("detectOrientation", "true");
    form.append("scale", "true");

    const response = await new Promise<any>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.ocr.space",
          path: "/parse/image",
          method: "POST",
          headers: {
            ...form.getHeaders(),
          },
          timeout: 30000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve({ OCRExitCode: -1, ErrorMessage: ["Invalid JSON response: " + data] });
            }
          });
        }
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("OCR.space API 请求超时"));
      });
      form.pipe(req);
    });

    if (response.OCRExitCode !== 1) {
      const errorMsg = response.ErrorMessage?.join(", ") || response.ErrorDetails || "Unknown error";
      return {
        text: "",
        engine: "OCR.space",
        success: false,
        error: `OCR.space API 错误: ${errorMsg}`,
      };
    }

    const parsedResults = response.ParsedResults || [];
    const text = parsedResults.map((r: any) => r.ParsedText).join("\n\n").trim();

    console.log(
      `[OCR] OCR.space 成功，耗时 ${Date.now() - startTime}ms，处理 ${parsedResults.length} 个区域`
    );
    return { text, engine: "OCR.space", success: true, raw: response };
  } catch (err: any) {
    console.error(`[OCR] OCR.space 失败:`, err.message);
    return { text: "", engine: "OCR.space", success: false, error: err.message };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 主入口: 自动降级执行
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 执行 OCR，自动按优先级降级
 *
 * 顺序: PaddleOCR → Tesseract → OCR.space
 */
export async function performOCR(options: OCROptions): Promise<OCRResult> {
  const { imagePath, language = "auto" } = options;

  // 验证文件
  if (!fs.existsSync(imagePath)) {
    return { text: "", engine: "none", success: false, error: `文件不存在: ${imagePath}` };
  }

  const stats = fs.statSync(imagePath);
  if (!stats.isFile()) {
    return { text: "", engine: "none", success: false, error: `不是有效文件: ${imagePath}` };
  }

  // 文件大小限制 (10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (stats.size > MAX_SIZE) {
    return {
      text: "",
      engine: "none",
      success: false,
      error: `文件过大 (${(stats.size / 1024 / 1024).toFixed(1)}MB)，最大支持 10MB`,
    };
  }

  const engines: Array<{
    name: string;
    fn: (path: string, lang: string) => Promise<OCRResult>;
  }> = [
    { name: "PaddleOCR", fn: ocrWithPaddleOCR },
    { name: "Tesseract", fn: ocrWithTesseract },
    { name: "OCR.space", fn: ocrWithOCRSpace },
  ];

  const errors: string[] = [];

  for (const engine of engines) {
    console.log(`[OCR] 尝试引擎: ${engine.name}`);
    const result = await engine.fn(imagePath, language);

    if (result.success && result.text) {
      console.log(`[OCR] ✓ ${engine.name} 成功提取文本`);
      return result;
    }

    if (result.error) {
      errors.push(`${engine.name}: ${result.error}`);
    }
  }

  // 所有引擎都失败了
  const combinedError = errors.join("\n");
  console.error(`[OCR] ✗ 所有引擎均失败:\n${combinedError}`);
  return {
    text: "",
    engine: "none",
    success: false,
    error: `所有 OCR 引擎均失败。\n${combinedError}`,
  };
}

/**
 * 获取 OCR 服务状态（各引擎可用性）
 */
export async function getOCRStatus(): Promise<
  Array<{ name: string; available: boolean; reason?: string }>
> {
  const results = [];

  // PaddleOCR (CLI 脚本方式)
  if (fs.existsSync(OCR_CONFIG.paddleCliPath)) {
    results.push({ name: "PaddleOCR", available: true });
  } else {
    results.push({
      name: "PaddleOCR",
      available: false,
      reason: `CLI 脚本未找到: ${OCR_CONFIG.paddleCliPath}。请配置 PADDLEOCR_CLI_PATH 环境变量`,
    });
  }

  // Tesseract
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pytesseract = require("pytesseract");
    pytesseract.get_tesseract_version();
    results.push({ name: "Tesseract", available: true });
  } catch {
    results.push({
      name: "Tesseract",
      available: false,
      reason: "未安装 pytesseract 或 Tesseract 引擎未安装",
    });
  }

  // OCR.space
  if (OCR_CONFIG.ocrSpaceApiKey) {
    results.push({ name: "OCR.space", available: true });
  } else {
    results.push({
      name: "OCR.space",
      available: false,
      reason: "未配置 OCR_SPACE_API_KEY。请在 .env 中添加",
    });
  }

  return results;
}
