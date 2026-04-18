import type { ViteDevServer } from "vite";
import { spawn } from "child_process";
import type { RouteContext } from "./proxy";

/**
 * 飞书 CLI 路由
 * 封装 lark-cli 命令执行，提供安全的命令代理
 */

// 允许的 lark-cli 子命令白名单
const ALLOWED_LARK_COMMANDS = new Set([
  'api',
  'im',
  'docs',
  'calendar',
  'contact',
  'drive',
  'wiki',
  'sheets',
  'slides',
  'task',
  'base',
  'approval',
  'attendance',
  'mail',
  'minutes',
  'okr',
  'vc',
  'whiteboard',
  'event',
  'schema',
  'doctor',
  'auth',
  'config',
  'profile',
  'update',
  'help',
]);

// 危险字符过滤
const DANGEROUS_PATTERNS = /[;&|`$(){}[\]\n\r\\]|(\.\.)|(^\s*-)/;

function sanitizeArg(arg: string): boolean {
  return !DANGEROUS_PATTERNS.test(arg);
}

function isAllowedCommand(cmd: string): boolean {
  return ALLOWED_LARK_COMMANDS.has(cmd);
}

export function registerLarkRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { structuredLog } = ctx;

  // ============================================
  // 飞书 CLI 命令执行
  // POST /api/lark/exec
  // ============================================
  server.middlewares.use("/api/lark/exec", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const {
          command,
          args = [],
          timeout = 30000,
          format = 'json'
        } = body;

        // 参数校验
        if (!command || typeof command !== 'string') {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'command is required' }));
          return;
        }

        const parts = command.trim().split(/\s+/);
        const mainCmd = parts[0];

        // 白名单校验
        if (!isAllowedCommand(mainCmd)) {
          res.statusCode = 403;
          res.end(JSON.stringify({
            success: false,
            error: `Command "${mainCmd}" is not allowed`,
            allowed: Array.from(ALLOWED_LARK_COMMANDS)
          }));
          return;
        }

        // 构建参数列表
        const cmdArgs = [...parts.slice(1), ...args];

        // 安全过滤
        for (const arg of cmdArgs) {
          if (!sanitizeArg(arg)) {
            res.statusCode = 403;
            res.end(JSON.stringify({
              success: false,
              error: `Dangerous characters detected in argument: ${arg}`,
            }));
            return;
          }
        }

        // 自动添加格式参数
        if (format && !cmdArgs.includes('--format')) {
          cmdArgs.push('--format', format);
        }

        structuredLog.info("lark.exec.started", `Executing: lark-cli ${mainCmd}`, {
          command: mainCmd,
          args: cmdArgs,
          timeout,
        });

        // 执行命令
        const startTime = Date.now();
        const child = spawn('lark-cli', [mainCmd, ...cmdArgs], {
          timeout,
          windowsHide: true,
          env: { ...process.env }
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('error', (error) => {
          structuredLog.error("lark.exec.error", `lark-cli spawn error: ${error.message}`, { error: error.message });
          res.statusCode = 500;
          res.end(JSON.stringify({
            success: false,
            error: `Failed to spawn lark-cli: ${error.message}`,
            hint: '请确认 lark-cli 已安装: npm install -g @larksuite/cli'
          }));
        });

        child.on('close', (code) => {
          const duration = Date.now() - startTime;

          if (code !== 0 && code !== null) {
            structuredLog.warn("lark.exec.failed", `lark-cli exited with code ${code}`, {
              exitCode: code,
              duration,
              stderr: stderr.slice(0, 500),
            });
          } else {
            structuredLog.success("lark.exec.completed", `lark-cli completed`, {
              duration,
              stdoutLength: stdout.length,
            });
          }

          // 尝试解析 stdout 为 JSON（如果格式是 json）
          let parsedOutput: any = null;
          if (format === 'json' && stdout.trim()) {
            try {
              parsedOutput = JSON.parse(stdout);
            } catch {
              // 不是有效 JSON，保持原样
            }
          }

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            success: code === 0 || code === null,
            stdout: stdout.slice(0, 50000), // 限制返回大小
            stderr: stderr.slice(0, 5000),
            exitCode: code,
            parsed: parsedOutput,
            duration,
          }));
        });

      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    });
  });

  // ============================================
  // 飞书 CLI 健康检查
  // GET /api/lark/health
  // ============================================
  server.middlewares.use("/api/lark/health", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }

    try {
      const child = spawn('lark-cli', ['doctor'], {
        timeout: 10000,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: code === 0,
          installed: true,
          version: '1.0.14',
          doctorOutput: stdout.slice(0, 2000),
          doctorError: stderr.slice(0, 1000),
          hint: code !== 0
            ? '请运行 "lark-cli auth login" 完成飞书 OAuth 登录'
            : undefined
        }));
      });

      child.on('error', () => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: false,
          installed: false,
          error: 'lark-cli not found',
          hint: '请安装: npm install -g @larksuite/cli'
        }));
      });
    } catch {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: false,
        installed: false,
      }));
    }
  });
}
