import type { ViteDevServer } from "vite";
import type { RouteContext } from "../platform/types";
import { searchDuckDuckGo } from "./search-engine";

async function readBody(req: any): Promise<any> {
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

export function registerSearchRoutes(server: ViteDevServer, _ctx: RouteContext) {
  server.middlewares.use("/api/search", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      const body = await readBody(req);
      const { query, limit = 10 } = body;

      if (!query || typeof query !== "string") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "query is required" }));
        return;
      }

      const result = await searchDuckDuckGo(query, Math.min(limit, 30));

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: result }));
    } catch (error: any) {
      console.error("[Search] Error:", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}
