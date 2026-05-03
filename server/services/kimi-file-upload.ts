/**
 * ============================================================================
 * 后端服务 - kimi-file-upload
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/services
 */


import fs from "fs";
import https from "https";
import FormData from "form-data";

interface KimiFileUploadResult {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
  status: string;
  status_details?: string;
}

function env(key: string, fallback = ""): string {
  return process.env[key] || process.env[key.replace("LLM_", "VITE_")] || fallback;
}

function getKimiConfig(): { apiKey: string; baseURL: string } | null {
  const apiKey = env("LLM_KIMI_API_KEY") || env("KIMI_API_KEY");
  const baseURL = env("LLM_KIMI_BASE_URL") || env("KIMI_BASE_URL") || "https://api.moonshot.cn/v1";
  if (!apiKey || apiKey.includes("your-api-key") || apiKey.length < 10) {
    return null;
  }
  return { apiKey, baseURL };
}

/**
 * 上传本地文件到 Kimi API
 *
 * @param filePath 本地文件路径
 * @param purpose 上传目的: "image" | "video" | "file-extract" | "batch"
 * @returns file_id
 */
export async function uploadFileToKimi(
  filePath: string,
  purpose: "image" | "video" | "file-extract" | "batch" = "image"
): Promise<{ fileId: string; filename: string; bytes: number }> {
  const config = getKimiConfig();
  if (!config) {
    throw new Error("Kimi API Key 未配置,无法上传文件. 请在 .env 中设置 LLM_KIMI_API_KEY 或 KIMI_API_KEY");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new Error(`不是有效文件: ${filePath}`);
  }

  // Kimi 单文件大小限制：100MB
  const MAX_SIZE = 100 * 1024 * 1024;
  if (stats.size > MAX_SIZE) {
    throw new Error(`文件过大 (${(stats.size / 1024 / 1024).toFixed(1)}MB),Kimi 最大支持 100MB`);
  }

  const baseURL = config.baseURL.replace(/\/$/, "");
  const uploadUrl = `${baseURL}/files`;

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("purpose", purpose);

  return new Promise((resolve, reject) => {
    const req = https.request(
      uploadUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...form.getHeaders(),
        },
        timeout: 60000, // 上传可能较慢,给 60 秒
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const result = JSON.parse(data) as KimiFileUploadResult;
            if (res.statusCode !== 200) {
              reject(
                new Error(
                  `Kimi 文件上传失败 (HTTP ${res.statusCode}): ${result.status_details || data.slice(0, 500)}`
                )
              );
              return;
            }
            if (!result.id) {
              reject(new Error(`Kimi 文件上传返回异常: ${data.slice(0, 500)}`));
              return;
            }
            console.log(`[KimiUpload] 上传成功: ${filePath} → ${result.id} (${result.bytes} bytes)`);
            resolve({ fileId: result.id, filename: result.filename, bytes: result.bytes });
          } catch (e: any) {
            reject(new Error(`Kimi 文件上传响应解析失败: ${e.message}\n原始响应: ${data.slice(0, 500)}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(new Error(`Kimi 文件上传请求失败: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Kimi 文件上传超时(60秒)"));
    });

    form.pipe(req);
  });
}

/**
 * 批量上传图片到 Kimi,获取 file_id 列表
 *
 * @param filePaths 本地图片路径数组
 * @param maxConcurrent 最大并发数
 * @returns 上传结果列表(失败的会记录 error 但不中断整体流程)
 */
export async function uploadImagesToKimi(
  filePaths: string[],
  maxConcurrent = 3
): Promise<Array<{ fileId: string; url: string } | { error: string; url: string }>> {
  const results: Array<{ fileId: string; url: string } | { error: string; url: string }> = [];

  for (let i = 0; i < filePaths.length; i += maxConcurrent) {
    const batch = filePaths.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (filePath) => {
        try {
          const result = await uploadFileToKimi(filePath, "image");
          return { fileId: result.fileId, url: filePath };
        } catch (err: any) {
          console.error(`[KimiUpload] 上传失败 ${filePath}: ${err.message}`);
          return { error: err.message, url: filePath };
        }
      })
    );
    results.push(...batchResults);
  }

  return results;
}
