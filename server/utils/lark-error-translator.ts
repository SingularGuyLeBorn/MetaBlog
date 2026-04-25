/**
 * ============================================================================
 * 飞书 (Lark/Feishu) API 错误翻译器
 * ============================================================================
 *
 * 将飞书 REST API 的错误响应翻译为中文友好提示。
 */

export interface LarkErrorTranslation {
  message: string;
  suggestion: string;
}

/**
 * 将飞书 API 错误码翻译为用户友好的中文提示
 *
 * 覆盖的错误码：
 * - 401/99991400: Token 无效或过期
 * - 403: 无权限访问
 * - 404: 资源不存在
 * - 429: 请求过于频繁
 * - 500/502/503: 飞书服务端错误
 * - 131006: Wiki 权限不足（需要 user_access_token）
 * - 131002: 文档不存在或无权限
 */
export function translateLarkError(errorMsg: string, code?: number): LarkErrorTranslation {
  if (code === 99991400 || code === 401 || errorMsg.includes("tenant_access_token")) {
    return {
      message: "飞书 Token 无效或已过期",
      suggestion: "请检查 FEISHU_APP_ID / FEISHU_APP_SECRET 配置是否正确",
    };
  }
  if (code === 131006 || errorMsg.includes("131006")) {
    return {
      message: "Wiki 知识库需要 user_access_token",
      suggestion: "请在 .env 中配置 FEISHU_USER_ACCESS_TOKEN，或显式设置 use_user_token=true",
    };
  }
  if (code === 131002 || errorMsg.includes("131002")) {
    return {
      message: "文档不存在或无访问权限",
      suggestion: "请检查 document_id 是否正确，或确认当前用户有权限访问该文档",
    };
  }
  if (code === 403 || errorMsg.includes("permission")) {
    return {
      message: "没有权限访问该资源",
      suggestion: "请检查应用是否有对应 API 的权限范围（scope）",
    };
  }
  if (code === 404 || errorMsg.includes("not found") || errorMsg.includes("Not Found")) {
    return {
      message: "资源不存在",
      suggestion: "请检查参数是否正确（如 document_id、space_id、user_id 等）",
    };
  }
  if (code === 429 || errorMsg.includes("rate limit")) {
    return {
      message: "请求过于频繁",
      suggestion: "飞书 API 有速率限制，请稍后再试",
    };
  }
  if (code === 500) {
    return {
      message: "飞书服务器内部错误",
      suggestion: "请稍后重试",
    };
  }
  if (code === 502) {
    return {
      message: "飞书网关错误",
      suggestion: "飞书服务暂时不可用，请稍后重试",
    };
  }
  if (code === 503) {
    return {
      message: "飞书服务维护中",
      suggestion: "请稍后重试",
    };
  }

  return { message: errorMsg || "飞书 API 请求失败", suggestion: "请检查参数或稍后重试" };
}
