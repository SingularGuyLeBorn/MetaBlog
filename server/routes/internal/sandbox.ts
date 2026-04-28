/**
 * 代码沙箱执行路由
 *
 * 提供安全的代码执行能力，支持：
 * - Python(通过 Monty 解释器，硬件级隔离)
 * - JavaScript(通过独立子进程 + vm.runInNewContext)
 *
 * 安全原则：
 * 1. 所有代码在独立进程中执行，崩溃不影响主服务
 * 2. Python 通过 Monty 解释器运行，无文件系统/网络/环境变量访问
 * 3. JS 通过白名单全局上下文运行，无 Node 模块访问
 * 4. 强制超时(默认 30s)
 * 5. 输出大小限制(默认 1MB)
 */

import { spawn } from "child_process";
import type { Request, Response } from "express";
import * as path from "path";
import type { ViteDevServer } from "vite";

const EXEC_TIMEOUT = 30000;        // 30 秒执行超时
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB 输出上限
const SUPPORTED_LANGUAGES = ["python", "javascript", "typescript", "bash", "shell"];

/** 沙箱执行结果 */
interface SandboxResult {
  success: boolean;
  result?: any;
  stdout?: string;
  stderr?: string;
  error?: string;
  executionTime?: number;
}

/**
 * 注册沙箱路由
 */
export function registerSandboxRoutes(server: ViteDevServer) {
  server.middlewares.use("/api/sandbox/exec", async (req, res, next) => {
    if (req.method !== "POST") return next();
    await handleExec(req as Request, res as Response);
  });
  server.middlewares.use("/api/sandbox/status", async (req, res, next) => {
    if (req.method !== "GET") return next();
    await handleStatus(req as Request, res as Response);
  });
}

/**
 * POST /api/sandbox/exec
 * Body: { code: string, language: string, inputs?: Record<string, any> }
 */
async function handleExec(req: Request, res: Response) {
  const { code, language, inputs = {} } = req.body;

  // 参数校验
  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid 'code' field",
    });
  }

  const lang = (language || "").toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
    });
  }

  // 代码长度限制
  if (code.length > 50000) {
    return res.status(400).json({
      success: false,
      error: "Code exceeds maximum length of 50,000 characters",
    });
  }

  const startTime = Date.now();

  try {
    let result: SandboxResult;

    if (lang === "python") {
      result = await execPythonMonty(code, inputs);
    } else if (lang === "javascript" || lang === "typescript") {
      result = await execJavaScript(code, inputs);
    } else if (lang === "bash" || lang === "shell") {
      result = await execBash(code, inputs);
    } else {
      result = { success: false, error: `Language ${lang} not yet implemented` };
    }

    result.executionTime = Date.now() - startTime;
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Sandbox execution failed: ${error instanceof Error ? error.message : String(error)}`,
      executionTime: Date.now() - startTime,
    });
  }
}

/**
 * GET /api/sandbox/status
 * 检查沙箱环境健康状态
 */
function handleStatus(_req: Request, res: Response) {
  const checks: Record<string, boolean> = {
    python: false,
    monty: false,
    nodejs: true, // 自身就是 Node.js
  };

  // Python 可用性检查(异步但同步返回，简化处理)
  const pythonCheck = spawn("python", ["-c", "import pydantic_monty; print('ok')"], {
    timeout: 5000,
  });

  let pythonOutput = "";
  pythonCheck.stdout.on("data", (d) => { pythonOutput += d.toString(); });

  pythonCheck.on("close", (code) => {
    checks.python = code === 0;
    checks.monty = pythonOutput.includes("ok");

    res.json({
      success: true,
      available: checks.python && checks.monty,
      checks,
      languages: SUPPORTED_LANGUAGES,
      limits: {
        timeoutMs: EXEC_TIMEOUT,
        maxOutputBytes: MAX_OUTPUT_SIZE,
        maxCodeLength: 50000,
      },
    });
  });

  pythonCheck.on("error", () => {
    res.json({
      success: true,
      available: false,
      checks,
      languages: SUPPORTED_LANGUAGES,
      error: "Python or pydantic-monty not available",
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// Python 执行(Monty)
// ═══════════════════════════════════════════════════════════════

function execPythonMonty(code: string, inputs: Record<string, any>): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, "../sandbox/monty-runner.py");
    const child = spawn("python", [scriptPath, code, JSON.stringify(inputs)], {
      timeout: EXEC_TIMEOUT,
      env: {
        PATH: process.env.PATH || "",
        // 清空敏感环境变量
        HOME: process.env.HOME || "",
        USERPROFILE: process.env.USERPROFILE || "",
      },
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
      if (stdout.length > MAX_OUTPUT_SIZE && !killed) {
        killed = true;
        child.kill("SIGTERM");
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    child.on("close", (exitCode) => {
      if (killed) {
        resolve({
          success: false,
          error: "Output exceeded maximum size (1MB)",
          stdout: stdout.slice(0, 1000),
          stderr: stderr.slice(0, 1000),
        });
        return;
      }

      if (exitCode !== 0) {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${exitCode}`,
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve({
          success: parsed.success,
          result: parsed.result,
          stdout: parsed.stdout || "",
          stderr: parsed.stderr || "",
          error: parsed.error,
        });
      } catch {
        // Monty 可能直接输出了非 JSON 结果
        resolve({
          success: true,
          result: stdout.trim(),
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to start Python process: ${err.message}`,
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// JavaScript 执行(独立子进程)
// ═══════════════════════════════════════════════════════════════

function execJavaScript(code: string, inputs: Record<string, any>): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const runnerPath = path.join(__dirname, "../sandbox/js-runner.js");
    const child = spawn(process.execPath, [runnerPath, code, JSON.stringify(inputs)], {
      timeout: EXEC_TIMEOUT,
      env: {
        PATH: process.env.PATH || "",
      },
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
      if (stdout.length > MAX_OUTPUT_SIZE && !killed) {
        killed = true;
        child.kill("SIGTERM");
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    child.on("close", (exitCode) => {
      if (killed) {
        resolve({
          success: false,
          error: "Output exceeded maximum size (1MB)",
          stdout: stdout.slice(0, 1000),
          stderr: stderr.slice(0, 1000),
        });
        return;
      }

      if (exitCode !== 0) {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${exitCode}`,
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
        });
        return;
      }

      try {
        // 取最后一行 JSON(前面可能有 console 输出)
        const lines = stdout.trim().split("\n").filter(l => l.trim());
        const jsonLine = lines.find(l => l.trim().startsWith("{")) || lines[lines.length - 1];
        const parsed = JSON.parse(jsonLine);
        resolve({
          success: parsed.success,
          result: parsed.result,
          stdout: parsed.stdout || "",
          stderr: parsed.stderr || "",
          error: parsed.error,
        });
      } catch {
        resolve({
          success: true,
          result: stdout.trim(),
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
        });
      }
    });

    child.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to start Node process: ${err.message}`,
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// Bash 执行(受限模式 —— 仅允许白名单命令)
// ═══════════════════════════════════════════════════════════════

const BASH_ALLOWED_COMMANDS = [
  "echo", "cat", "head", "tail", "wc", "sort", "uniq", "grep", "find",
  "ls", "pwd", "date", "printf", "seq", "tr", "cut", "awk", "sed",
  "python", "python3", "node",
];

function execBash(code: string, _inputs: Record<string, any>): Promise<SandboxResult> {
  return new Promise((resolve) => {
    // 简单安全检查：拒绝危险字符
    const dangerous = /[;&|`$(){}[\]\\]|(\.{2})|>|</;
    if (dangerous.test(code)) {
      resolve({
        success: false,
        error: "Bash execution blocked: potentially dangerous characters detected. Allowed: simple commands only.",
      });
      return;
    }

    // 检查命令白名单
    const firstToken = code.trim().split(/\s+/)[0];
    if (!BASH_ALLOWED_COMMANDS.includes(firstToken)) {
      resolve({
        success: false,
        error: `Bash command '${firstToken}' is not in the allowed list. Allowed: ${BASH_ALLOWED_COMMANDS.join(", ")}`,
      });
      return;
    }

    const child = spawn("cmd", ["/c", code], {
      timeout: EXEC_TIMEOUT,
      env: { PATH: process.env.PATH || "" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => { stdout += data.toString("utf-8"); });
    child.stderr.on("data", (data: Buffer) => { stderr += data.toString("utf-8"); });

    child.on("close", (exitCode) => {
      resolve({
        success: exitCode === 0,
        result: stdout.trim(),
        stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
        stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
        error: exitCode !== 0 ? stderr || `Exit code ${exitCode}` : undefined,
      });
    });

    child.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}
