import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

const API_BASE = '/api/lark'

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

// ============ 定义 ============

export const feishuWikiSpaceCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceCreate',
    description: '创建飞书知识库空间(Wiki Space)。创建成功后，可用 feishuWikiNodeCreate 在知识库中挂载文档。',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '知识库名称' },
        description: { type: 'string', description: '知识库描述(可选)' },
      },
      required: ['name'],
    },
  },
}

export const feishuWikiSpaceListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceList',
    description: '列出当前用户可访问的飞书知识库空间列表。会自动翻页获取全部知识库。',
    parameters: {
      type: 'object',
      properties: {
        page_size: { type: 'number', description: '每页数量(1-50，默认 10)', default: 10 },
      },
      required: [],
    },
  },
}

export const feishuWikiSpaceGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceGet',
    description: '获取飞书知识库空间的详细信息。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiSpaceUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceUpdate',
    description: '更新飞书知识库空间的名称或描述。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        name: { type: 'string', description: '新名称(可选)' },
        description: { type: 'string', description: '新描述(可选)' },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiSpaceDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiSpaceDelete',
    description: '删除飞书知识库空间。【警告】删除操作不可逆！会同时删除知识库下的所有节点。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiNodeCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeCreate',
    description: '在飞书知识库中创建节点(挂载文档)。创建成功后返回 node_token。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        title: { type: 'string', description: '节点标题(创建 docx 时需要)' },
        parent_node_token: { type: 'string', description: '父节点 token(可选)，不传则挂载到根节点' },
        obj_type: { type: 'string', enum: ['docx', 'sheet', 'bitable', 'mindnote'], description: '对象类型，默认 docx', default: 'docx' },
      },
      required: ['space_id', 'title'],
    },
  },
}

export const feishuWikiNodeListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeList',
    description: '列出飞书知识库中的节点(文档列表)。会自动翻页获取全部节点。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        parent_node_token: { type: 'string', description: '父节点 token(可选)，不传则获取根节点下的节点' },
        page_size: { type: 'number', description: '每页数量(默认 10)', default: 10 },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiNodeDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeDelete',
    description: '删除飞书知识库中的节点。【警告】删除操作不可逆！',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        node_token: { type: 'string', description: '节点 token' },
      },
      required: ['space_id', 'node_token'],
    },
  },
}

export const feishuWikiNodeMoveDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiNodeMove',
    description: '移动飞书知识库节点到新的父节点下。不传 parent_node_token 则移动到根节点。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        node_token: { type: 'string', description: '要移动的节点 token' },
        parent_node_token: { type: 'string', description: '目标父节点 token(可选)' },
      },
      required: ['space_id', 'node_token'],
    },
  },
}

export const feishuWikiMoveDocDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMoveDoc',
    description: '将外部云文档(docx)迁入飞书 Wiki 知识库。【重要】文档必须用 user_access_token 创建，用户才是文档拥有者，才有权限迁入 Wiki。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        doc_token: { type: 'string', description: '要迁入的文档 token(docx 的 document_id)' },
        parent_node_token: { type: 'string', description: '目标父节点 token(可选)' },
        title: { type: 'string', description: '迁入后的节点标题(可选)' },
      },
      required: ['space_id', 'doc_token'],
    },
  },
}

export const feishuWikiMemberListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMemberList',
    description: '获取飞书知识库的成员列表。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        page_size: { type: 'number', description: '每页数量(默认 100)', default: 100 },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiMemberAddDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMemberAdd',
    description: '添加成员到飞书知识库。权限: view(可阅读)或 edit(可编辑)。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        member_type: { type: 'string', enum: ['user', 'chat'], description: '成员类型', default: 'user' },
        member_id: { type: 'string', description: '成员 open_id 或 chat_id' },
        perm: { type: 'string', enum: ['view', 'edit'], description: '权限', default: 'view' },
      },
      required: ['space_id', 'member_id'],
    },
  },
}

export const feishuWikiMemberRemoveDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuWikiMemberRemove',
    description: '从飞书知识库中移除成员。',
    parameters: {
      type: 'object',
      properties: {
        space_id: { type: 'string', description: '知识库空间 ID' },
        member_id: { type: 'string', description: '成员 ID' },
      },
      required: ['space_id', 'member_id'],
    },
  },
}

// ============ 执行器 ============

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

export const feishuWikiNodeCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, title, parent_node_token, obj_type } = args
  if (!space_id || !title) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 title')
  try {
    const result = await larkApi('POST', '/wiki/node/create', { space_id, title, parent_node_token, obj_type: obj_type || 'docx' })
    if (result.code !== 0) return createErrorResult(result.msg, '创建节点失败', `错误码: ${result.code}`)
    const node = result.data?.node
    return createSuccessResult(result.data, `节点创建成功！\n标题: ${node?.title}\n节点Token: ${node?.node_token}\n文档Token: ${node?.obj_token}`, 'feishuWikiNodeCreate')
  } catch (error: any) {
    return createErrorResult(error.message, '创建节点请求失败')
  }
}

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

export const feishuWikiNodeMove = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, node_token, parent_node_token } = args
  if (!space_id || !node_token) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 node_token')
  try {
    const result = await larkApi('POST', '/wiki/node/move', { space_id, node_token, parent_node_token })
    if (result.code !== 0) return createErrorResult(result.msg, '移动节点失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `节点 ${node_token} 移动成功`, 'feishuWikiNodeMove')
  } catch (error: any) {
    return createErrorResult(error.message, '移动节点请求失败')
  }
}

export const feishuWikiMoveDoc = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, doc_token, parent_node_token, title } = args
  if (!space_id || !doc_token) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 doc_token')
  try {
    const result = await larkApi('POST', '/wiki/move_doc', { space_id, doc_token, parent_node_token, title })
    if (result.code !== 0) return createErrorResult(result.msg, '迁入 Wiki 失败', `错误码: ${result.code}`)
    const node = result.data?.node
    return createSuccessResult(result.data, `文档迁入 Wiki 成功！\n节点Token: ${node?.node_token || 'N/A'}\n文档Token: ${node?.obj_token || doc_token}`, 'feishuWikiMoveDoc')
  } catch (error: any) {
    return createErrorResult(error.message, '迁入 Wiki 请求失败')
  }
}

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

export const feishuWikiMemberAdd = async (args: Record<string, any>): Promise<ToolResult> => {
  const { space_id, member_type = 'user', member_id, perm = 'view' } = args
  if (!space_id || !member_id) return createErrorResult('Missing parameters', '缺少参数', '需要 space_id 和 member_id')
  try {
    const result = await larkApi('POST', '/wiki/member/add', { space_id, member_type, member_id, perm })
    if (result.code !== 0) return createErrorResult(result.msg, '添加知识库成员失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `成员 ${member_id} 已添加，权限: ${perm}`, 'feishuWikiMemberAdd')
  } catch (error: any) {
    return createErrorResult(error.message, '添加知识库成员请求失败')
  }
}

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
