/**
 * ============================================================================
 * 语雀 (Yuque) API 错误翻译器
 * ============================================================================
 *
 * 将语雀内部 Web API 的错误响应翻译为中文友好提示。
 * 覆盖 HTTP 状态码 + 语雀常见业务错误场景。
 */

export interface YuqueErrorTranslation {
  message: string;
  suggestion: string;
}

/**
 * 将语雀 API 错误码翻译为用户友好的中文提示
 *
 * 覆盖范围：
 * HTTP 状态码：
 * - 400: 请求格式错误
 * - 401: Session/ctoken 过期或无效
 * - 403: 无权限访问
 * - 404: 知识库/文档不存在
 * - 405: 方法不被允许
 * - 406: 不接受的格式
 * - 409: 资源冲突(如重复 slug)
 * - 410: 资源已删除
 * - 413: 请求体过大
 * - 415: 不支持的媒体类型
 * - 422: 参数验证失败(如重复 slug、非法字符)
 * - 429: 请求过于频繁
 * - 500/502/503/504: 语雀服务端错误
 *
 * 业务场景：
 * - 未登录 / Session 过期
 * - 没有权限(私有知识库、团队权限)
 * - 知识库/文档不存在
 * - slug 已存在
 * - 请求过于频繁
 * - 参数验证失败
 * - 文件过大
 * - 服务维护
 */
export function translateYuqueError(errorMsg: string, status?: number): YuqueErrorTranslation {
  const lower = errorMsg.toLowerCase();

  // 优先根据状态码判断(如果调用方传入)
  if (status === 400) {
    return {
      message: "请求格式错误",
      suggestion: "请检查 JSON 格式、字段类型或必填参数是否完整",
    };
  }
  if (status === 401 || lower.includes("未登录") || lower.includes("unauthorized") || lower.includes("session") || lower.includes("ctoken")) {
    return {
      message: "语雀登录已过期或无效",
      suggestion: "请重新从浏览器获取 YUQUE_SESSION 和 YUQUE_CTOKEN，并更新 .env 配置",
    };
  }
  if (status === 403 || lower.includes("没有权限") || lower.includes("forbidden") || lower.includes("private") || lower.includes("denied")) {
    return {
      message: "没有权限访问该资源",
      suggestion: "请确认当前账号有该知识库/文档的访问权限，或该资源是否为私有/团队内部资源",
    };
  }
  if (status === 404 || lower.includes("不存在") || lower.includes("not found") || lower.includes("找不到")) {
    return {
      message: "知识库或文档不存在",
      suggestion: "请检查 repo_id、book_id、doc_slug 等参数是否正确，或该资源是否已被删除/转移",
    };
  }
  if (status === 405) {
    return {
      message: "HTTP 方法不被允许",
      suggestion: "请确认使用的 HTTP 方法(GET/POST/PUT/DELETE)与该 API 要求一致",
    };
  }
  if (status === 406) {
    return {
      message: "不接受的响应格式",
      suggestion: "请检查请求头中的 Accept 字段是否正确",
    };
  }
  if (status === 409 || lower.includes("冲突") || lower.includes("conflict")) {
    return {
      message: "资源冲突",
      suggestion: "可能存在并发修改，或该资源已被其他操作占用，请刷新后重试",
    };
  }
  if (status === 410 || lower.includes("已删除") || lower.includes("gone")) {
    return {
      message: "资源已被永久删除",
      suggestion: "该知识库或文档已被硬删除，无法恢复",
    };
  }
  if (status === 413 || lower.includes("过大") || lower.includes("too large") || lower.includes("payload too large")) {
    return {
      message: "请求体过大",
      suggestion: "请减小内容大小，或分批保存/上传",
    };
  }
  if (status === 415 || lower.includes("unsupported media type")) {
    return {
      message: "不支持的媒体类型",
      suggestion: "请检查 Content-Type 请求头，确保使用 application/json 或正确的媒体类型",
    };
  }
  if (status === 422 || lower.includes("已存在") || lower.includes("slug") || lower.includes("unprocessable")) {
    if (lower.includes("slug") || lower.includes("已存在")) {
      return {
        message: "参数验证失败：slug 已存在或格式错误",
        suggestion: "请更换文档/知识库 slug(URL 路径名)，确保唯一且仅包含字母、数字、连字符、下划线",
      };
    }
    return {
      message: "请求参数验证失败",
      suggestion: "请检查参数格式是否符合语雀 API 要求(如字段类型、枚举值、字符串长度等)",
    };
  }
  if (status === 429 || lower.includes("rate limit") || lower.includes("频繁") || lower.includes("too many requests")) {
    return {
      message: "请求过于频繁",
      suggestion: "语雀有访问频率限制，请降低请求频率，稍后重试",
    };
  }
  if (status === 500 || lower.includes("internal server error")) {
    return {
      message: "语雀服务器内部错误",
      suggestion: "语雀服务端异常，请稍后重试",
    };
  }
  if (status === 502 || lower.includes("bad gateway")) {
    return {
      message: "语雀网关错误",
      suggestion: "语雀服务暂时不可用，请稍后重试",
    };
  }
  if (status === 503 || lower.includes("service unavailable")) {
    return {
      message: "语雀服务维护中",
      suggestion: "语雀可能正在进行维护，请稍后重试",
    };
  }
  if (status === 504 || lower.includes("gateway timeout")) {
    return {
      message: "语雀网关超时",
      suggestion: "请求在语雀服务端处理超时，请稍后重试或简化请求参数",
    };
  }

  // 语义化兜底：根据常见关键词匹配
  if (lower.includes("login") || lower.includes("auth") || lower.includes("cookie")) {
    return {
      message: "语雀登录状态异常",
      suggestion: "请重新获取 YUQUE_SESSION 和 YUQUE_CTOKEN，并更新 .env 配置",
    };
  }
  if (lower.includes("timeout") || lower.includes("超时")) {
    return {
      message: "请求超时",
      suggestion: "网络连接不稳定或语雀服务端响应慢，请稍后重试",
    };
  }
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("enotfound")) {
    return {
      message: "网络连接失败",
      suggestion: "无法连接到语雀服务器，请检查网络或 DNS 配置",
    };
  }

  return { message: errorMsg || "语雀 API 请求失败", suggestion: "请检查参数或稍后重试" };
}
