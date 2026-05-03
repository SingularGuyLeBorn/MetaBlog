/**
 * ============================================================================
 * 后端服务 - tts (文本转语音)
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范.
 *
 * 基于 Piper 本地 TTS 引擎,完全离线运行,零 API 费用.
 * Piper 项目地址: https://github.com/rhasspy/piper
 *
 * @module server/services
 */


import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// ═════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═════════════════════════════════════════════════════════════════════════════

export interface TTSOptions {
  /** 要合成的文本 */
  text: string;
  /** 输出文件名(不含扩展名),默认自动生成 */
  outputName?: string;
}

export interface TTSResult {
  /** 生成的音频文件绝对路径 */
  audioPath: string;
  /** 使用的引擎 */
  engine: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息(失败时) */
  error?: string;
  /** 音频 MIME 类型 */
  mimeType: string;
}

export interface TTSStatus {
  /** Piper 可执行文件是否可用 */
  piperAvailable: boolean;
  /** 模型文件是否就绪 */
  modelAvailable: boolean;
  /** 配置信息 */
  info?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// 配置
// ═════════════════════════════════════════════════════════════════════════════

function env(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

/** 语音合成输出目录(同时作为 HTTP 可访问的静态资源) */
const TTS_OUTPUT_DIR = path.join(process.cwd(), ".data", "uploads", "voice", "tts");

const TTS_CONFIG = {
  /** Piper 可执行文件路径 */
  piperPath: env(
    "PIPER_PATH",
    process.platform === "win32"
      ? path.join(process.cwd(), "tools", "piper", "piper.exe")
      : path.join(process.cwd(), "tools", "piper", "piper")
  ),
  /** Piper 语音模型路径(.onnx) */
  modelPath: env(
    "PIPER_MODEL_PATH",
    path.join(process.cwd(), "tools", "piper", "zh_CN-huayan-medium.onnx")
  ),
  /** Piper 模型配置文件路径(.json),可选 */
  configPath: env("PIPER_CONFIG_PATH", ""),
  /** 单次合成文本最大长度(字符) */
  maxTextLength: 5000,
  /** 合成超时(毫秒). Piper 在 CPU 上通常 1-3 秒完成短文本 */
  timeoutMs: 30000,
};

function ensureOutputDir(): void {
  if (!fs.existsSync(TTS_OUTPUT_DIR)) {
    fs.mkdirSync(TTS_OUTPUT_DIR, { recursive: true });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 核心: Piper TTS 合成
// ═════════════════════════════════════════════════════════════════════════════

/**
 * 使用 Piper 将文本合成为 WAV 音频.
 *
 * Piper 通过 stdin 接收文本,输出到指定文件.
 * 命令示例:
 *   echo "你好" | piper --model zh_CN-huayan-medium.onnx --output_file out.wav
 *
 * @param options - 合成参数
 * @returns 合成结果,包含音频文件路径
 */
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> {
  const startTime = Date.now();
  const { text, outputName } = options;

  // ── 参数校验 ──
  if (!text || !text.trim()) {
    return {
      audioPath: "",
      engine: "Piper",
      success: false,
      error: "合成文本不能为空",
      mimeType: "audio/wav",
    };
  }

  if (text.length > TTS_CONFIG.maxTextLength) {
    return {
      audioPath: "",
      engine: "Piper",
      success: false,
      error: `文本过长 (${text.length} 字符),最大支持 ${TTS_CONFIG.maxTextLength} 字符`,
      mimeType: "audio/wav",
    };
  }

  // ── 检查 Piper 可执行文件 ──
  if (!fs.existsSync(TTS_CONFIG.piperPath)) {
    return {
      audioPath: "",
      engine: "Piper",
      success: false,
      error: `Piper 可执行文件未找到: ${TTS_CONFIG.piperPath}. 请下载并配置 PIPER_PATH 环境变量`,
      mimeType: "audio/wav",
    };
  }

  // ── 检查模型文件 ──
  if (!fs.existsSync(TTS_CONFIG.modelPath)) {
    return {
      audioPath: "",
      engine: "Piper",
      success: false,
      error: `Piper 模型文件未找到: ${TTS_CONFIG.modelPath}. 请下载并配置 PIPER_MODEL_PATH 环境变量`,
      mimeType: "audio/wav",
    };
  }

  ensureOutputDir();

  const safeName = outputName || `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const outputPath = path.join(TTS_OUTPUT_DIR, `${safeName}.wav`);

  return new Promise<TTSResult>((resolve) => {
    const args: string[] = [
      "--model", TTS_CONFIG.modelPath,
      "--output_file", outputPath,
    ];

    // 如果提供了独立的 config 文件则追加(部分模型需要)
    if (TTS_CONFIG.configPath && fs.existsSync(TTS_CONFIG.configPath)) {
      args.push("--config", TTS_CONFIG.configPath);
    }

    const proc = spawn(TTS_CONFIG.piperPath, args);

    let stderr = "";

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    // 将文本写入 stdin,然后关闭
    proc.stdin.write(text, "utf-8", (err) => {
      if (err) {
        console.error("[TTS] 写入 stdin 失败:", err.message);
      }
      proc.stdin.end();
    });

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        console.error(`[TTS] Piper 退出码 ${code}: ${stderr}`);
        resolve({
          audioPath: "",
          engine: "Piper",
          success: false,
          error: `Piper 合成失败 (exit ${code}): ${stderr || "未知错误"}`,
          mimeType: "audio/wav",
        });
        return;
      }

      // 验证输出文件
      if (!fs.existsSync(outputPath)) {
        resolve({
          audioPath: "",
          engine: "Piper",
          success: false,
          error: "Piper 未生成音频文件",
          mimeType: "audio/wav",
        });
        return;
      }

      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        resolve({
          audioPath: "",
          engine: "Piper",
          success: false,
          error: "Piper 生成的音频文件为空",
          mimeType: "audio/wav",
        });
        return;
      }

      console.log(`[TTS] Piper 合成成功,耗时 ${Date.now() - startTime}ms,输出 ${stats.size} bytes`);
      resolve({
        audioPath: outputPath,
        engine: "Piper",
        success: true,
        mimeType: "audio/wav",
      });
    });

    proc.on("error", (err: Error) => {
      resolve({
        audioPath: "",
        engine: "Piper",
        success: false,
        error: `Piper 进程启动失败: ${err.message}`,
        mimeType: "audio/wav",
      });
    });

    // 超时保护
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        audioPath: "",
        engine: "Piper",
        success: false,
        error: `Piper 合成超时(${TTS_CONFIG.timeoutMs}ms)`,
        mimeType: "audio/wav",
      });
    }, TTS_CONFIG.timeoutMs);

    proc.on("close", () => clearTimeout(timeout));
  });
}

/**
 * 获取 TTS 服务状态(Piper 可用性检测)
 */
export async function getTTSStatus(): Promise<TTSStatus> {
  const piperAvailable = fs.existsSync(TTS_CONFIG.piperPath);
  const modelAvailable = fs.existsSync(TTS_CONFIG.modelPath);

  let info = "";
  if (!piperAvailable) {
    info = `Piper 可执行文件未找到: ${TTS_CONFIG.piperPath}`;
  } else if (!modelAvailable) {
    info = `模型文件未找到: ${TTS_CONFIG.modelPath}`;
  } else {
    info = `就绪. 模型: ${path.basename(TTS_CONFIG.modelPath)}`;
  }

  return { piperAvailable, modelAvailable, info };
}

/**
 * 清理指定 TTS 输出文件.
 * 建议前端确认播放完成后再调用,避免删除正在使用的文件.
 */
export function cleanupTTSFile(audioPath: string): void {
  if (fs.existsSync(audioPath)) {
    fs.unlink(audioPath, (err) => {
      if (err) console.error("[TTS] 清理音频文件失败:", err.message);
    });
  }
}
