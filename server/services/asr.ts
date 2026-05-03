/**
 * ============================================================================
 * 后端服务 - asr (自动语音识别)
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范.
 *
 * 基于 whisper.cpp 本地 ASR 引擎,完全离线运行,零 API 费用.
 * whisper.cpp 项目地址: https://github.com/ggerganov/whisper.cpp
 *
 * @module server/services
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// ═════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═════════════════════════════════════════════════════════════════════════════

export interface ASROptions {
  /** 音频文件绝对路径(支持 wav/mp3/m4a/ogg 等) */
  audioPath: string;
  /** 语言代码,默认中文(zh). whisper 支持 auto 自动检测,但指定语言更准 */
  language?: string;
}

export interface ASRResult {
  /** 识别出的文本 */
  text: string;
  /** 使用的引擎 */
  engine: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息(失败时) */
  error?: string;
  /** 原始引擎输出(调试用) */
  raw?: any;
}

export interface ASRStatus {
  /** whisper-cli/main 可执行文件是否可用 */
  cliAvailable: boolean;
  /** 模型文件是否就绪 */
  modelAvailable: boolean;
  /** 检测到的可执行文件名 */
  cliName?: string;
  /** 配置信息 */
  info?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 配置
// ═════════════════════════════════════════════════════════════════════════════

function env(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

const ASR_CONFIG = {
  /** whisper.cpp 可执行文件路径. 新版: whisper-cli,旧版: main */
  whisperPath: env(
    "WHISPER_CLI_PATH",
    process.platform === "win32"
      ? path.join(process.cwd(), "vendor", "whisper", "whisper-cli.exe")
      : path.join(process.cwd(), "vendor", "whisper", "whisper-cli")
  ),
  /** 备选可执行文件名(旧版 whisper.cpp) */
  whisperFallbackPath: env(
    "WHISPER_FALLBACK_PATH",
    process.platform === "win32"
      ? path.join(process.cwd(), "vendor", "whisper", "main.exe")
      : path.join(process.cwd(), "vendor", "whisper", "main")
  ),
  /** Whisper 模型路径(ggml 格式) */
  modelPath: env(
    "WHISPER_MODEL_PATH",
    path.join(process.cwd(), "vendor", "whisper", "ggml-tiny.bin")
  ),
  /** 音频文件大小限制(50MB) */
  maxFileSize: 50 * 1024 * 1024,
  /** 识别超时(毫秒). 短音频通常 5-15 秒 */
  timeoutMs: 120000,
};

/**
 * 查找实际可用的 whisper 可执行文件.
 * 优先 whisper-cli(新版),回退到 main(旧版).
 */
function findWhisperExecutable(): { path: string; name: string } | null {
  if (fs.existsSync(ASR_CONFIG.whisperPath)) {
    return { path: ASR_CONFIG.whisperPath, name: path.basename(ASR_CONFIG.whisperPath) };
  }
  if (fs.existsSync(ASR_CONFIG.whisperFallbackPath)) {
    return { path: ASR_CONFIG.whisperFallbackPath, name: path.basename(ASR_CONFIG.whisperFallbackPath) };
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 核心: Whisper ASR 识别
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 使用 whisper.cpp 将音频转为文本.
 *
 * 命令示例:
 *   whisper-cli -m ggml-tiny.bin -f audio.wav -l zh --output-json
 *
 * 这会生成 audio.wav.json,解析其中的 transcription 数组获取文本.
 *
 * @param options - 识别参数
 * @returns 识别结果,包含文本内容
 */
export async function transcribeSpeech(options: ASROptions): Promise<ASRResult> {
  const startTime = Date.now();
  const { audioPath, language = "zh" } = options;

  // ── 参数校验 ──
  if (!audioPath || !fs.existsSync(audioPath)) {
    return {
      text: "",
      engine: "Whisper",
      success: false,
      error: `音频文件不存在: ${audioPath}`,
    };
  }

  const stats = fs.statSync(audioPath);
  if (!stats.isFile()) {
    return {
      text: "",
      engine: "Whisper",
      success: false,
      error: `不是有效文件: ${audioPath}`,
    };
  }

  if (stats.size > ASR_CONFIG.maxFileSize) {
    return {
      text: "",
      engine: "Whisper",
      success: false,
      error: `音频文件过大 (${(stats.size / 1024 / 1024).toFixed(1)}MB),最大支持 ${(ASR_CONFIG.maxFileSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  // ── 检查可执行文件 ──
  const executable = findWhisperExecutable();
  if (!executable) {
    const searched = [ASR_CONFIG.whisperPath, ASR_CONFIG.whisperFallbackPath].join(" 或 ");
    return {
      text: "",
      engine: "Whisper",
      success: false,
      error: `Whisper 可执行文件未找到. 已搜索: ${searched}. 请下载 whisper.cpp 并配置 WHISPER_CLI_PATH 环境变量`,
    };
  }

  // ── 检查模型文件 ──
  if (!fs.existsSync(ASR_CONFIG.modelPath)) {
    return {
      text: "",
      engine: "Whisper",
      success: false,
      error: `Whisper 模型文件未找到: ${ASR_CONFIG.modelPath}. 请下载 ggml-tiny.bin 并配置 WHISPER_MODEL_PATH 环境变量`,
    };
  }

  // ── 构建输出 JSON 路径 ──
  const jsonOutputPath = `${audioPath}.json`;

  return new Promise<ASRResult>((resolve) => {
    const args: string[] = [
      "-m", ASR_CONFIG.modelPath,
      "-f", audioPath,
      "-l", language,
      "--output-json",
      "--no-prints",      // 不打印进度条,保持 stdout 干净
    ];

    const proc = spawn(executable.path, args);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    proc.on("close", (code: number | null) => {
      // 尝试读取 JSON 输出文件(whisper.cpp 的 --output-json 会生成 .json 文件)
      let transcriptionText = "";
      let rawData: any = null;

      try {
        if (fs.existsSync(jsonOutputPath)) {
          const jsonContent = fs.readFileSync(jsonOutputPath, "utf-8");
          rawData = JSON.parse(jsonContent);

          // 提取文本: transcription 数组中每个对象的 text 字段
          if (rawData.transcription && Array.isArray(rawData.transcription)) {
            transcriptionText = rawData.transcription
              .map((seg: any) => seg.text?.trim())
              .filter(Boolean)
              .join("");
          } else if (rawData.text) {
            // 某些版本直接输出 text
            transcriptionText = rawData.text.trim();
          }

          // 清理临时 JSON 文件
          fs.unlink(jsonOutputPath, (err) => {
            if (err) console.error("[ASR] 清理 JSON 输出文件失败:", err.message);
          });
        }
      } catch (parseErr: any) {
        console.error("[ASR] 解析 JSON 输出失败:", parseErr.message);
      }

      // 如果 JSON 文件解析成功且有文本,认为成功(即使 exit code 非 0 有时也是警告)
      if (transcriptionText) {
        console.log(`[ASR] Whisper 识别成功,耗时 ${Date.now() - startTime}ms,文本长度 ${transcriptionText.length}`);
        resolve({
          text: transcriptionText,
          engine: `Whisper (${executable.name})`,
          success: true,
          raw: rawData,
        });
        return;
      }

      // 确实失败了
      if (code !== 0) {
        console.error(`[ASR] Whisper 退出码 ${code}: ${stderr}`);
        resolve({
          text: "",
          engine: `Whisper (${executable.name})`,
          success: false,
          error: `Whisper 识别失败 (exit ${code}): ${stderr || "未知错误"}`,
        });
        return;
      }

      // 退出码 0 但没有文本 -> 音频可能是静音或无法识别
      resolve({
        text: "",
        engine: `Whisper (${executable.name})`,
        success: true,
        error: "未能识别出有效文本(可能是静音或背景噪音)",
      });
    });

    proc.on("error", (err: Error) => {
      resolve({
        text: "",
        engine: `Whisper (${executable.name})`,
        success: false,
        error: `Whisper 进程启动失败: ${err.message}`,
      });
    });

    // 超时保护
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        text: "",
        engine: `Whisper (${executable.name})`,
        success: false,
        error: `Whisper 识别超时(${ASR_CONFIG.timeoutMs}ms)`,
      });
    }, ASR_CONFIG.timeoutMs);

    proc.on("close", () => clearTimeout(timeout));
  });
}

/**
 * 获取 ASR 服务状态(Whisper 可用性检测)
 */
export async function getASRStatus(): Promise<ASRStatus> {
  const executable = findWhisperExecutable();
  const modelAvailable = fs.existsSync(ASR_CONFIG.modelPath);

  let info = "";
  if (!executable) {
    info = `Whisper 可执行文件未找到. 已搜索: ${ASR_CONFIG.whisperPath}, ${ASR_CONFIG.whisperFallbackPath}`;
  } else if (!modelAvailable) {
    info = `模型文件未找到: ${ASR_CONFIG.modelPath}`;
  } else {
    info = `就绪. 引擎: ${executable.name}, 模型: ${path.basename(ASR_CONFIG.modelPath)}`;
  }

  return {
    cliAvailable: !!executable,
    modelAvailable,
    cliName: executable?.name,
    info,
  };
}
