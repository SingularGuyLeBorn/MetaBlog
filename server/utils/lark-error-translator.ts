/**
 * ============================================================================
 * 飞书 (Lark/Feishu) API 错误翻译器
 * ============================================================================
 *
 * 将飞书 REST API 的错误响应翻译为中文友好提示。
 * 覆盖 HTTP 状态码 + 飞书业务错误码（code 字段）。
 */

export interface LarkErrorTranslation {
  message: string;
  suggestion: string;
}

/**
 * 解析错误消息中的数字错误码
 */
function extractCode(errorMsg: string): number | undefined {
  // 匹配 "code":123456 或 123456 或 "123456"
  const m = errorMsg.match(/"code"\s*[:=]\s*(\d+)/) || errorMsg.match(/\b(\d{6,8})\b/);
  return m ? parseInt(m[1]) : undefined;
}

/**
 * 将飞书 API 错误码翻译为用户友好的中文提示
 *
 * 覆盖范围：
 * HTTP 状态码：
 * - 400: 请求格式错误
 * - 401/99991400: Token 无效或过期
 * - 403: 无权限访问、应用/租户/用户权限不足、IP 白名单、签名错误
 * - 404: 资源不存在
 * - 405: 方法不被允许
 * - 406: 不接受的格式
 * - 409: 资源冲突
 * - 410: 资源已删除
 * - 413: 请求体过大
 * - 415: 不支持的媒体类型
 * - 422: 参数验证失败
 * - 429/100004: 请求过于频繁
 * - 500/502/503/504: 飞书服务端错误
 *
 * 业务错误码：
 * - 99991400: tenant_access_token 无效
 * - 99991401: app_access_token 无效
 * - 99991663/99991664/99991665: 参数校验失败
 * - 99991671: 权限不足
 * - 99993005: 用户未授权应用
 * - 100004: 请求过于频繁（业务层）
 * - 112000: 应用无权限
 * - 112001: 租户无权限
 * - 112002: 用户无权限
 * - 112003: IP 不在白名单
 * - 112004: 签名错误
 * - 113000: 资源不存在
 * - 113001: 资源已存在
 * - 113002: 资源被占用
 * - 113003: 资源已过期
 * - 114001: 上传文件过大
 * - 114002: 文件类型不支持
 * - 131002: 文档不存在或无权限
 * - 131006: Wiki 需 user_access_token
 * - 177004: 文档已被删除
 * - 177005: 文档无权限访问
 * - 230301: 表格范围无效
 */
export function translateLarkError(errorMsg: string, code?: number): LarkErrorTranslation {
  const lower = errorMsg.toLowerCase();
  const bizCode = code ?? extractCode(errorMsg);

  // ── 业务错误码（优先级高于 HTTP 状态码）──
  if (bizCode === 99991400 || bizCode === 99991401 || lower.includes("tenant_access_token") || lower.includes("app_access_token")) {
    return {
      message: "飞书 Token 无效或已过期",
      suggestion: "请检查 FEISHU_APP_ID / FEISHU_APP_SECRET 配置是否正确，或重新获取 tenant_access_token / app_access_token",
    };
  }
  if (bizCode === 99991663 || bizCode === 99991664 || bizCode === 99991665) {
    return {
      message: "参数校验失败",
      suggestion: "请检查请求参数的类型、格式或必填项是否符合飞书 API 要求",
    };
  }
  if (bizCode === 99991671) {
    return {
      message: "权限不足",
      suggestion: "当前身份（应用/用户）没有执行该操作的权限，请检查应用权限范围（scope）或用户角色",
    };
  }
  if (bizCode === 99993005) {
    return {
      message: "用户未授权应用",
      suggestion: "用户尚未同意应用的授权请求，请引导用户在飞书客户端中完成授权",
    };
  }
  if (bizCode === 100004 || lower.includes("100004")) {
    return {
      message: "请求过于频繁（业务限流）",
      suggestion: "飞书 API 触发了业务层频率限制，请降低请求频率，稍后重试",
    };
  }
  if (bizCode === 112000 || lower.includes("112000")) {
    return {
      message: "应用无权限",
      suggestion: "当前应用未获得该 API 的调用权限，请在飞书开发者后台检查并申请对应的权限范围（scope）",
    };
  }
  if (bizCode === 112001 || lower.includes("112001")) {
    return {
      message: "租户无权限",
      suggestion: "当前租户未开通该功能或未授权应用，请联系租户管理员",
    };
  }
  if (bizCode === 112002 || lower.includes("112002")) {
    return {
      message: "用户无权限",
      suggestion: "当前用户没有执行该操作的权限，请确认用户角色或文档分享设置",
    };
  }
  if (bizCode === 112003 || lower.includes("112003")) {
    return {
      message: "IP 不在白名单中",
      suggestion: "请在飞书开发者后台的「安全设置」中将当前服务器 IP 添加到 IP 白名单",
    };
  }
  if (bizCode === 112004 || lower.includes("112004")) {
    return {
      message: "请求签名错误",
      suggestion: "请检查请求的签名计算逻辑，确保时间戳、nonce、app_secret 等参数正确",
    };
  }
  if (bizCode === 113000 || lower.includes("113000")) {
    return {
      message: "资源不存在",
      suggestion: "请检查资源 ID（如文档、表格、日历、群聊 ID）是否正确",
    };
  }
  if (bizCode === 113001 || lower.includes("113001")) {
    return {
      message: "资源已存在",
      suggestion: "尝试创建的资源（如群聊名称、日历名称）已存在，请更换名称或使用查询/更新接口",
    };
  }
  if (bizCode === 113002 || lower.includes("113002")) {
    return {
      message: "资源被占用",
      suggestion: "该资源正被其他操作锁定，请稍后重试",
    };
  }
  if (bizCode === 113003 || lower.includes("113003")) {
    return {
      message: "资源已过期",
      suggestion: "该资源（如分享链接、临时凭证）已过期，请重新获取",
    };
  }
  if (bizCode === 114001 || lower.includes("114001")) {
    return {
      message: "上传文件过大",
      suggestion: "请压缩文件或分批上传，飞书单文件大小限制请参考官方文档",
    };
  }
  if (bizCode === 114002 || lower.includes("114002")) {
    return {
      message: "文件类型不支持",
      suggestion: "请检查文件扩展名是否在飞书允许的格式列表中",
    };
  }
  if (bizCode === 131002 || lower.includes("131002")) {
    return {
      message: "文档不存在或无访问权限",
      suggestion: "请检查 document_id 是否正确，或确认当前用户/应用有权限访问该文档",
    };
  }
  if (bizCode === 131006 || lower.includes("131006")) {
    return {
      message: "Wiki 知识库需要 user_access_token",
      suggestion: "请在 .env 中配置 FEISHU_USER_ACCESS_TOKEN，或显式设置 use_user_token=true",
    };
  }
  if (bizCode === 1770001 || lower.includes("1770001")) {
    return {
      message: "飞书文档 API 参数不合法",
      suggestion: "传入的参数不符合飞书文档 API 要求。常见原因：1) block_type 与内容不匹配（如用 text block 传了公式内容）；2) content 字段格式错误；3) 缺少必填参数（如 document_id、block_id）。请检查参数类型和格式，参考飞书文档 API 规范",
    };
  }
  if (bizCode === 1770002 || lower.includes("1770002")) {
    return {
      message: "文档或文档块不存在",
      suggestion: "请确认 document_id 或 block_id 是否正确，或文档是否已被删除",
    };
  }
  if (bizCode === 1770003 || lower.includes("1770003")) {
    return {
      message: "无权限访问该文档",
      suggestion: "当前用户或应用没有该文档的访问权限，请确认文档已分享给当前用户，或应用有 docs:document:readonly 权限",
    };
  }
  if (bizCode === 1770004 || lower.includes("1770004")) {
    return {
      message: "文档块不存在",
      suggestion: "请确认 block_id 是否正确，或该块是否已被删除",
    };
  }
  if (bizCode === 1770005 || lower.includes("1770005")) {
    return {
      message: "文档块已被删除",
      suggestion: "该文档块已被删除，无法更新。请尝试重新创建该块",
    };
  }
  if (bizCode === 1770006 || lower.includes("1770006")) {
    return {
      message: "文档版本冲突（并发编辑）",
      suggestion: "该文档正在被其他用户或应用编辑，请稍后重试",
    };
  }
  if (bizCode === 1770007 || lower.includes("1770007")) {
    return {
      message: "请求体过大",
      suggestion: "单次请求的内容过大，请拆分为多个小块分批发送",
    };
  }
  if (bizCode === 177004 || lower.includes("177004")) {
    return {
      message: "文档已被删除",
      suggestion: "该文档已被移入回收站或永久删除，无法访问",
    };
  }
  if (bizCode === 177005 || lower.includes("177005")) {
    return {
      message: "文档无权限访问",
      suggestion: "请确认当前用户已被添加到文档的协作者列表中，或文档已开启对外分享",
    };
  }
  if (bizCode === 230301 || lower.includes("230301")) {
    return {
      message: "表格范围无效",
      suggestion: "请检查表格范围参数（如 A1:B2）格式是否正确，或是否超出了表格实际大小",
    };
  }

  // ── HTTP 状态码兜底 ──
  if (lower.includes("400") || lower.includes("bad request")) {
    return {
      message: "请求格式错误",
      suggestion: "请检查 JSON 格式、字段类型、必填参数或请求体结构",
    };
  }
  if (lower.includes("401") || lower.includes("unauthorized")) {
    return {
      message: "飞书 Token 无效或已过期",
      suggestion: "请检查 FEISHU_APP_ID / FEISHU_APP_SECRET 配置是否正确",
    };
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return {
      message: "没有权限访问该资源",
      suggestion: "请检查应用是否有对应 API 的权限范围（scope），或用户是否有该资源的访问权限",
    };
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return {
      message: "资源不存在",
      suggestion: "请检查参数是否正确（如 document_id、space_id、user_id、chat_id 等）",
    };
  }
  if (lower.includes("405") || lower.includes("method not allowed")) {
    return {
      message: "HTTP 方法不被允许",
      suggestion: "请确认使用的 HTTP 方法（GET/POST/PUT/DELETE）与该 API 要求一致",
    };
  }
  if (lower.includes("406") || lower.includes("not acceptable")) {
    return {
      message: "不接受的响应格式",
      suggestion: "请检查请求头中的 Accept 字段是否正确",
    };
  }
  if (lower.includes("409") || lower.includes("conflict")) {
    return {
      message: "资源冲突",
      suggestion: "可能存在并发修改或资源状态冲突，请刷新后重试",
    };
  }
  if (lower.includes("410") || lower.includes("gone")) {
    return {
      message: "资源已被永久删除",
      suggestion: "该资源已被硬删除，无法恢复",
    };
  }
  if (lower.includes("413") || lower.includes("payload too large")) {
    return {
      message: "请求体过大",
      suggestion: "请减小请求体大小，或分批发送数据",
    };
  }
  if (lower.includes("415") || lower.includes("unsupported media type")) {
    return {
      message: "不支持的媒体类型",
      suggestion: "请检查 Content-Type 请求头，确保使用 application/json 或正确的媒体类型",
    };
  }
  if (lower.includes("422") || lower.includes("unprocessable")) {
    return {
      message: "参数验证失败",
      suggestion: "请检查参数格式、枚举值或业务规则是否满足要求",
    };
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      message: "请求过于频繁",
      suggestion: "飞书 API 有速率限制，请降低请求频率，稍后重试",
    };
  }
  if (lower.includes("500") || lower.includes("internal server error")) {
    return {
      message: "飞书服务器内部错误",
      suggestion: "飞书服务端异常，请稍后重试",
    };
  }
  if (lower.includes("502") || lower.includes("bad gateway")) {
    return {
      message: "飞书网关错误",
      suggestion: "飞书服务暂时不可用，请稍后重试",
    };
  }
  if (lower.includes("503") || lower.includes("service unavailable")) {
    return {
      message: "飞书服务维护中",
      suggestion: "飞书可能正在进行维护，请稍后重试",
    };
  }
  if (lower.includes("504") || lower.includes("gateway timeout")) {
    return {
      message: "飞书网关超时",
      suggestion: "请求在飞书服务端处理超时，请稍后重试或简化请求参数",
    };
  }

  // ── 兜底：如果提取到了业务错误码但未覆盖，给出更详细的提示 ──
  if (bizCode) {
    return {
      message: errorMsg || "飞书 API 请求失败",
      suggestion: `错误码 ${bizCode} 暂无详细翻译。建议：1) 查阅飞书开放平台官方文档；2) 检查请求参数是否符合该 API 的 schema 要求；3) 如果是文档块操作，确认 block_type 与 content 内容匹配`,
    };
  }

  return { message: errorMsg || "飞书 API 请求失败", suggestion: "请检查参数或稍后重试" };
}
