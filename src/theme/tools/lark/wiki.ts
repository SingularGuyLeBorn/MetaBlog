/**
 * ============================================================================
 * wiki 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/lark
 */


import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/** 飞书 API 代理基础路径 */
const API_BASE = '/api/lark'

/**
 * 调用飞书后端 API 的通用封装
 *
 * @param method - HTTP 方法
 * @param path - API 路径(不含 /api/lark 前缀)
 * @param body - 请求体对象(可选)
 * @param query - URL 查询参数对象(可选)
 * @param useUserToken - 是否使用 user_access_token(可选)
 * @returns 后端返回的 JSON 数据
 */
async function larkApi(method: string, path: string, body?: any, query?: Record<string, string>, useUserToken?: boolean): Promise<any> {
  let url = `${API_BASE}${path}`
  if (useUserToken !== undefined && method === 'GET') {
    query = query || {}
    query.use_user_token = useUserToken ? '1' : '0'
  }
  if (query) {
    const params = new URLSearchParams(query)
    url += '?' + params.toString()
  }
  const options: RequestInit = { method }
  if (body) {
    options.headers = { 'Content-Type': 'application/json' }
    if (useUserToken !== undefined) body.use_user_token = useUserToken
    options.body = JSON.stringify(body)
  }
  const res = await fetch(url, options)
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.code && !res.ok) data.code = res.status
  return data
}

// ============ 工具定义 ============

/**
 * 创建飞书知识库空间的工具定义
 */
export const feishuWikiSpaceCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceCreate',
    description: '【功能】创建一个新的飞书知识库空间(Wiki Space). 【使用场景】用户要求"建一个知识库"、"创建团队文档空间"、"为新项目建知识库"时调用. 【示例】创建名为"产品需求文档"的知识库,用于集中管理 PRD. 【参数说明】name: 知识库名称(必填,如"技术方案库");description: 知识库描述(可选). 【返回值】创建成功返回 space_id(知识库唯一标识)和 space_url(可直接点击访问的知识库链接). 重要：返回的 space_id 必须保存下来,作为 feishuWikiNodeCreate 的 space_id 参数传入,用于在该知识库中创建文档节点. 【注意】1) 使用 user_access_token 创建,创建者自动拥有 owner 权限,无需额外分享;2) 如果返回 token 相关错误(99991677/99991679),先调用 feishuTokenRefresh 刷新 token. ',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '【格式】知识库名称. 【必填】【示例】"产品需求文档"、"技术方案库"' },
        description: { type: 'string', description: '【格式】知识库描述(可选). 【示例】"存放所有产品相关的需求文档和设计稿"' },
      },
      required: ['name'],
    },
  },
}

/**
 * 列出飞书知识库空间的工具定义
 */
export const feishuWikiSpaceListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceList',
    description: '【功能】获取当前用户有权限访问的飞书知识库空间列表,自动翻页获取全部知识库. 【使用场景】用户说"看看有哪些知识库"、"列出我的知识库"、"找一下叫 XXX 的知识库"时调用. 【示例】获取全部知识库列表,找到目标知识库的 space_id. 【注意】会自动翻页获取全部知识库,无需手动处理分页. ',
    parameters: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: '【格式】每页数量,取值范围 1-50. 【默认值】10. 一般无需修改. ', default: 10 },
      },
      required: [],
    },
  },
}

/**
 * 获取飞书知识库空间详情的工具定义
 */
export const feishuWikiSpaceGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceGet',
    description: '【功能】获取指定飞书知识库空间的详细信息(名称、描述、创建时间等). 【使用场景】需要确认某个知识库的具体信息、验证 space_id 是否正确时调用. 【示例】查看 space_id 为 spcxxx 的知识库名称和描述. 【注意】space_id 可通过 feishuWikiSpaceList 获取. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx". 可通过 feishuWikiSpaceList 获取. ' },
      },
      required: ['space_id'],
    },
  },
}

/**
 * 更新飞书知识库空间的工具定义
 */
export const feishuWikiSpaceUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceUpdate',
    description: '【功能】修改飞书知识库空间的名称或描述. 【使用场景】用户要求"重命名知识库"、"修改知识库说明"时调用. 【示例】将知识库名称从"旧项目文档"改为"新项目文档". 【注意】name 和 description 至少传一个,都不传则无实际效果. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        name: { type: 'string', description: '【格式】新的知识库名称(可选). 【示例】"2025年技术方案库"' },
        description: { type: 'string', description: '【格式】新的知识库描述(可选). 【示例】"存放2025年所有技术评审文档"' },
      },
      required: ['space_id'],
    },
  },
}

/**
 * 删除飞书知识库空间的工具定义
 */
export const feishuWikiSpaceDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceDelete',
    description: '【功能】删除飞书知识库空间及其下的所有节点和文档. 【使用场景】用户明确要求"删除知识库"、"清理不再使用的知识库"时调用. 【注意】1) 【警告】删除操作不可逆,会同时删除知识库下的所有节点和文档;2) 执行前务必向用户确认;3) 确保有操作权限. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】要删除的知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
      },
      required: ['space_id'],
    },
  },
}

/**
 * 在飞书知识库中创建节点的工具定义
 */
export const feishuWikiNodeCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeCreate',
    description: '【功能】在飞书知识库中创建一个新节点(即在知识库中新建文档并挂载). 【使用场景】用户要求"在知识库里新建文档"、"创建 Wiki 页面"、"给知识库添加新节点"时调用. 【示例】在"产品需求文档"知识库中创建一篇名为"登录功能 PRD"的 docx 文档. 【参数说明】space_id: 知识库空间 ID(必填,从 feishuWikiSpaceCreate 的返回值中获取);title: 文档标题(必填,如"登录功能 PRD");parent_node_token: 父节点 token(可选,不传则挂载到根目录);obj_type: 文档类型(可选,默认 docx). 【返回值】创建成功返回 node_token(知识库内节点标识)、obj_token(实际文档 ID)、node_url(知识库内访问链接)、doc_url(文档直接访问链接). 重要：返回的 obj_token 就是文档的实际 ID,后续用 feishuDocAppend 追加内容时,直接作为 document_id 参数传入. 【注意】1) 使用 user_access_token 创建,创建者自动拥有编辑权限,无需额外分享;2) space_id 和 node_token 是不同的 ID,不要混淆. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID,标识要操作的知识库. 与 node_token 不同. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        title: { type: 'string', description: '【格式】节点标题,即新建文档的名称. 【必填】【示例】"登录功能 PRD"、"周报模板"' },
        parent_node_token: { type: 'string', description: '【格式】父节点 token(可选),指定该节点挂载到哪个节点下. 不传则挂载到知识库根节点. 可通过 feishuWikiNodeList 获取. 【示例】"wikcnxxxxxxxxxxxxxxxxx"' },
        obj_type: { type: 'string', enum: ['docx', 'sheet', 'bitable', 'mindnote'], description: '【格式】节点对象类型. docx(文档,默认)、sheet(表格)、bitable(多维表格)、mindnote(思维笔记). 【默认值】docx', default: 'docx' },
      },
      required: ['space_id', 'title'],
    },
  },
}

/**
 * 列出飞书知识库节点的工具定义
 */
export const feishuWikiNodeListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeList',
    description: '【功能】获取飞书知识库中的节点列表(文档、表格等),自动翻页获取全部节点. 【使用场景】用户要求"看看知识库里有哪些文档"、"列出 Wiki 目录"、"查找某篇文档"时调用. 【示例】获取某知识库根目录下的所有文档节点. 【注意】1) 会自动翻页获取全部节点;2) 传 parent_node_token 可查看子目录下的节点;3) 返回的 node_token 可用于 feishuWikiNodeDelete、feishuWikiNodeMove 等操作. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        parent_node_token: { type: 'string', description: '【格式】父节点 token(可选),不传则获取根节点下的节点. 传值可查看指定目录下的子节点. 可通过 feishuWikiNodeList 获取. 【示例】"wikcnxxxxxxxxxxxxxxxxx"' },
        page_size: { type: 'number', description: '【格式】每页数量. 【默认值】10. 一般无需修改. ', default: 10 },
      },
      required: ['space_id'],
    },
  },
}

/**
 * 删除飞书知识库节点的工具定义
 */
export const feishuWikiNodeDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeDelete',
    description: '【功能】删除飞书知识库中的指定节点(从知识库中移除文档). 【使用场景】用户明确要求"删除这篇 Wiki 文档"、"移除知识库中的某个节点"时调用. 【注意】1) 【警告】删除操作不可逆,节点及其关联的文档将被移除;2) 执行前务必向用户确认;3) node_token 可通过 feishuWikiNodeList 获取. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        node_token: { type: 'string', description: '【格式】要删除的节点 token. 可通过 feishuWikiNodeList 获取. 【示例】"wikcnxxxxxxxxxxxxxxxxx"' },
      },
      required: ['space_id', 'node_token'],
    },
  },
}

/**
 * 移动飞书知识库节点的工具定义
 */
export const feishuWikiNodeMoveDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeMove',
    description: '【功能】移动飞书知识库中的节点到其他目录下(更改文档在知识库中的位置). 【使用场景】用户要求"把这篇文档移到另一个文件夹"、"整理知识库目录结构"、"将文档移出子目录"时调用. 【示例】将 node_token 为 wikcnA 的节点移动到 wikcnB 节点下,成为其子文档. 【注意】1) 不传 parent_node_token 时节点会被移动到知识库根节点;2) 不能将节点移动到自己的子节点下(会导致循环);3) 需要同一知识库内的 space_id. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        node_token: { type: 'string', description: '【格式】要移动的节点 token. 可通过 feishuWikiNodeList 获取. 【示例】"wikcnxxxxxxxxxxxxxxxxx"' },
        parent_node_token: { type: 'string', description: '【格式】目标父节点 token(可选),移动后节点将成为该父节点的子节点. 不传则移动到知识库根节点. 【示例】"wikcnxxxxxxxxxxxxxxxxx"' },
      },
      required: ['space_id', 'node_token'],
    },
  },
}

/**
 * 将已有文档迁入飞书知识库的工具定义
 */
export const feishuWikiMoveDocDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMoveDoc',
    description: '【功能】将已有的飞书云文档(docx)迁入到 Wiki 知识库中,使其成为知识库的一个节点. 【使用场景】用户说"把这篇文档放进知识库"、"将现有文档迁移到 Wiki"时调用. 【示例】将 obj_token 为 doxcnxxx 的文档迁入 space_id 为 spcxxx 的知识库中. 【注意】1) 【关键限制】文档必须是 user_access_token 创建的(创建时 feishuDocCreate 需传 use_user_token=true),tenant_access_token(应用级)创建的文档无法迁入;2) 迁入后原文档不再独立存在,而是作为知识库节点管理;3) 可通过 feishuWikiNodeList 查看迁入后的节点. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】目标知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        obj_token: { type: 'string', description: '【格式】要迁入的文档 obj_token(即 docx 的 document_id). 【示例】"doxcnxxxxxxxxxxxxxxxxx"' },
        parent_node_token: { type: 'string', description: '【格式】目标父节点 token(可选),不传则挂载到知识库根节点. 【示例】"wikcnxxxxxxxxxxxxxxxxx"' },
        title: { type: 'string', description: '【格式】迁入后的节点标题(可选),不传则保留原文档标题. 【示例】"迁入后的文档标题"' },
      },
      required: ['space_id', 'obj_token'],
    },
  },
}

/**
 * 获取飞书知识库成员列表的工具定义
 */
export const feishuWikiMemberListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMemberList',
    description: '【功能】获取飞书知识库的成员列表及每个人的权限. 【使用场景】用户要求"看看谁有知识库权限"、"列出知识库成员"、"查看某人在知识库中的角色"时调用. 【示例】获取"产品需求文档"知识库的所有成员及其权限级别. 【注意】返回结果包含成员类型(user/chat)和权限级别(view/edit). ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        page_size: { type: 'number', description: '【格式】每页数量. 【默认值】100. 一般无需修改. ', default: 100 },
      },
      required: ['space_id'],
    },
  },
}

/**
 * 向飞书知识库添加成员的工具定义
 */
export const feishuWikiMemberAddDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMemberAdd',
    description: '【功能】向飞书知识库添加成员(用户或群),并赋予相应权限. 【使用场景】用户要求"把某某加入知识库"、"给团队开知识库权限"、"让群里的人都能看这个知识库"时调用. 【示例】给用户 open_id 为 ou_xxx 的成员添加 edit 权限;给群 chat_id 为 oc_xxx 的群添加 view 权限. 【注意】1) 若不知道用户 open_id,先用 feishuUserSearch 搜索;2) 给群授权时 member_type 传 chat,member_id 传 chat_id. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        member_type: { type: 'string', enum: ['user', 'chat'], description: '【格式】成员类型. user(单个用户,默认)、chat(整个群聊,群内所有成员都获得该权限). 【默认值】user', default: 'user' },
        member_id: { type: 'string', description: '【格式】成员标识. member_type=user 时传用户 open_id(如"ou_xxxxxxxxxxxxxxxx");member_type=chat 时传群 chat_id(如"oc_xxxxxxxxxxxxxxxx"). 【必填】' },
        perm: { type: 'string', enum: ['view', 'edit'], description: '【格式】权限级别. view(可阅读,默认)、edit(可编辑,含新建节点). 【默认值】view', default: 'view' },
      },
      required: ['space_id', 'member_id'],
    },
  },
}

/**
 * 从飞书知识库移除成员的工具定义
 */
export const feishuWikiMemberRemoveDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMemberRemove',
    description: '【功能】从飞书知识库中移除指定成员(撤销其对知识库的访问权限). 【使用场景】用户要求"把某某从知识库移除"、"取消某人的知识库权限"时调用. 【示例】将成员 open_id 为 ou_xxx 的用户从知识库中移除. 【注意】1) 移除后该成员将失去知识库内所有节点的访问权限;2) 执行前建议确认成员信息;3) 可通过 feishuWikiMemberList 查看当前成员列表. ',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '【格式】知识库空间 ID. 【示例】"spcxxxxxxxxxxxxxxxxx"' },
        member_id: { type: 'string', description: '【格式】要移除的成员 ID. 与添加时使用的 member_id 一致. 【示例】"ou_xxxxxxxxxxxxxxxx"(用户)或 "oc_xxxxxxxxxxxxxxxx"(群)' },
      },
      required: ['space_id', 'member_id'],
    },
  },
}

// ============ 执行器 ============

/**
 * 创建飞书知识库空间
 *
 * @param args - 包含 name、description 参数
 * @returns 创建结果,包含 space_id
 */
export const feishuWikiSpaceCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { name, description } = args
  if (!name) return createErrorResult('Missing name', '缺少 name 参数', '需要提供知识库名称')
  try {
    const result = await larkApi('POST', '/wiki/space/create', { name, description })
    if (result.code !== 0) return createErrorResult(result.msg, '创建知识库失败', `错误码: ${result.code}`)
    const space = result.data?.space
    return createSuccessResult(result.data, `知识库创建成功！\n名称: ${space?.name}\n空间ID: ${space?.space_id}`, 'feishuWikiSpaceCreate')
  } catch (error: any) {
    return createErrorResult(error.message, '创建知识库请求失败')
  }
}

/**
 * 列出当前用户有权限的飞书知识库空间
 *
 * 自动翻页获取全部知识库,无需手动处理分页. 
 *
 * @param args - 包含 page_size 参数
 * @returns 知识库列表
 */
export const feishuWikiSpaceList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { page_size = 10 } = args
  try {
    const allItems: any[] = []
    let pageToken: string | null = null
    while (true) {
      const query: Record<string, string> = { page_size: String(page_size) }
      if (pageToken) query.page_token = pageToken
      const result = await larkApi('GET', '/wiki/space/list', undefined, query)
      if (result.code !== 0) return createErrorResult(result.msg, '获取知识库列表失败', `错误码: ${result.code}`)
      const items = result.data?.items || []
      allItems.push(...items)
      if (!result.data?.has_more) break
      pageToken = result.data?.page_token
      if (!pageToken) break
    }
    const formatted = allItems.length > 0
      ? allItems.map((s: any, i: number) => `${i + 1}. ${s.name} (ID: ${s.space_id})`).join('\n')
      : '暂无知识库'
    return createSuccessResult({ items: allItems }, formatted, 'feishuWikiSpaceList')
  } catch (error: any) {
    return createErrorResult(error.message, '获取知识库列表请求失败')
  }
}

/**
 * 获取指定飞书知识库空间的详细信息
 *
 * @param args - 包含 space_id 参数
 * @returns 知识库详情
 */
export const feishuWikiSpaceGet = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id } = args
  if (!space_id) return createErrorResult('Missing space_id', '缺少 space_id 参数')
  try {
    const result = await larkApi('GET', '/wiki/space/get', undefined, { space_id })
    if (result.code !== 0) return createErrorResult(result.msg, '获取知识库详情失败', `错误码: ${result.code}`)
    const space = result.data?.space || result.data
    return createSuccessResult(result.data, `知识库: ${space?.name}\n描述: ${space?.description || '无'}\nID: ${space?.space_id}`, 'feishuWikiSpaceGet')
  } catch (error: any) {
    return createErrorResult(error.message, '获取知识库详情请求失败')
  }
}

/**
 * 更新飞书知识库空间信息
 *
 * @param args - 包含 space_id、name、description 参数
 * @returns 更新结果
 */
export const feishuWikiSpaceUpdate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, name, description } = args
  if (!space_id) return createErrorResult('Missing space_id', '缺少 space_id 参数')
  try {
    const result = await larkApi('POST', '/wiki/space/update', { space_id, name, description })
    if (result.code !== 0) return createErrorResult(result.msg, '更新知识库失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, '知识库更新成功', 'feishuWikiSpaceUpdate')
  } catch (error: any) {
    return createErrorResult(error.message, '更新知识库请求失败')
  }
}

/**
 * 删除飞书知识库空间
 *
 * @param args - 包含 space_id 参数
 * @returns 删除结果
 * @remarks 删除操作不可逆,会同时删除知识库下的所有节点和文档
 */
export const feishuWikiSpaceDelete = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id } = args
  if (!space_id) return createErrorResult('Missing space_id', '缺少 space_id 参数')
  try {
    const result = await larkApi('POST', '/wiki/space/delete', { space_id })
    if (result.code !== 0) return createErrorResult(result.msg, '删除知识库失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `知识库 ${space_id} 已删除`, 'feishuWikiSpaceDelete')
  } catch (error: any) {
    return createErrorResult(error.message, '删除知识库请求失败')
  }
}

/**
 * 在飞书知识库中创建新节点
 *
 * @param args - 包含 space_id、title、parent_node_token、obj_type 参数
 * @returns 创建结果,包含 node_token 和 obj_token
 */
export const feishuWikiNodeCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, title, parent_node_token, obj_type } = args
  if (!space_id || !title) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 title')
  try {
    const result = await larkApi('POST', '/wiki/node/create', { space_id, title, parent_node_token, obj_type: obj_type || 'docx' })
    if (result.code !== 0) return createErrorResult(result.msg, '创建节点失败', `错误码: ${result.code}`)
    const node = result.data?.node
    const nodeUrl = node?.node_url || `https://feishu.cn/wiki/${node?.node_token}`
    const docUrl = node?.doc_url || `https://feishu.cn/docx/${node?.obj_token}`
    return createSuccessResult(result.data, `节点创建成功！\n标题: ${node?.title}\n节点Token: ${node?.node_token}\n文档Token: ${node?.obj_token}\n知识库链接: ${nodeUrl}\n文档链接: ${docUrl}`, 'feishuWikiNodeCreate')
  } catch (error: any) {
    return createErrorResult(error.message, '创建节点请求失败')
  }
}

/**
 * 列出飞书知识库中的节点
 *
 * 自动翻页获取全部节点,支持按父节点过滤. 
 *
 * @param args - 包含 space_id、parent_node_token、page_size 参数
 * @returns 节点列表
 */
export const feishuWikiNodeList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, parent_node_token, page_size = 10 } = args
  if (!space_id) return createErrorResult('Missing space_id', '缺少 space_id 参数')
  try {
    const allItems: any[] = []
    let pageToken: string | null = null
    while (true) {
      const query: Record<string, string> = { space_id, page_size: String(page_size) }
      if (parent_node_token) query.parent_node_token = parent_node_token
      if (pageToken) query.page_token = pageToken
      const result = await larkApi('GET', '/wiki/node/list', undefined, query)
      if (result.code !== 0) return createErrorResult(result.msg, '获取节点列表失败', `错误码: ${result.code}`)
      const items = result.data?.items || []
      allItems.push(...items)
      if (!result.data?.has_more) break
      pageToken = result.data?.page_token
      if (!pageToken) break
    }
    const formatted = allItems.length > 0
      ? allItems.map((n: any, i: number) => `${i + 1}. ${n.title} (${n.obj_type}, token=${n.node_token})`).join('\n')
      : '暂无节点'
    return createSuccessResult({ items: allItems }, formatted, 'feishuWikiNodeList')
  } catch (error: any) {
    return createErrorResult(error.message, '获取节点列表请求失败')
  }
}

/**
 * 删除飞书知识库中的指定节点
 *
 * @param args - 包含 space_id、node_token 参数
 * @returns 删除结果
 * @remarks 删除操作不可逆
 */
export const feishuWikiNodeDelete = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, node_token } = args
  if (!space_id || !node_token) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 node_token')
  try {
    const result = await larkApi('POST', '/wiki/node/delete', { space_id, node_token })
    if (result.code !== 0) return createErrorResult(result.msg, '删除节点失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `节点 ${node_token} 已删除`, 'feishuWikiNodeDelete')
  } catch (error: any) {
    return createErrorResult(error.message, '删除节点请求失败')
  }
}

/**
 * 移动飞书知识库节点到指定目录
 *
 * @param args - 包含 space_id、node_token、parent_node_token 参数
 * @returns 移动结果
 */
export const feishuWikiNodeMove = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, node_token, parent_node_token } = args
  if (!space_id || !node_token) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 node_token')
  try {
    const result = await larkApi('POST', '/wiki/node/move', { space_id, node_token, parent_node_token: parent_node_token || undefined })
    if (result.code !== 0) return createErrorResult(result.msg, '移动节点失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `节点 ${node_token} 移动成功`, 'feishuWikiNodeMove')
  } catch (error: any) {
    return createErrorResult(error.message, '移动节点请求失败')
  }
}

/**
 * 将已有飞书云文档迁入知识库
 *
 * @param args - 包含 space_id、obj_token、parent_node_token、title 参数
 * @returns 迁入结果
 */
export const feishuWikiMoveDoc = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, obj_token, parent_node_token, title } = args
  if (!space_id || !obj_token) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 obj_token')
  try {
    const result = await larkApi('POST', '/wiki/move_doc', { space_id, obj_token, parent_node_token, title })
    if (result.code !== 0) return createErrorResult(result.msg, '迁入 Wiki 失败', `错误码: ${result.code}`)
    const node = result.data?.node
    return createSuccessResult(result.data, `文档迁入 Wiki 成功！\n节点Token: ${node?.node_token || 'N/A'}\n文档Token: ${node?.obj_token || obj_token}`, 'feishuWikiMoveDoc')
  } catch (error: any) {
    return createErrorResult(error.message, '迁入 Wiki 请求失败')
  }
}

/**
 * 获取飞书知识库成员列表
 *
 * @param args - 包含 space_id、page_size 参数
 * @returns 成员列表及权限信息
 */
export const feishuWikiMemberList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, page_size = 100 } = args
  if (!space_id) return createErrorResult('Missing space_id', '缺少 space_id 参数')
  try {
    const result = await larkApi('GET', '/wiki/member/list', undefined, { space_id, page_size: String(page_size) })
    if (result.code !== 0) return createErrorResult(result.msg, '获取知识库成员列表失败', `错误码: ${result.code}`)
    const items = result.data?.items || []
    const formatted = items.length > 0
      ? items.map((m: any, i: number) => `${i + 1}. ${m.member_type}: ${m.member_id} (perm: ${m.perm})`).join('\n')
      : '暂无成员'
    return createSuccessResult(result.data, formatted, 'feishuWikiMemberList')
  } catch (error: any) {
    return createErrorResult(error.message, '获取知识库成员列表请求失败')
  }
}

/**
 * 向飞书知识库添加成员
 *
 * @param args - 包含 space_id、member_type、member_id、perm 参数
 * @returns 添加结果
 */
export const feishuWikiMemberAdd = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, member_type = 'user', member_id, perm = 'view' } = args
  if (!space_id || !member_id) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 member_id')
  try {
    const result = await larkApi('POST', '/wiki/member/add', { space_id, member_type, member_id, perm })
    if (result.code !== 0) return createErrorResult(result.msg, '添加知识库成员失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `成员 ${member_id} 已添加,权限: ${perm}`, 'feishuWikiMemberAdd')
  } catch (error: any) {
    return createErrorResult(error.message, '添加知识库成员请求失败')
  }
}

/**
 * 从飞书知识库移除成员
 *
 * @param args - 包含 space_id、member_id 参数
 * @returns 移除结果
 */
export const feishuWikiMemberRemove = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, member_id } = args
  if (!space_id || !member_id) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 member_id')
  try {
    const result = await larkApi('POST', '/wiki/member/remove', { space_id, member_id })
    if (result.code !== 0) return createErrorResult(result.msg, '移除知识库成员失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `成员 ${member_id} 已移除`, 'feishuWikiMemberRemove')
  } catch (error: any) {
    return createErrorResult(error.message, '移除知识库成员请求失败')
  }
}
