/**
 * ============================================================================
 * GitHub API 错误翻译器
 * ============================================================================
 *
 * 将 GitHub REST API 的英文错误响应翻译为中文友好提示。
 * 从前端 `src/theme/tools/github/utils.ts` 下沉到后端，供所有后端模块复用。
 */

export interface GitHubErrorTranslation {
  message: string;
  suggestion: string;
}

/**
 * 将 GitHub API 错误码翻译为用户友好的中文提示
 *
 * 覆盖的错误码：
 * - 401: Token 无效或过期
 * - 403: 无权限访问或速率限制
 * - 404: 仓库/资源不存在
 * - 405: 操作不被允许
 * - 409: 资源冲突
 * - 422: 参数验证失败
 * - 429: 请求过于频繁
 * - 500/502/503: GitHub 服务端错误
 */
export function translateGitHubError(errorMsg: string): GitHubErrorTranslation {
  const statusMatch = errorMsg.match(/(\d{3})/);
  const status = statusMatch ? parseInt(statusMatch[1]) : 0;

  if (status === 401) {
    return {
      message: "GitHub Token 无效或已过期",
      suggestion: "请检查是否配置了 GITHUB_TOKEN 环境变量",
    };
  }
  if (status === 403) {
    if (errorMsg.includes("rate limit")) {
      return {
        message: "GitHub API 速率限制",
        suggestion: "未认证请求每小时 60 次限制，建议配置 GITHUB_TOKEN",
      };
    }
    return {
      message: "没有权限访问该资源",
      suggestion: "请检查 Token 是否有对应仓库的访问权限",
    };
  }
  if (status === 404) {
    return {
      message: "仓库或资源不存在",
      suggestion: "请检查 owner、repo、path 参数是否正确",
    };
  }
  if (status === 405) {
    return {
      message: "操作不被允许",
      suggestion: "PR 可能已合并，或当前状态不支持该操作",
    };
  }
  if (status === 409) {
    return {
      message: "资源冲突",
      suggestion: "可能存在合并冲突，或该资源已存在/已删除",
    };
  }
  if (status === 422) {
    return {
      message: "请求参数验证失败",
      suggestion: "请检查参数格式是否符合 GitHub API 要求",
    };
  }
  if (status === 429) {
    return {
      message: "请求过于频繁",
      suggestion: "请稍后再试",
    };
  }
  if (status === 500) {
    return {
      message: "GitHub 服务器内部错误",
      suggestion: "请稍后重试",
    };
  }
  if (status === 502) {
    return {
      message: "GitHub 网关错误",
      suggestion: "GitHub 服务暂时不可用，请稍后重试",
    };
  }
  if (status === 503) {
    return {
      message: "GitHub 服务维护中",
      suggestion: "请稍后重试",
    };
  }

  return { message: errorMsg, suggestion: "请检查参数或稍后重试" };
}
