/**
 * 飞书 (Lark) 后端路由测试
 *
 * 覆盖：参数校验、成功响应、错误处理
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { registerLarkRoutes } from '../../server/routes/external/lark'
import { createMockServer, createMockCtx, mockFetch } from './test-utils'

describe('Lark Routes', () => {
  let restoreFetch: () => void

  beforeAll(() => {
    // 设置 mock 环境变量，避免认证函数抛错
    process.env.FEISHU_APP_ID = 'mock_app_id'
    process.env.FEISHU_APP_SECRET = 'mock_app_secret'
    process.env.FEISHU_USER_ACCESS_TOKEN = 'mock_user_token'

    restoreFetch = mockFetch((url) => {
      // 认证接口
      if (url.includes('tenant_access_token')) {
        return { code: 0, tenant_access_token: 'mock_tenant_token', expire: 7200 }
      }
      // 文档读取
      if (url.includes('/docx/v1/documents/') && url.includes('/raw_content')) {
        return { code: 0, data: { content: '文档内容' } }
      }
      // 文档详情
      if (url.includes('/docx/v1/documents/') && !url.includes('raw_content') && !url.includes('blocks')) {
        return { code: 0, data: { document: { document_id: 'doc123', title: '测试文档' } } }
      }
      // 块列表
      if (url.includes('/blocks/') && url.includes('/children')) {
        return { code: 0, data: { items: [{ block_id: 'blk1', block_type: 2 }] } }
      }
      // Wiki 空间列表
      if (url.includes('/wiki/v2/spaces') && !url.includes('/nodes') && !url.includes('/members')) {
        return { code: 0, data: { items: [{ space_id: 'spc1', name: '测试空间' }] } }
      }
      // 默认成功
      return { code: 0, data: {} }
    })
  })

  afterAll(() => {
    restoreFetch()
  })

  describe('GET /api/lark/health', () => {
    it('should return health status', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/health', 'GET')

      expect(res.statusCode).toBe(200)
      expect(res.data.success).toBe(true)
      expect(res.data.connected).toBe(true)
    })
  })

  describe('GET /api/lark/doc/read', () => {
    it('should return 400 when document_id is missing', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/doc/read', 'GET')

      expect(res.statusCode).toBe(400)
      expect(res.data.code).toBe(-1)
      expect(res.data.msg).toContain('document_id')
    })

    it('should return document content when document_id is provided', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/doc/read', 'GET', {
        query: { document_id: 'doc123' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.data.code).toBe(0)
      expect(res.data.data).toBeDefined()
    })
  })

  describe('GET /api/lark/doc/meta', () => {
    it('should return document meta', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/doc/meta', 'GET', {
        query: { document_id: 'doc123' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.data.code).toBe(0)
      expect(res.data.data.document).toBeDefined()
    })
  })

  describe('POST /api/lark/doc/search', () => {
    it('should return 400 when search_key is missing', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/doc/search', 'POST', { body: {} })

      expect(res.statusCode).toBe(400)
      expect(res.data.code).toBe(-1)
      expect(res.data.msg).toContain('search_key')
    })

    it('should search docs when search_key is provided', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/doc/search', 'POST', {
        body: { search_key: 'test' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.data.code).toBe(0)
    })
  })

  describe('GET /api/lark/wiki/space/list', () => {
    it('should return wiki space list', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/wiki/space/list', 'GET')

      expect(res.statusCode).toBe(200)
      expect(res.data.code).toBe(0)
      expect(Array.isArray(res.data.data.items)).toBe(true)
    })
  })

  describe('GET /api/lark/user/search', () => {
    it('should return 400 when query is missing', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/user/search', 'POST', { body: {} })

      expect(res.statusCode).toBe(400)
      expect(res.data.code).toBe(-1)
      expect(res.data.msg).toContain('query')
    })

    it('should search user when query is provided', async () => {
      const { server, invoke } = createMockServer()
      registerLarkRoutes(server, createMockCtx())

      const res = await invoke('/api/lark/user/search', 'POST', {
        body: { query: 'zhangsan' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.data.code).toBe(0)
    })
  })
})
