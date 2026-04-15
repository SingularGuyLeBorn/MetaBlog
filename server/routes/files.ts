import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

export function registerFilesRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // Files API - 目录操作
  // ============================================

  // 创建目录
  server.middlewares.use("/api/files/mkdir", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { path: dirPath } = body;

          if (!dirPath) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error: "Path required",
              }),
            );
            return;
          }

          // 支持 .skills 等配置目录
          const isConfigPath =
            dirPath.startsWith(".") || dirPath.startsWith("_");
          const basePath = isConfigPath
            ? process.cwd()
            : path.join(process.cwd(), "docs");
          const fullPath = path.resolve(basePath, dirPath);

          // 安全检查
          if (!fullPath.startsWith(basePath)) {
            res.statusCode = 403;
            res.end(
              JSON.stringify({
                success: false,
                error: "Access denied",
              }),
            );
            return;
          }

          await fs.promises.mkdir(fullPath, { recursive: true });

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // 列出目录内容
  server.middlewares.use("/api/files/list", (req, res, next) => {
    if (req.method === "GET") {
      try {
        const url = new URL(
          req.url || "",
          `http://${req.headers.host}`,
        );
        let dirPath = url.searchParams.get("path") || ".";

        // 解码URL编码的路径
        try {
          dirPath = decodeURIComponent(dirPath);
        } catch (e) {
          // 解码失败使用原路径
        }

        // 支持 .skills 等配置目录
        const isConfigPath =
          dirPath.startsWith(".") || dirPath.startsWith("_");
        const basePath = isConfigPath
          ? process.cwd()
          : path.join(process.cwd(), "docs");
        
        // 如果 dirPath 已经是 basePath 的子目录，不要重复拼接
        const resolvedDirPath = path.resolve(dirPath);
        const resolvedBasePath = path.resolve(basePath);
        let fullPath: string;
        if (resolvedDirPath.startsWith(resolvedBasePath)) {
          fullPath = resolvedDirPath;
        } else {
          fullPath = path.resolve(basePath, dirPath);
        }

        // 安全检查
        if (!fullPath.startsWith(basePath)) {
          res.statusCode = 403;
          res.end(
            JSON.stringify({ success: false, error: "Access denied" }),
          );
          return;
        }

        if (!fs.existsSync(fullPath)) {
          res.statusCode = 404;
          res.end(
            JSON.stringify({
              success: false,
              error: "Directory not found",
            }),
          );
          return;
        }

        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              success: false,
              error: "Path is not a directory",
            }),
          );
          return;
        }

        const entries = fs.readdirSync(fullPath, {
          withFileTypes: true,
        });
        const items = entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          path: path.join(dirPath, entry.name).replace(/\\/g, "/"),
        }));

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, data: items }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else next();
  });

}
