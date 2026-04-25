/**
 * 语雀 (Yuque) 后端路由测试
 *
 * 覆盖：参数校验、成功响应、错误处理
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { registerYuqueRoutes } from '../../server/routes/external/yuque'
import { createMockServer, createMockCtx, mockFetch } from './test-utils'

describe('Yuque Routes', () => {
  let restoreFetch: () => void

  beforeAll(() => {
    process.env.YUQUE_SESSION = 'mock_session'
    process.env.YUQUE_CTOKEN = 'mock_ctoken'

    restoreFetch = mockFetch((url) => {
      // 列出知识库
      if (url.includes('/api/books') && !url.includes('/toc') && !url.includes('/setting')) {
        return { data: [{ id: 1, name: '测试知识库', slug: 'test' }] }
      }
      // 知识库目录
      if (url.includes('/toc')) {
        return { data: { toc: [{ type: 'DOC', title: '文档1', url: 'doc1' }] } }
      }
      // 文档详情
      if (url.includes('/api/docs/')) {
        return { data: { id: 1, title: '测试文档', slug: 'doc1', content: '<!doctype lake>...' } }
      }
      // 图片上传
      if (url.includes('/api/upload/attach')) {
        return { data: { url: 'https://cdn.yuque.com/image.png', filekey: 'img123' } }
      }
      // 默认成功
      return { data: {} }
    })
  })

  afterAll(() => {
    restoreFetch()
  })

  describe('GET /api/yuque/health', () => {
    it('should return health status', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/health', 'GET')

      expect(res.statusCode).toBe(200)
      expect(res.data.success).toBe(true)
      expect(res.data.connected).toBe(true)
    })
  })

  describe('GET /api/yuque/repos', () => {
    it('should return repo list', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/repos', 'GET')

      expect(res.statusCode).toBe(200)
      expect(res.data.data).toBeDefined()
      expect(Array.isArray(res.data.data)).toBe(true)
    })
  })

  describe('GET /api/yuque/toc', () => {
    it('should return 400 when repo_id is missing', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/toc', 'GET')

      expect(res.statusCode).toBe(400)
      expect(res.data.code).toBe(-1)
      expect(res.data.msg).toContain('repo_id')
    })

    it('should return toc when repo_id is provided', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/toc', 'GET', {
        query: { repo_id: '1' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.data.data).toBeDefined()
    })
  })

  describe('GET /api/yuque/doc/read', () => {
    it('should return 400 when repo_id is missing', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/doc/read', 'GET')

      expect(res.statusCode).toBe(400)
      expect(res.data.code).toBe(-1)
    })

    it('should return document when repo_id and doc_slug are provided', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/doc/read', 'GET', {
        query: { repo_id: '1', doc_slug: 'doc1' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.data.data).toBeDefined()
    })
  })

  describe('POST /api/yuque/repo/create', () => {
    it('should return 400 when name is missing', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/repo/create', 'POST', {
        body: { slug: 'test' },
      })

      expect(res.statusCode).toBe(400)
      expect(res.data.code).toBe(-1)
      expect(res.data.msg).toContain('name')
    })

    it('should create repo when name and slug are provided', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/repo/create', 'POST', {
        body: { name: '测试', slug: 'test' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.data.data).toBeDefined()
    })
  })

  describe('DELETE /api/yuque/doc/delete', () => {
    it('should return 400 when repo_id is missing', async () => {
      const { server, invoke } = createMockServer()
      registerYuqueRoutes(server, createMockCtx())

      const res = await invoke('/api/yuque/doc/delete', 'DELETE', {
        body: { doc_id: '123' },
      })

      expect(res.statusCode).toBe(400)
      expect(res.data.code).toBe(-1)
      expect(res.data.msg).toContain('repo_id')
    })
  })
})
