/**
 * ============================================================================
 * 工具函数 - lark-error-translator
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/utils
 */


/**
 * ============================================================================
 * 飞书 (Lark/Feishu) API 错误翻译器 V2
 * ============================================================================
 *
 * 将飞书 REST API 的错误响应翻译为精确到字段级别的中文提示. 
 * 核心原则：绝不只说"参数不合法",必须指出"哪个参数、什么值、为什么不对、应该怎么改".
 *
 * 覆盖 HTTP 状态码 + 飞书业务错误码(code 字段). 
 */

export interface LarkErrorTranslation {
  /** 精确错误消息(含字段级详情) */
  message: string;
  /** 修复建议 */
  suggestion: string;
  /** 结构化错误详情 */
  details?: Record<string, any>;
}

/**
 * 解析错误消息中的数字错误码
 */
function extractCode(errorMsg: string): number | undefined {
  const m = errorMsg.match(/"code"\s*[:=]\s*(\d+)/) || errorMsg.match(/\b(\d{6,8})\b/);
  return m ? parseInt(m[1]) : undefined;
}

/**
 * 从飞书原始响应中提取详细的参数错误信息
 *
 * 飞书不同 API 的错误结构各异，本函数尽可能提取所有可用的字段信息：
 * - original.error.field: 不合法字段路径(如 "blocks[0].block_type")
 * - original.error.message: 具体错误描述
 * - original.error.value: 实际传入值
 * - original.error.expected: 期望值/允许范围
 * - original.msg_detail: 中文详细描述
 * - original.field_violations: 多字段违规列表
 */
export function extractErrorDetails(original: any): Record<string, any> | undefined {
  if (!original || typeof original !== 'object') return undefined;

  const details: Record<string, any> = {};

  // 1. 飞书文档 API 常见结构: error.field / error.message
  if (original.error) {
    if (typeof original.error === 'object') {
      if (original.error.field) details.field = original.error.field;
      if (original.error.message) details.fieldMessage = original.error.message;
      if (original.error.value !== undefined) details.actualValue = original.error.value;
      if (original.error.expected) details.expected = original.error.expected;
    }
    if (typeof original.error === 'string') {
      details.rawError = original.error;
    }
  }

  // 2. 飞书部分 API 在 msg_detail 中放详情
  if (original.msg_detail) {
    details.msgDetail = original.msg_detail;
  }

  // 3. 参数校验类错误:提取具体不合法的参数
  if (original.field_violations && Array.isArray(original.field_violations)) {
    details.fieldViolations = original.field_violations.map((v: any) => ({
      field: v.field || v.field_path,
      description: v.description || v.message,
      constraint: v.constraint,
      value: v.value
    }));
  }

  // 4. 提取请求中的参数快照(帮助定位问题)
  if (original.request_params && typeof original.request_params === 'object') {
    details.requestParams = Object.keys(original.request_params).reduce((acc: any, k: string) => {
      const v = original.request_params[k];
      acc[k] = typeof v === 'string' ? v : JSON.stringify(v).slice(0, 200);
      return acc;
    }, {});
  }

  // 5. 飞书有时在 data 中放错误详情
  if (original.data && typeof original.data === 'object') {
    if (original.data.error_field) details.field = original.data.error_field;
    if (original.data.error_msg) details.fieldMessage = original.data.error_msg;
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

/**
 * 根据错误码推断最可能出问题的字段和期望信息
 *
 * 当飞书 API 没有返回结构化字段详情(error.field 等)时,
 * 本函数根据错误码本身推断常见的违规参数,确保错误消息绝不笼统.
 */
function inferDetailsForCode(code: number | undefined): Record<string, any> | undefined {
  if (!code) return undefined;

  // ── 99991xxx — Token/认证 ──
  if (code === 99991400 || code === 99991401) {
    return { field: 'FEISHU_APP_ID / FEISHU_APP_SECRET', expected: '有效的应用凭证', fieldMessage: 'tenant_access_token 或 app_access_token 获取失败' };
  }
  if (code === 99991403) {
    return { field: '应用权限范围(scope)', expected: '在飞书开发者后台申请的对应 API 权限', fieldMessage: '应用无权限调用此 API' };
  }
  if (code === 99991405) {
    return { field: 'tenant_access_token', expected: '未过期的访问令牌', fieldMessage: 'token 已过期，需重新获取' };
  }
  if (code === 99991677) {
    return { field: 'user_access_token / refresh_token', expected: '未过期的用户访问令牌', fieldMessage: '用户访问令牌已过期' };
  }
  if (code === 99991679) {
    return { field: '授权 scope', expected: '包含当前 API 所需权限范围的 scope 列表', fieldMessage: '当前 token 缺少调用该 API 的权限范围' };
  }

  // ── 999915xx — 请求解析/超时 ──
  if (code === 99991501) {
    return { field: '请求体(JSON)', expected: '合法的 JSON 格式(括号匹配、引号闭合、无多余逗号)', fieldMessage: 'JSON 解析失败' };
  }
  if (code === 99991502) {
    return { field: '请求处理时间', expected: '在飞书服务端超时阈值内完成', fieldMessage: '服务端处理超时' };
  }

  // ── 999916xx — 参数校验 ──
  if (code === 99991661) {
    return { field: '必填参数(document_id / block_id / receive_id / content / blocks / title)', expected: '所有必填字段必须提供且不为空', fieldMessage: '缺少必填参数' };
  }
  if (code === 99991662) {
    return { field: '参数类型(blocks 应为数组 / block_type 应为数字 / content 应为字符串)', expected: '正确的数据类型(字符串/数字/布尔/数组)', fieldMessage: '参数数据类型错误' };
  }
  if (code === 99991663 || code === 99991664 || code === 99991665) {
    return { field: '参数格式(字符串长度 / 日期格式 / 枚举值)', expected: '符合 API schema 的格式要求', fieldMessage: '参数格式校验失败' };
  }
  if (code === 99991666) {
    return { field: '参数值(枚举值范围 / 数值范围 / 正则格式)', expected: '在允许的范围或列表中的值', fieldMessage: '参数值不合法或超出范围' };
  }
  if (code === 99991668) {
    return { field: '请求频率(QPS)', expected: '低于 API 限流阈值', fieldMessage: '请求频率超限' };
  }
  if (code === 99991669) {
    return { field: 'API 调用配额', expected: '剩余可用配额 > 0', fieldMessage: '配额已用完' };
  }
  if (code === 99991670) {
    return { field: '应用启用状态', expected: '应用已在当前租户下启用', fieldMessage: '应用未在该租户下启用' };
  }
  if (code === 99991671) {
    return { field: '用户/应用权限(scope / 角色 / 分享设置)', expected: '具有执行该操作所需的权限', fieldMessage: '身份权限不足' };
  }
  if (code === 99991672) {
    return { field: '权限范围(scope)', expected: '已申请并发布对应权限，token 包含该 scope', fieldMessage: '应用缺少必要的权限范围' };
  }
  if (code === 99991673) {
    return { field: '授权状态', expected: '用户或租户已完成应用授权', fieldMessage: '应用未获得授权' };
  }
  if (code === 99991674) {
    return { field: '租户功能开通状态', expected: '当前租户已开通该功能', fieldMessage: '租户未开通此功能' };
  }
  if (code === 99991675) {
    return { field: 'API 接口版本', expected: '使用飞书官方文档中标记为"可用"的接口', fieldMessage: 'API 接口已被废弃' };
  }

  // ── 999917xx — 服务错误 ──
  if (code === 99991701 || code === 99991702) {
    return { field: '飞书服务端', expected: '服务正常运行', fieldMessage: '飞书内部或依赖服务错误' };
  }

  // ── 999920xx / 999921xx — 业务异常/数据 ──
  if (code === 99992000) {
    return { field: '业务参数', expected: '符合业务规则的参数值', fieldMessage: '业务层发生异常' };
  }
  if (code === 99992001) {
    return { field: '业务参数', expected: '符合 API 文档要求的参数值', fieldMessage: '业务参数不符合要求' };
  }
  if (code === 99992002) {
    return { field: '资源状态 / 前置条件', expected: '满足操作所需的业务状态', fieldMessage: '业务逻辑错误(状态不允许/前置条件未满足)' };
  }
  if (code === 99992101) {
    return { field: 'ID 参数(document_id / block_id / user_id / chat_id / space_id)', expected: '系统中已存在的有效 ID', fieldMessage: '数据记录不存在' };
  }
  if (code === 99992102) {
    return { field: '唯一标识(文档标题 / 资源名称)', expected: '系统中不重复的唯一标识', fieldMessage: '数据记录已存在' };
  }
  if (code === 99992103) {
    return { field: '并发操作', expected: '无并发冲突的操作时机', fieldMessage: '数据冲突(并发修改)' };
  }
  if (code === 99992104) {
    return { field: '凭证/数据有效期', expected: '未过期的有效凭证', fieldMessage: '数据或凭证已过期' };
  }

  // ── 999930xx — 用户授权 ──
  if (code === 99993005) {
    return { field: '用户授权状态', expected: '用户已同意应用授权', fieldMessage: '用户未授权应用' };
  }

  // ── 100xxx — 限流 ──
  if (code === 100004) {
    return { field: '请求频率', expected: '低于业务层限流阈值', fieldMessage: '请求过于频繁(业务层限流)' };
  }

  // ── 112xxx — 权限/授权范围 ──
  if (code === 112000) {
    return { field: '应用权限范围(scope)', expected: '已申请对应 API 权限', fieldMessage: '应用无权限调用该 API' };
  }
  if (code === 112001) {
    return { field: '租户功能授权', expected: '租户已开通并授权该功能', fieldMessage: '租户无权限使用该功能' };
  }
  if (code === 112002) {
    return { field: '用户角色 / 资源分享设置', expected: '用户具有该操作的角色权限', fieldMessage: '当前用户无权限执行该操作' };
  }
  if (code === 112003) {
    return { field: '服务器 IP', expected: '在飞书开发者后台 IP 白名单中', fieldMessage: '当前服务器 IP 不在白名单中' };
  }
  if (code === 112004) {
    return { field: '请求签名(timestamp / nonce / app_secret)', expected: '正确的签名计算结果', fieldMessage: '请求签名计算错误' };
  }

  // ── 113xxx — 资源 ──
  if (code === 113000) {
    return { field: '资源 ID(文档 / 表格 / 日历 / 群聊 ID)', expected: '系统中已存在的有效资源 ID', fieldMessage: '请求的资源不存在' };
  }
  if (code === 113001) {
    return { field: '资源名称 / 唯一标识', expected: '系统中不重复的名称', fieldMessage: '尝试创建的资源已存在' };
  }
  if (code === 113002) {
    return { field: '资源锁定状态', expected: '资源未被其他操作锁定', fieldMessage: '资源正被其他操作锁定' };
  }
  if (code === 113003) {
    return { field: '分享链接 / 临时凭证', expected: '未过期的有效凭证', fieldMessage: '资源已过期' };
  }

  // ── 114xxx — 文件/上传 ──
  if (code === 114001) {
    return { field: '上传文件大小', expected: '不超过飞书限制(图片建议 ≤10MB)', fieldMessage: '文件大小超过限制' };
  }
  if (code === 114002) {
    return { field: '文件扩展名 / MIME 类型', expected: '飞书允许的文件格式', fieldMessage: '文件类型不被支持' };
  }

  // ── 131xxx — 文档/Wiki ──
  if (code === 131001) {
    return { field: '创建参数(title / folder_token / doc_type)', expected: '有效的标题、父目录和文档类型', fieldMessage: '文档创建失败' };
  }
  if (code === 131002) {
    return { field: 'document_id / 访问权限', expected: '正确的文档 ID 且当前用户有访问权限', fieldMessage: '文档不存在或无访问权限' };
  }
  if (code === 131003) {
    return { field: '文档标题', expected: '当前目录下不重复的标题', fieldMessage: '同名文档已存在' };
  }
  if (code === 131004) {
    return { field: '文档类型参数(doc_type)', expected: 'docx / sheet / bitable 等支持的类型', fieldMessage: '文档类型不被支持' };
  }
  if (code === 131005) {
    return { field: '文档内容大小', expected: '不超过飞书文档大小限制', fieldMessage: '文档内容大小超出限制' };
  }
  if (code === 131006) {
    return { field: 'use_user_token / FEISHU_USER_ACCESS_TOKEN', expected: '配置有效的 user_access_token 或传 use_user_token=true', fieldMessage: 'Wiki 操作需要 user_access_token' };
  }
  if (code === 131007) {
    return { field: 'wiki_space_id', expected: '系统中已存在的 Wiki 空间 ID', fieldMessage: 'Wiki 知识库空间不存在' };
  }
  if (code === 131008) {
    return { field: 'Wiki 空间权限', expected: '当前用户/应用有该空间的访问权限', fieldMessage: '无权限访问该 Wiki 空间' };
  }

  // ── 177xxx — 文档块/内容（最核心错误码，需要最精确）──
  if (code === 1770001) {
    return {
      field: 'blocks 数组中的 block_type 或 content / elements 格式',
      expected: 'block_type ∈ [2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,22,31,32]; content 格式与 block_type 匹配',
      fieldMessage: 'block_type 值不在允许列表，或 content 格式与 block_type 不匹配'
    };
  }
  if (code === 1770002) {
    return { field: 'document_id', expected: '系统中已存在的有效文档 ID', fieldMessage: '文档不存在' };
  }
  if (code === 1770003) {
    return { field: 'document_id / 文档分享权限', expected: '正确的文档 ID 且已分享给当前用户/应用', fieldMessage: '无权限访问该文档' };
  }
  if (code === 1770004) {
    return { field: 'block_id', expected: '该文档中已存在的有效块 ID', fieldMessage: '文档块不存在' };
  }
  if (code === 1770005) {
    return { field: 'block_id', expected: '未被删除的块 ID', fieldMessage: '文档块已被删除' };
  }
  if (code === 1770006) {
    return { field: '文档版本', expected: '无并发编辑冲突的版本', fieldMessage: '文档版本冲突(并发编辑)' };
  }
  if (code === 1770007) {
    return { field: '单次请求内容大小(blocks 数组)', expected: '单次 ≤50 个 block，单个文本块 ≤10000 字符', fieldMessage: '请求体过大' };
  }
  if (code === 1770019) {
    return { field: 'block.elements 数组', expected: '非空数组，且至少一个 text_run.content 或 equation.content 非空', fieldMessage: 'elements 数组为空或所有内容为空' };
  }
  if (code === 1770020) {
    return { field: 'block.elements 数组结构', expected: '每个元素包含 text_run(含 content) 或 equation(含 content)', fieldMessage: 'elements 格式错误' };
  }
  if (code === 1770029) {
    return {
      field: 'block_type',
      expected: 'block_type ∈ [2=text, 3=heading1, 4=heading2, 5=heading3, 6=heading4, 7=heading5, 8=heading6, 9=heading7, 10=heading8, 11=heading9, 12=bullet, 13=ordered, 14=code, 15=quote, 17=todo, 22=divider, 27=image, 31=table, 32=table_cell]',
      fieldMessage: 'block_type 不在允许列表中'
    };
  }
  if (code === 1770032) {
    return { field: 'block.elements 数组 / text_run.content', expected: '非空内容', fieldMessage: '文档块内容为空(所有 elements 被过滤或 text_run.content 为空)' };
  }
  if (code === 1770033) {
    return { field: 'text_run.content', expected: '单个文本块 ≤10000 字符', fieldMessage: '单个文本块内容超过 10000 字符限制' };
  }
  if (code === 1770034) {
    return { field: 'blocks 数组长度', expected: '单次请求 blocks.length ≤ 50', fieldMessage: '单次请求块数量超过 50 个限制' };
  }
  if (code === 1770035) {
    return { field: 'block 嵌套层级', expected: '不超过飞书嵌套层级限制', fieldMessage: '文档块嵌套层级超过限制' };
  }
  if (code === 177004) {
    return { field: 'document_id', expected: '未被删除的有效文档 ID', fieldMessage: '文档已被删除' };
  }
  if (code === 177005) {
    return { field: 'document_id / 文档分享设置', expected: '当前用户/应用有权限访问的文档', fieldMessage: '文档无权限访问' };
  }

  // ── 230xxx — 表格 ──
  if (code === 230301) {
    return { field: '表格范围参数(如 A1:B2)', expected: '格式正确且在表格实际大小内', fieldMessage: '表格范围参数无效' };
  }
  if (code === 230302) {
    return { field: '表格单元格数据', expected: '符合单元格类型要求的数据格式', fieldMessage: '表格单元格数据格式无效' };
  }
  if (code === 230303) {
    return { field: '表格范围(行列范围)', expected: '不超过表格实际大小的范围', fieldMessage: '表格范围超出实际大小' };
  }

  // ── 999924xx — 文档请求字段校验 ──
  if (code === 99992402) {
    return { field: '请求字段(必填项 / 字段类型 / 字符串长度 / 枚举值)', expected: '所有必填字段已提供，类型正确，值在允许范围内', fieldMessage: '请求字段校验失败' };
  }

  // ── 99992004 — 文档内容过大 ──
  if (code === 99992004) {
    return { field: '请求体大小', expected: '不超过飞书 API 请求体大小限制', fieldMessage: '请求内容过大' };
  }

  // ── 前缀范围兜底推断 ──
  const codeStr = code.toString();
  if (codeStr.startsWith('99991')) {
    return { field: 'FEISHU_APP_ID / FEISHU_APP_SECRET / access_token', expected: '有效的应用凭证和未过期的令牌', fieldMessage: 'Token 或认证相关错误' };
  }
  if (codeStr.startsWith('99992')) {
    return { field: '应用状态 / 租户配置 / 业务参数', expected: '应用已启用、租户已配置、参数符合业务规则', fieldMessage: '应用或租户相关错误' };
  }
  if (codeStr.startsWith('99993')) {
    return { field: '用户授权状态', expected: '用户已完成应用授权', fieldMessage: '用户授权相关错误' };
  }
  if (codeStr.startsWith('99995') || codeStr.startsWith('99996')) {
    return { field: '请求参数(必填项 / 类型 / 格式 / 值范围)', expected: '符合 API schema 的所有参数', fieldMessage: '参数校验相关错误' };
  }
  if (codeStr.startsWith('99997')) {
    return { field: '飞书服务端', expected: '服务正常运行', fieldMessage: '飞书内部服务错误' };
  }
  if (codeStr.startsWith('99999')) {
    return { field: '系统状态', expected: '飞书系统正常运行', fieldMessage: '系统级错误' };
  }
  if (codeStr.startsWith('100')) {
    return { field: '请求频率(QPS)', expected: '低于限流阈值', fieldMessage: '请求频率限制' };
  }
  if (codeStr.startsWith('112')) {
    return { field: '权限范围(scope) / 用户角色 / IP 白名单', expected: '具有执行该操作的权限', fieldMessage: '权限或授权范围错误' };
  }
  if (codeStr.startsWith('113')) {
    return { field: '资源 ID', expected: '有效且未过期的资源', fieldMessage: '资源不存在或冲突' };
  }
  if (codeStr.startsWith('114')) {
    return { field: '上传文件(大小 / 类型)', expected: '符合飞书文件规格', fieldMessage: '文件上传相关错误' };
  }
  if (codeStr.startsWith('131')) {
    return { field: 'document_id / space_id / 文档参数', expected: '正确的文档/Wiki 参数和权限', fieldMessage: '文档或 Wiki 相关错误' };
  }
  if (codeStr.startsWith('177')) {
    return {
      field: 'document_id / block_id / blocks / block_type / content',
      expected: '文档块操作参数需符合飞书 API schema(block_type 在允许列表、content 非空、块数 ≤50)',
      fieldMessage: '文档块或内容相关错误'
    };
  }
  if (codeStr.startsWith('230')) {
    return { field: '表格范围 / 单元格数据 / sheet 参数', expected: '正确的表格操作参数', fieldMessage: '表格相关错误' };
  }

  return undefined;
}

/**
 * 构建精确到字段的错误消息
 *
 * 输入：错误码、原始消息、提取的 details、推断的 details
 * 输出：如"参数 blocks[0].block_type 不合法：值为 99，必须为 [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,22,31,32] 之一"
 */
function buildPreciseMessage(baseMessage: string, extractedDetails: Record<string, any> | undefined, inferredDetails?: Record<string, any> | undefined): string {
  // 合并提取的详情和推断的详情（提取的优先）
  const details: Record<string, any> = {};
  if (inferredDetails) Object.assign(details, inferredDetails);
  if (extractedDetails) Object.assign(details, extractedDetails);

  if (Object.keys(details).length === 0) return baseMessage;

  const parts: string[] = [baseMessage];

  // 优先使用 fieldViolations（多字段违规，来自飞书原始响应）
  if (details.fieldViolations && details.fieldViolations.length > 0) {
    const violations = details.fieldViolations.map((v: any) => {
      let s = `参数 "${v.field}"`;
      if (v.description) s += ` ${v.description}`;
      if (v.value !== undefined) s += `（实际值: ${JSON.stringify(v.value).slice(0, 100)}）`;
      return s;
    });
    parts.push('具体违规字段: ' + violations.join('; '));
  }
  // 单字段错误（可能来自提取或推断）
  else if (details.field) {
    let s = `参数 "${details.field}"`;
    if (details.fieldMessage) s += ` - ${details.fieldMessage}`;
    if (details.actualValue !== undefined) {
      const valStr = JSON.stringify(details.actualValue).slice(0, 100);
      s += `（实际值: ${valStr}）`;
    }
    if (details.expected) s += `（期望值: ${details.expected}）`;
    parts.push(s);
  }
  // msgDetail 兜底
  else if (details.msgDetail) {
    parts.push(`详情: ${details.msgDetail}`);
  }
  // rawError 兜底
  else if (details.rawError) {
    parts.push(`原始错误: ${details.rawError}`);
  }

  return parts.join(' | ');
}

/**
 * 将飞书 API 错误码翻译为精确到字段的中文提示
 *
 * @param errorMsg - 飞书返回的 msg 字段
 * @param code - 飞书返回的 code 字段(可选)
 * @param original - 飞书返回的完整原始响应对象(可选，用于提取字段级详情)
 * @returns 翻译结果，包含 message(精确错误)、suggestion(修复建议)、details(结构化详情)
 */
export function translateLarkError(errorMsg: string, code?: number, original?: any): LarkErrorTranslation {
  const lower = errorMsg.toLowerCase();
  const bizCode = code ?? extractCode(errorMsg);
  const extractedDetails = extractErrorDetails(original);
  const inferredDetails = inferDetailsForCode(bizCode);
  // 合并：推断的兜底，提取的优先覆盖。确保即使 extracted 只有 requestParams，
  // inferred 中的 field/expected/fieldMessage 也保留，避免 buildPreciseMessage 无字段可渲染
  const details: Record<string, any> = {};
  if (inferredDetails) Object.assign(details, inferredDetails);
  if (extractedDetails) Object.assign(details, extractedDetails);

  // ============================================================
  // 1. 精确业务错误码匹配(优先级最高)
  // ============================================================

  // ── 99991xxx — Token/认证 ──
  if (bizCode === 99991400 || bizCode === 99991401 || lower.includes("tenant_access_token") || lower.includes("app_access_token")) {
    return {
      message: buildPreciseMessage("tenant_access_token 或 app_access_token 无效", details),
      suggestion: "请检查 .env 中的 FEISHU_APP_ID / FEISHU_APP_SECRET 配置是否正确，或重新获取有效的访问令牌",
      details
    };
  }
  if (bizCode === 99991403) {
    return {
      message: buildPreciseMessage("应用无权限调用此 API", details),
      suggestion: "当前应用未获得该 API 的调用权限。请在飞书开发者后台 → 权限管理 → 检查并申请对应的权限范围(scope)",
      details
    };
  }
  if (bizCode === 99991405) {
    return {
      message: buildPreciseMessage("tenant_access_token 已过期", details),
      suggestion: "tenant_access_token 已过期。后端会自动重新获取，如持续失败请检查 FEISHU_APP_ID / FEISHU_APP_SECRET 配置",
      details
    };
  }
  if (bizCode === 99991677 || lower.includes("authentication token expired")) {
    return {
      message: buildPreciseMessage("user_access_token 已过期", details),
      suggestion: "用户访问令牌已过期。后端会自动尝试刷新(refresh_token)，如果刷新失败则需要重新授权。可调用 feishuTokenRefresh 手动刷新",
      details
    };
  }
  if (bizCode === 99991679 || lower.includes("required one of these privileges")) {
    return {
      message: buildPreciseMessage("当前 token 缺少 API 调用权限(scope 不足)", details),
      suggestion: "1) 飞书开发者后台 → 权限管理 → 开通对应权限；2) 重新授权(授权链接的 scope 参数必须包含新权限)；3) 用新 code 换 token",
      details
    };
  }

  // ── 999915xx — 请求解析/超时 ──
  if (bizCode === 99991501) {
    return {
      message: buildPreciseMessage("请求参数 JSON 解析失败", details),
      suggestion: "请求体无法被正确解析为 JSON。请检查：1) JSON 格式是否合法(括号匹配、引号闭合)；2) 是否有多余的逗号；3) 特殊字符是否正确转义",
      details
    };
  }
  if (bizCode === 99991502) {
    return {
      message: buildPreciseMessage("请求处理超时", details),
      suggestion: "飞书服务端处理超时。请稍后重试，或简化请求参数、减少数据量",
      details
    };
  }

  // ── 999916xx — 参数校验 ──
  if (bizCode === 99991661) {
    return {
      message: buildPreciseMessage("请求中缺少必填参数", details),
      suggestion: "请对照飞书 API 文档检查所有必填项。常见缺失：document_id、block_id、receive_id、content 等",
      details
    };
  }
  if (bizCode === 99991662) {
    return {
      message: buildPreciseMessage("请求参数的数据类型错误", details),
      suggestion: "请检查参数类型：字符串 vs 数字 vs 布尔值 vs 数组。例如 blocks 必须是数组，block_type 必须是数字",
      details
    };
  }
  if (bizCode === 99991663 || bizCode === 99991664 || bizCode === 99991665) {
    return {
      message: buildPreciseMessage("请求参数格式校验失败", details),
      suggestion: "参数格式不符合要求。请检查：1) 字符串长度是否超限；2) 日期格式是否正确(如 2024-01-01)；3) 枚举值是否在允许列表中",
      details
    };
  }
  if (bizCode === 99991666) {
    return {
      message: buildPreciseMessage("请求参数的值不合法或超出范围", details),
      suggestion: "参数值不符合业务规则。请检查枚举值、数值范围、字符串正则格式等",
      details
    };
  }
  if (bizCode === 99991668) {
    return {
      message: buildPreciseMessage("请求频率超限(QPS/日配额)", details),
      suggestion: "API 调用过于频繁。请降低请求频率，或在批次间增加延迟(如 feishuDocAppend 已内置 400ms 延迟)",
      details
    };
  }
  if (bizCode === 99991669) {
    return {
      message: buildPreciseMessage("API 调用配额已用完", details),
      suggestion: "当前应用的 API 调用配额已耗尽。请联系管理员或等待配额重置(通常每日零点)",
      details
    };
  }
  if (bizCode === 99991670) {
    return {
      message: buildPreciseMessage("应用未在该租户下启用", details),
      suggestion: "请联系租户管理员在飞书管理后台 → 应用管理 → 启用该应用",
      details
    };
  }
  if (bizCode === 99991671) {
    return {
      message: buildPreciseMessage("当前身份权限不足", details),
      suggestion: "当前应用/用户没有执行该操作的权限。请检查：1) 应用权限范围(scope)；2) 用户角色；3) 文档/资源的分享设置",
      details
    };
  }
  if (bizCode === 99991672) {
    return {
      message: buildPreciseMessage("应用缺少必要的权限范围(scope)", details),
      suggestion: "请在飞书开发者后台 → 权限管理 → 申请并发布对应权限，然后重新授权获取新 token",
      details
    };
  }
  if (bizCode === 99991673) {
    return {
      message: buildPreciseMessage("应用未获得用户或租户授权", details),
      suggestion: "当前应用尚未获得授权。请引导用户在飞书客户端中完成授权流程",
      details
    };
  }
  if (bizCode === 99991674) {
    return {
      message: buildPreciseMessage("当前租户未开通此功能", details),
      suggestion: "当前租户未开通此功能。请联系租户管理员了解功能开通情况",
      details
    };
  }
  if (bizCode === 99991675) {
    return {
      message: buildPreciseMessage("调用的 API 接口已被飞书废弃", details),
      suggestion: "该 API 已被飞书废弃。请查阅飞书开放平台官方文档，迁移至新接口",
      details
    };
  }

  // ── 999917xx — 服务错误 ──
  if (bizCode === 99991701) {
    return {
      message: buildPreciseMessage("飞书内部服务错误", details),
      suggestion: "飞书服务端内部异常。请稍后重试，如持续出现请联系飞书技术支持",
      details
    };
  }
  if (bizCode === 99991702) {
    return {
      message: buildPreciseMessage("飞书依赖的外部服务错误", details),
      suggestion: "飞书依赖的外部服务(如存储、计算服务)出现异常。请稍后重试",
      details
    };
  }

  // ── 999920xx / 999921xx — 业务异常/数据 ──
  if (bizCode === 99992000) {
    return {
      message: buildPreciseMessage("飞书业务层发生异常", details),
      suggestion: "业务层异常。请检查请求参数是否符合业务规则，稍后重试",
      details
    };
  }
  if (bizCode === 99992001) {
    return {
      message: buildPreciseMessage("业务参数不符合要求", details),
      suggestion: "业务参数不合法。请对照 API 文档检查参数值的有效性",
      details
    };
  }
  if (bizCode === 99992002) {
    return {
      message: buildPreciseMessage("业务逻辑错误(状态不允许/前置条件未满足)", details),
      suggestion: "当前操作不符合业务逻辑。请确认：1) 前置步骤是否已完成；2) 资源状态是否允许该操作；3) 业务规则是否满足",
      details
    };
  }
  if (bizCode === 99992101) {
    return {
      message: buildPreciseMessage("请求的数据记录不存在", details),
      suggestion: "请检查 ID 是否正确：document_id / block_id / user_id / chat_id / space_id 等",
      details
    };
  }
  if (bizCode === 99992102) {
    return {
      message: buildPreciseMessage("尝试创建的数据记录已存在", details),
      suggestion: "数据已存在。请更换唯一标识(如文档标题)或使用更新接口",
      details
    };
  }
  if (bizCode === 99992103) {
    return {
      message: buildPreciseMessage("数据冲突(并发修改)", details),
      suggestion: "当前操作与已有数据发生冲突。可能存在并发修改，请刷新后重试",
      details
    };
  }
  if (bizCode === 99992104) {
    return {
      message: buildPreciseMessage("相关数据或凭证已过期", details),
      suggestion: "数据已过期。请重新获取或更新相关数据",
      details
    };
  }

  // ── 999930xx — 用户授权 ──
  if (bizCode === 99993005) {
    return {
      message: buildPreciseMessage("用户未授权应用", details),
      suggestion: "用户尚未同意应用的授权请求。请引导用户在飞书客户端中完成授权",
      details
    };
  }

  // ── 100xxx — 限流 ──
  if (bizCode === 100004 || lower.includes("100004")) {
    return {
      message: buildPreciseMessage("请求过于频繁(业务层限流)", details),
      suggestion: "触发了业务层频率限制。请降低请求频率，稍后重试",
      details
    };
  }

  // ── 112xxx — 权限/授权范围 ──
  if (bizCode === 112000 || lower.includes("112000")) {
    return {
      message: buildPreciseMessage("应用无权限调用该 API", details),
      suggestion: "当前应用未获得该 API 的调用权限。请在飞书开发者后台检查并申请对应的权限范围(scope)",
      details
    };
  }
  if (bizCode === 112001 || lower.includes("112001")) {
    return {
      message: buildPreciseMessage("租户无权限使用该功能", details),
      suggestion: "当前租户未开通该功能或未授权应用。请联系租户管理员",
      details
    };
  }
  if (bizCode === 112002 || lower.includes("112002")) {
    return {
      message: buildPreciseMessage("当前用户无权限执行该操作", details),
      suggestion: "当前用户没有执行该操作的权限。请确认用户角色或文档分享设置",
      details
    };
  }
  if (bizCode === 112003 || lower.includes("112003")) {
    return {
      message: buildPreciseMessage("当前服务器 IP 不在白名单中", details),
      suggestion: "请在飞书开发者后台的「安全设置」中将当前服务器 IP 添加到 IP 白名单",
      details
    };
  }
  if (bizCode === 112004 || lower.includes("112004")) {
    return {
      message: buildPreciseMessage("请求签名计算错误", details),
      suggestion: "请检查请求的签名计算逻辑，确保时间戳、nonce、app_secret 等参数正确",
      details
    };
  }

  // ── 113xxx — 资源 ──
  if (bizCode === 113000 || lower.includes("113000")) {
    return {
      message: buildPreciseMessage("请求的资源不存在", details),
      suggestion: "请检查资源 ID(文档、表格、日历、群聊 ID 等)是否正确",
      details
    };
  }
  if (bizCode === 113001 || lower.includes("113001")) {
    return {
      message: buildPreciseMessage("尝试创建的资源已存在", details),
      suggestion: "资源已存在。请更换名称或使用查询/更新接口",
      details
    };
  }
  if (bizCode === 113002 || lower.includes("113002")) {
    return {
      message: buildPreciseMessage("资源正被其他操作锁定", details),
      suggestion: "该资源正被其他操作锁定。请稍后重试",
      details
    };
  }
  if (bizCode === 113003 || lower.includes("113003")) {
    return {
      message: buildPreciseMessage("资源(分享链接/临时凭证)已过期", details),
      suggestion: "相关资源已过期。请重新获取",
      details
    };
  }

  // ── 114xxx — 文件/上传 ──
  if (bizCode === 114001 || lower.includes("114001")) {
    return {
      message: buildPreciseMessage("上传文件大小超过限制", details),
      suggestion: "请压缩文件或分批上传。图片建议不超过 10MB",
      details
    };
  }
  if (bizCode === 114002 || lower.includes("114002")) {
    return {
      message: buildPreciseMessage("文件类型不被支持", details),
      suggestion: "请检查文件扩展名是否在飞书允许的格式列表中",
      details
    };
  }

  // ── 131xxx — 文档/Wiki ──
  if (bizCode === 131001) {
    return {
      message: buildPreciseMessage("文档创建失败", details),
      suggestion: "请检查参数：标题是否为空、父目录是否正确、文档类型是否支持",
      details
    };
  }
  if (bizCode === 131002 || lower.includes("131002")) {
    return {
      message: buildPreciseMessage("文档不存在或无访问权限", details),
      suggestion: "请检查 document_id 是否正确，或确认当前用户/应用有权限访问该文档",
      details
    };
  }
  if (bizCode === 131003) {
    return {
      message: buildPreciseMessage("同名文档已存在", details),
      suggestion: "同名文档已存在。请更换标题或使用现有文档",
      details
    };
  }
  if (bizCode === 131004) {
    return {
      message: buildPreciseMessage("请求的文档类型不被支持", details),
      suggestion: "请检查文档类型参数。飞书云文档支持 docx、sheet、bitable 等",
      details
    };
  }
  if (bizCode === 131005) {
    return {
      message: buildPreciseMessage("文档内容大小超出限制", details),
      suggestion: "文档内容过大。请精简内容或分批操作",
      details
    };
  }
  if (bizCode === 131006 || lower.includes("131006")) {
    return {
      message: buildPreciseMessage("Wiki 知识库操作需要 user_access_token", details),
      suggestion: "Wiki 相关操作必须使用 user_access_token。请在 .env 中配置 FEISHU_USER_ACCESS_TOKEN，或显式设置 use_user_token=true",
      details
    };
  }
  if (bizCode === 131007) {
    return {
      message: buildPreciseMessage("Wiki 知识库空间不存在", details),
      suggestion: "请检查 wiki_space_id 是否正确，或确认该空间是否已被删除",
      details
    };
  }
  if (bizCode === 131008) {
    return {
      message: buildPreciseMessage("无权限访问该 Wiki 空间", details),
      suggestion: "当前用户或应用没有该 Wiki 空间的访问权限。请确认空间权限设置",
      details
    };
  }

  // ── 177xxx — 文档块/内容（文档 API 的核心错误码）──
  if (bizCode === 1770001 || lower.includes("1770001")) {
    const msg = buildPreciseMessage(
      "飞书文档 API 参数不合法",
      details
    );
    return {
      message: msg,
      suggestion: "常见原因及修复：1) block_type 与内容不匹配(如 text block 传了公式内容)→ 检查 block_type 是否在允许列表；2) content 字段格式错误 → 使用 markdownToBlocks 转换确保格式正确；3) 缺少必填参数 → 确认 document_id、blocks 等必填项已提供；4) 参数值类型错误 → 检查字符串/数字/数组类型",
      details
    };
  }
  if (bizCode === 1770002 || lower.includes("1770002")) {
    return {
      message: buildPreciseMessage("文档或文档块不存在", details),
      suggestion: "请确认 document_id 或 block_id 是否正确，或文档是否已被删除",
      details
    };
  }
  if (bizCode === 1770003 || lower.includes("1770003")) {
    return {
      message: buildPreciseMessage("无权限访问该文档", details),
      suggestion: "当前用户或应用没有该文档的访问权限。请确认：1) 文档已分享给当前用户；2) 应用有 docs:document:readonly 权限",
      details
    };
  }
  if (bizCode === 1770004 || lower.includes("1770004")) {
    return {
      message: buildPreciseMessage("文档块不存在", details),
      suggestion: "请确认 block_id 是否正确，或该块是否已被删除",
      details
    };
  }
  if (bizCode === 1770005 || lower.includes("1770005")) {
    return {
      message: buildPreciseMessage("文档块已被删除", details),
      suggestion: "该文档块已被删除，无法更新。请尝试重新创建该块",
      details
    };
  }
  if (bizCode === 1770006 || lower.includes("1770006")) {
    return {
      message: buildPreciseMessage("文档版本冲突(并发编辑)", details),
      suggestion: "该文档正在被其他用户或应用编辑。请稍后重试",
      details
    };
  }
  if (bizCode === 1770007 || lower.includes("1770007")) {
    return {
      message: buildPreciseMessage("请求体过大(单次内容超过限制)", details),
      suggestion: "单次请求的内容过大。请拆分为多个小块分批发送：1) 每批不超过 50 个 block；2) 单个文本块不超过 10000 字符",
      details
    };
  }
  if (bizCode === 1770019) {
    return {
      message: buildPreciseMessage("文档块内容为空(elements 数组为空或所有 text_run.content 为空)", details),
      suggestion: "飞书 API 拒绝空内容块。请检查：1) 文本内容是否为空字符串；2) 是否只有空格；3) markdownToBlocks 是否过滤掉了所有内容",
      details
    };
  }
  if (bizCode === 1770020) {
    return {
      message: buildPreciseMessage("文档块 elements 格式错误", details),
      suggestion: "elements 数组格式不符合要求。每个 element 必须包含 text_run(含 content) 或 equation(含 content) 字段",
      details
    };
  }
  if (bizCode === 1770029 || lower.includes("1770029")) {
    return {
      message: buildPreciseMessage("不支持创建该类型的块(block_type 不在允许列表中)", details),
      suggestion: "允许的 block_type：1=text, 2=text, 3=heading1, 4=heading2, 5=heading3, 6=heading4, 7=heading5, 8=heading6, 9=heading7, 10=heading8, 11=heading9, 12=bullet, 13=ordered, 14=code, 15=quote, 17=todo, 22=divider, 27=image, 31=table, 32=table_cell。请检查传入的 block_type 值",
      details
    };
  }
  if (bizCode === 1770032 || lower.includes("1770032")) {
    return {
      message: buildPreciseMessage("文档块内容为空(所有 elements 被过滤或 text_run.content 为空)", details),
      suggestion: "飞书 API 拒绝包含空 elements 数组或空 text_run.content 的 block。请检查：1) 内容是否为空字符串；2) 是否只有不可见字符；3) markdownToBlocks 转换结果是否为空",
      details
    };
  }
  if (bizCode === 1770033 || lower.includes("1770033")) {
    return {
      message: buildPreciseMessage("单个文本块内容超过 10000 字符限制", details),
      suggestion: "单个 text_run.content 超过 10000 字符。请拆分内容到多个段落或多个 block。feishuDocAppend 已内置自动拆分(splitLongTextRuns)，但建议传入时预先分段",
      details
    };
  }
  if (bizCode === 1770034 || lower.includes("1770034")) {
    return {
      message: buildPreciseMessage("单次请求块数量超过 50 个限制", details),
      suggestion: "单次请求的 blocks 数组长度超过 50。请分批写入，每批不超过 50 个 block。feishuDocAppend 会自动分批处理",
      details
    };
  }
  if (bizCode === 1770035) {
    return {
      message: buildPreciseMessage("文档块嵌套层级超过限制", details),
      suggestion: "文档块的嵌套层级超过限制。请减少嵌套深度",
      details
    };
  }
  if (bizCode === 177004 || lower.includes("177004")) {
    return {
      message: buildPreciseMessage("文档已被删除", details),
      suggestion: "该文档已被移入回收站或永久删除，无法访问",
      details
    };
  }
  if (bizCode === 177005 || lower.includes("177005")) {
    return {
      message: buildPreciseMessage("文档无权限访问", details),
      suggestion: "请确认当前用户已被添加到文档的协作者列表中，或文档已开启对外分享",
      details
    };
  }

  // ── 230xxx — 表格 ──
  if (bizCode === 230301 || lower.includes("230301")) {
    return {
      message: buildPreciseMessage("表格范围参数无效", details),
      suggestion: "请检查表格范围参数(如 A1:B2)格式是否正确，或是否超出了表格实际大小",
      details
    };
  }
  if (bizCode === 230302) {
    return {
      message: buildPreciseMessage("表格单元格数据格式无效", details),
      suggestion: "表格单元格的数据格式或内容无效。请检查单元格值类型是否符合要求",
      details
    };
  }
  if (bizCode === 230303) {
    return {
      message: buildPreciseMessage("表格范围超出实际大小", details),
      suggestion: "请求的表格范围超出了实际表格大小。请检查行列范围是否正确",
      details
    };
  }

  // ── 999924xx — 文档请求字段校验 ──
  if (bizCode === 99992402) {
    return {
      message: buildPreciseMessage("请求字段校验失败(字段缺失或格式错误)", details),
      suggestion: "请检查：1) 所有必填字段是否已提供；2) 字段类型是否正确(字符串/数字/数组)；3) 字符串长度是否超限；4) 枚举值是否在允许列表中",
      details
    };
  }

  // ── 99992xxx — 文档内容过大 ──
  if (bizCode === 99992004) {
    return {
      message: buildPreciseMessage("请求内容过大", details),
      suggestion: "请求体超过大小限制。请精简内容或分批发送",
      details
    };
  }

  // ============================================================
  // 2. 前缀范围匹配(确保任何未精确覆盖的码都有方向)
  // ============================================================
  if (bizCode) {
    const codeStr = bizCode.toString();

    if (codeStr.startsWith("99991")) {
      return {
        message: buildPreciseMessage(`Token 或认证相关错误 (错误码: ${bizCode})`, details),
        suggestion: "访问令牌无效、过期或权限不足。请检查 FEISHU_APP_ID / FEISHU_APP_SECRET 配置，或重新获取有效的 access_token",
        details
      };
    }
    if (codeStr.startsWith("99992")) {
      return {
        message: buildPreciseMessage(`应用或租户相关错误 (错误码: ${bizCode})`, details),
        suggestion: "应用状态、租户配置或业务逻辑异常。请检查应用是否已启用、授权状态及租户功能开通情况",
        details
      };
    }
    if (codeStr.startsWith("99993")) {
      return {
        message: buildPreciseMessage(`用户授权相关错误 (错误码: ${bizCode})`, details),
        suggestion: "用户未授权应用或授权已过期。请引导用户完成授权流程",
        details
      };
    }
    if (codeStr.startsWith("99995") || codeStr.startsWith("99996")) {
      return {
        message: buildPreciseMessage(`参数校验相关错误 (错误码: ${bizCode})`, details),
        suggestion: "请求参数缺失、类型错误或值不合法。请对照飞书 API 文档检查所有参数",
        details
      };
    }
    if (codeStr.startsWith("99997")) {
      return {
        message: buildPreciseMessage(`飞书内部服务错误 (错误码: ${bizCode})`, details),
        suggestion: "飞书服务端内部异常。请稍后重试，如持续出现请联系飞书技术支持",
        details
      };
    }
    if (codeStr.startsWith("99999")) {
      return {
        message: buildPreciseMessage(`系统级错误 (错误码: ${bizCode})`, details),
        suggestion: "飞书系统级异常。请稍后重试",
        details
      };
    }
    if (codeStr.startsWith("100")) {
      return {
        message: buildPreciseMessage(`请求频率限制 (错误码: ${bizCode})`, details),
        suggestion: "API 调用过于频繁，触发了速率限制。请降低请求频率，稍后重试",
        details
      };
    }
    if (codeStr.startsWith("112")) {
      return {
        message: buildPreciseMessage(`权限或授权范围错误 (错误码: ${bizCode})`, details),
        suggestion: "应用、用户或 IP 权限不足。请在飞书开发者后台检查权限范围(scope)和安全设置",
        details
      };
    }
    if (codeStr.startsWith("113")) {
      return {
        message: buildPreciseMessage(`资源不存在或冲突 (错误码: ${bizCode})`, details),
        suggestion: "请求的资源不存在、已存在、被占用或已过期。请检查资源 ID 是否正确",
        details
      };
    }
    if (codeStr.startsWith("114")) {
      return {
        message: buildPreciseMessage(`文件上传相关错误 (错误码: ${bizCode})`, details),
        suggestion: "文件大小超限、类型不支持或上传失败。请检查文件规格",
        details
      };
    }
    if (codeStr.startsWith("131")) {
      return {
        message: buildPreciseMessage(`文档或 Wiki 相关错误 (错误码: ${bizCode})`, details),
        suggestion: "文档/Wiki 不存在、无权限、创建失败或参数错误。请检查 document_id / space_id 及权限设置",
        details
      };
    }
    if (codeStr.startsWith("177")) {
      return {
        message: buildPreciseMessage(`文档块或内容相关错误 (错误码: ${bizCode})`, details),
        suggestion: "文档块不存在、参数不合法、内容过大或并发冲突。请检查 block_id 和 content 格式。常见问题：1) block_type 不在允许列表；2) 单个文本块超 10000 字符；3) 单次请求超 50 个 block；4) elements 数组为空",
        details
      };
    }
    if (codeStr.startsWith("230")) {
      return {
        message: buildPreciseMessage(`表格相关错误 (错误码: ${bizCode})`, details),
        suggestion: "表格范围、单元格数据或 sheet 操作异常。请检查表格参数",
        details
      };
    }
  }

  // ============================================================
  // 3. HTTP 状态码兜底
  // ============================================================
  if (lower.includes("400") || lower.includes("bad request")) {
    return {
      message: buildPreciseMessage("请求格式错误(HTTP 400)", details),
      suggestion: "请检查 JSON 格式、字段类型、必填参数或请求体结构",
      details
    };
  }
  if (lower.includes("401") || lower.includes("unauthorized")) {
    return {
      message: buildPreciseMessage("认证失败(HTTP 401)", details),
      suggestion: "请检查 FEISHU_APP_ID / FEISHU_APP_SECRET 配置是否正确",
      details
    };
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return {
      message: buildPreciseMessage("没有权限访问该资源(HTTP 403)", details),
      suggestion: "请检查应用是否有对应 API 的权限范围(scope)，或用户是否有该资源的访问权限",
      details
    };
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return {
      message: buildPreciseMessage("资源不存在(HTTP 404)", details),
      suggestion: "请检查参数是否正确(如 document_id、space_id、user_id、chat_id 等)",
      details
    };
  }
  if (lower.includes("405") || lower.includes("method not allowed")) {
    return {
      message: buildPreciseMessage("HTTP 方法不被允许(HTTP 405)", details),
      suggestion: "请确认使用的 HTTP 方法(GET/POST/PUT/DELETE)与该 API 要求一致",
      details
    };
  }
  if (lower.includes("406") || lower.includes("not acceptable")) {
    return {
      message: buildPreciseMessage("不接受的响应格式(HTTP 406)", details),
      suggestion: "请检查请求头中的 Accept 字段是否正确",
      details
    };
  }
  if (lower.includes("409") || lower.includes("conflict")) {
    return {
      message: buildPreciseMessage("资源冲突(HTTP 409)", details),
      suggestion: "可能存在并发修改或资源状态冲突。请刷新后重试",
      details
    };
  }
  if (lower.includes("410") || lower.includes("gone")) {
    return {
      message: buildPreciseMessage("资源已被永久删除(HTTP 410)", details),
      suggestion: "该资源已被硬删除，无法恢复",
      details
    };
  }
  if (lower.includes("413") || lower.includes("payload too large")) {
    return {
      message: buildPreciseMessage("请求体过大(HTTP 413)", details),
      suggestion: "请减小请求体大小，或分批发送数据",
      details
    };
  }
  if (lower.includes("415") || lower.includes("unsupported media type")) {
    return {
      message: buildPreciseMessage("不支持的媒体类型(HTTP 415)", details),
      suggestion: "请检查 Content-Type 请求头，确保使用 application/json 或正确的媒体类型",
      details
    };
  }
  if (lower.includes("422") || lower.includes("unprocessable")) {
    return {
      message: buildPreciseMessage("参数验证失败(HTTP 422)", details),
      suggestion: "请检查参数格式、枚举值或业务规则是否满足要求",
      details
    };
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      message: buildPreciseMessage("请求过于频繁(HTTP 429)", details),
      suggestion: "飞书 API 有速率限制。请降低请求频率，稍后重试",
      details
    };
  }
  if (lower.includes("500") || lower.includes("internal server error")) {
    return {
      message: buildPreciseMessage("飞书服务器内部错误(HTTP 500)", details),
      suggestion: "飞书服务端异常。请稍后重试",
      details
    };
  }
  if (lower.includes("502") || lower.includes("bad gateway")) {
    return {
      message: buildPreciseMessage("飞书网关错误(HTTP 502)", details),
      suggestion: "飞书服务暂时不可用。请稍后重试",
      details
    };
  }
  if (lower.includes("503") || lower.includes("service unavailable")) {
    return {
      message: buildPreciseMessage("飞书服务维护中(HTTP 503)", details),
      suggestion: "飞书可能正在进行维护。请稍后重试",
      details
    };
  }
  if (lower.includes("504") || lower.includes("gateway timeout")) {
    return {
      message: buildPreciseMessage("飞书网关超时(HTTP 504)", details),
      suggestion: "请求在飞书服务端处理超时。请稍后重试或简化请求参数",
      details
    };
  }

  // ============================================================
  // 4. 系统/网络/解析层错误(飞书 API 之外)
  // ============================================================
  if (lower.includes("unexpected token") || lower.includes("unexpected non-whitespace") || lower.includes("unexpected character") || lower.includes("json.parse") || lower.includes("invalid json") || lower.includes("is not valid json")) {
    return {
      message: buildPreciseMessage("飞书 API 返回的数据无法解析为 JSON", details),
      suggestion: "该 API 可能返回了 HTML 页面(如登录页、错误页)而非 JSON。建议：1) 检查 Token 是否有效；2) 确认接口是否需要特定的 Content-Type",
      details
    };
  }
  if (lower.includes("econnrefused") || lower.includes("connection refused")) {
    return {
      message: buildPreciseMessage("无法连接到飞书服务器(连接被拒绝)", details),
      suggestion: "请检查服务器网络连接、防火墙设置，或确认飞书 API 域名 open.feishu.cn 是否可访问",
      details
    };
  }
  if (lower.includes("etimedout") || lower.includes("timeout") || lower.includes("timed out")) {
    return {
      message: buildPreciseMessage("连接飞书服务器超时", details),
      suggestion: "网络延迟过高或飞书服务端响应缓慢。请检查网络连接，稍后重试",
      details
    };
  }
  if (lower.includes("enotfound") || lower.includes("getaddrinfo") || lower.includes("dns")) {
    return {
      message: buildPreciseMessage("无法解析飞书服务器域名", details),
      suggestion: "DNS 解析失败。请检查服务器网络配置，确认域名 open.feishu.cn 可正常解析",
      details
    };
  }
  if (lower.includes("econnreset") || lower.includes("connection reset")) {
    return {
      message: buildPreciseMessage("与飞书服务器的连接被重置", details),
      suggestion: "网络不稳定或飞书服务端主动断开连接。请稍后重试",
      details
    };
  }
  if (lower.includes("fetch failed") || lower.includes("unable to fetch")) {
    return {
      message: buildPreciseMessage("请求发送失败", details),
      suggestion: "请检查网络连接、代理配置，或确认目标地址是否正确",
      details
    };
  }
  if (lower.includes("certificate") || lower.includes("ssl") || lower.includes("tls")) {
    return {
      message: buildPreciseMessage("SSL/TLS 证书验证失败", details),
      suggestion: "请检查系统时间是否正确，或确认飞书服务器的 SSL 证书是否有效",
      details
    };
  }
  if (lower.includes("permission denied") || lower.includes("access denied")) {
    return {
      message: buildPreciseMessage("本地权限不足，无法执行该操作", details),
      suggestion: "请检查文件/目录权限，或确认当前进程是否有足够的系统权限",
      details
    };
  }
  if (lower.includes("enoent") || lower.includes("no such file")) {
    return {
      message: buildPreciseMessage("本地文件或目录不存在", details),
      suggestion: "请检查文件路径是否正确，或确认文件是否已被删除/移动",
      details
    };
  }

  // ============================================================
  // 5. 最终兜底
  // ============================================================
  if (bizCode) {
    return {
      message: buildPreciseMessage(`飞书 API 错误 (错误码: ${bizCode})`, details),
      suggestion: `未识别的错误码 ${bizCode}。建议：1) 查阅飞书开放平台官方文档搜索该错误码；2) 检查请求参数是否符合该 API 的 schema 要求；3) 如果是文档块操作，确认 block_type 与 content 内容匹配`,
      details
    };
  }

  return {
    message: buildPreciseMessage(errorMsg || "飞书 API 请求失败", details),
    suggestion: `请检查参数或稍后重试。原始错误信息：${errorMsg || "无详细信息"}`,
    details
  };
}
