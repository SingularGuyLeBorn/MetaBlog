/**
 * ============================================================================
 * 语雀 (Yuque) API 错误翻译器
 * ============================================================================
 *
 * 将语雀内部 Web API 的错误响应翻译为中文友好提示。
 */

export interface YuqueErrorTranslation {
  message: string;
  suggestion: string;
}

/**
 * 将语雀 API 错误码翻译为用户友好的中文提示
 *
 * 覆盖的错误码：
 * - 401: Session/ctoken 过期或无效
 * - 403: 无权限访问
 * - 404: 知识库/文档不存在
 * - 429: 请求过于频繁
 * - 500/502/503: 语雀服务端错误
 * - 422: 参数验证失败（如重复 slug）
 */
export function translateYuqueError(errorMsg: string, status?: number): YuqueErrorTranslation {
  if (status === 401 || errorMsg.includes("未登录") || errorMsg.includes("Unauthorized")) {
    return {
      message: "语雀登录已过期",
      suggestion: "请重新从浏览器获取 YUQUE_SESSION 和 YUQUE_CTOKEN，并更新 .env 配置",
    };
  }
  if (status === 403 || errorMsg.includes("没有权限") || errorMsg.includes("Forbidden")) {
    return {
      message: "没有权限访问该资源",
      suggestion: "请确认当前账号有该知识库/文档的访问权限",
    };
  }
  if (status === 404 || errorMsg.includes("不存在") || errorMsg.includes("Not Found")) {
    return {
      message: "知识库或文档不存在",
      suggestion: "请检查 repo_id、book_id、doc_slug 等参数是否正确",
    };
  }
  if (status === 422 || errorMsg.includes("已存在") || errorMsg.includes("slug")) {
    return {
      message: "请求参数验证失败",
      suggestion: "可能是仓库/文档 slug 已存在，或参数格式不正确",
    };
  }
  if (status === 429 || errorMsg.includes("rate limit") || errorMsg.includes("频繁")) {
    return {
      message: "请求过于频繁",
      suggestion: "语雀有访问频率限制，请稍后再试",
    };
  }
  if (status === 500) {
    return {
      message: "语雀服务器内部错误",
      suggestion: "请稍后重试",
    };
  }
  if (status === 502) {
    return {
      message: "语雀网关错误",
      suggestion: "语雀服务暂时不可用，请稍后重试",
    };
  }
  if (status === 503) {
    return {
      message: "语雀服务维护中",
      suggestion: "请稍后重试",
    };
  }

  return { message: errorMsg || "语雀 API 请求失败", suggestion: "请检查参数或稍后重试" };
}
