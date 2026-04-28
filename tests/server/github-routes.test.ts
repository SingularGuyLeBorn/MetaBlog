import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerGitHubRoutes } from '../../server/routes/external/github'
import { createMockServer } from './test-utils'

describe('GitHub BFF Routes', () => {
  let restoreFetch: (() => void) | null = null

  beforeEach(() => {
    // 保存原始 fetch
    const originalFetch = global.fetch

    // mock fetch 以验证后端是否正确转发请求
    global.fetch = vi.fn(async (url: string | URL | Request, options?: any) => {
      const urlStr = url.toString()

      // 验证 URL 是否正确构造
      if (urlStr.includes('api.github.com')) {
        // 模拟成功响应(包含 GitHub 工具执行层所需的全部字段)
        const mockBody = JSON.stringify({
          id: 123,
          full_name: 'test/repo',
          url: urlStr,
          name: 'test-repo',
          description: 'Test repository',
          stargazers_count: 42,
          forks_count: 7,
          open_issues_count: 3,
          language: 'TypeScript',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-06-01T00:00:00Z',
          html_url: 'https://github.com/test/repo',
          private: false,
          visibility: 'public',
          size: 1024,
          content: 'SGVsbG8gV29ybGQ=', // base64 of "Hello World"
          path: 'README.md',
          sha: 'abc123',
          user: { login: 'testuser' },
          commits: 5,
          additions: 10,
          deletions: 2,
          changed_files: 3,
          merged: false,
          mergeable: true,
          draft: false,
          number: 1,
          title: 'Test PR',
          state: 'open',
          body: 'Test body',
          head: { ref: 'feature' },
          base: { ref: 'main' },
          total_count: 100,
          items: [],
          workflows: [],
          workflow_runs: [],
          resources: {
            core: { limit: 5000, remaining: 4999, reset: 1700000000 },
            search: { limit: 30, remaining: 29, reset: 1700000000 }
          }
        })
        return new Response(mockBody, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      return new Response('Not Found', { status: 404 })
    }) as any

    restoreFetch = () => {
      global.fetch = originalFetch
    }
  })

  afterEach(() => {
    if (restoreFetch) restoreFetch()
    vi.restoreAllMocks()
  })

  it('should register /api/github route', () => {
    const { server, middlewares } = createMockServer()
    registerGitHubRoutes(server as any)
    const githubRoute = middlewares.find((mw) => mw.path === '/api/github')
    expect(githubRoute).toBeDefined()
  })

  it('should proxy GET /api/github/repos/owner/repo to GitHub API', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/repos/facebook/react', 'GET')

    expect(res.statusCode).toBe(200)
    expect(res.data).toMatchObject({
      id: 123,
      full_name: 'test/repo',
    })

    // 验证 fetch 被调用且 URL 正确
    const fetchCalls = (global.fetch as any).mock?.calls || []
    expect(fetchCalls.length).toBeGreaterThan(0)
    const [url] = fetchCalls[0]
    expect(url.toString()).toBe('https://api.github.com/repos/facebook/react')
  })

  it('should proxy GET with query params', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/search/code', 'GET', {
      query: { q: 'react language:typescript' },
    })

    expect(res.statusCode).toBe(200)

    const fetchCalls = (global.fetch as any).mock?.calls || []
    const [url] = fetchCalls[0]
    expect(url.toString()).toContain('api.github.com/search/code')
    expect(url.toString()).toContain('q=react+language%3Atypescript')
  })

  it('should proxy POST with JSON body', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const body = { title: 'Test Issue', body: 'Issue description' }
    const res = await invoke('/api/github/repos/owner/repo/issues', 'POST', {
      body,
    })

    expect(res.statusCode).toBe(200)

    const fetchCalls = (global.fetch as any).mock?.calls || []
    const [, options] = fetchCalls[0]
    expect(options.method).toBe('POST')
    expect(options.body).toBeDefined()
  })

  it('should inject Authorization header with GITHUB_TOKEN', async () => {
    const originalToken = process.env.GITHUB_TOKEN
    process.env.GITHUB_TOKEN = 'ghp_test_token_123'

    try {
      const { server, invoke } = createMockServer()
      registerGitHubRoutes(server as any)

      await invoke('/api/github/user/repos', 'GET')

      const fetchCalls = (global.fetch as any).mock?.calls || []
      const [, options] = fetchCalls[0]
      expect(options.headers['Authorization']).toBe('Bearer ghp_test_token_123')
    } finally {
      process.env.GITHUB_TOKEN = originalToken
    }
  })

  it('should handle 404 from GitHub API', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }) as any

    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/repos/nonexistent/repo', 'GET')
    expect(res.statusCode).toBe(404)
  })

  it('should handle proxy errors gracefully', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('Network error')
    }) as any

    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/repos/owner/repo', 'GET')
    expect(res.statusCode).toBe(500)
    expect(res.data.code).toBe(-1)
    expect(res.data.msg).toContain('GitHub BFF 代理错误')
  })

  // ─── 缓存测试 ───

  it('should cache GET responses and avoid duplicate fetch calls', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    // 第一次请求：转发到 GitHub API
    const res1 = await invoke('/api/github/repos/facebook/react', 'GET')
    expect(res1.statusCode).toBe(200)
    expect(res1.data).toMatchObject({ id: 123 })

    const fetchCallsAfterFirst = (global.fetch as any).mock?.calls?.length || 0
    expect(fetchCallsAfterFirst).toBeGreaterThan(0)

    // 第二次相同请求：命中缓存，不再调用 fetch
    const res2 = await invoke('/api/github/repos/facebook/react', 'GET')
    expect(res2.statusCode).toBe(200)
    expect(res2.data).toMatchObject({ id: 123 })

    const fetchCallsAfterSecond = (global.fetch as any).mock?.calls?.length || 0
    expect(fetchCallsAfterSecond).toBe(fetchCallsAfterFirst)
  })

  it('should not cache POST requests', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const body = { title: 'Test Issue' }

    // 第一次 POST
    const res1 = await invoke('/api/github/repos/owner/repo/issues', 'POST', { body })
    expect(res1.statusCode).toBe(200)

    const fetchCallsAfterFirst = (global.fetch as any).mock?.calls?.length || 0

    // 第二次相同 POST：不缓存，再次转发
    const res2 = await invoke('/api/github/repos/owner/repo/issues', 'POST', { body })
    expect(res2.statusCode).toBe(200)

    const fetchCallsAfterSecond = (global.fetch as any).mock?.calls?.length || 0
    expect(fetchCallsAfterSecond).toBe(fetchCallsAfterFirst + 1)
  })

  it('should not cache non-2xx GET responses', async () => {
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }) as any

    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    // 第一次 404
    const res1 = await invoke('/api/github/repos/nonexistent/repo', 'GET')
    expect(res1.statusCode).toBe(404)

    const fetchCallsAfterFirst = (global.fetch as any).mock?.calls?.length || 0
    expect(fetchCallsAfterFirst).toBe(1)

    // 第二次相同请求：不命中缓存，再次转发
    const res2 = await invoke('/api/github/repos/nonexistent/repo', 'GET')
    expect(res2.statusCode).toBe(404)

    const fetchCallsAfterSecond = (global.fetch as any).mock?.calls?.length || 0
    expect(fetchCallsAfterSecond).toBe(2)
  })

  // ─── 工具执行端点测试 ───

  it('should expose /api/github/tools/execute endpoint', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/tools/execute', 'POST', {
      body: { tool: 'githubGetRepo', params: { owner: 'facebook', repo: 'react' } }
    })

    expect(res.statusCode).toBe(200)
    expect(res.data.success).toBe(true)
    expect(res.data.data).toBeDefined()
    expect(res.data.toolName).toBe('githubGetRepo')
  })

  it('should return 400 for missing tool field', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/tools/execute', 'POST', {
      body: { params: { owner: 'facebook', repo: 'react' } }
    })

    expect(res.statusCode).toBe(400)
    expect(res.data.success).toBe(false)
    expect(res.data.error).toContain("Missing 'tool' field")
  })

  it('should return error for unknown tool', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/tools/execute', 'POST', {
      body: { tool: 'github_nonexistent_tool', params: {} }
    })

    expect(res.statusCode).toBe(400)
    expect(res.data.success).toBe(false)
    expect(res.data.error).toContain('Unknown tool')
  })

  it('should validate owner format via execute endpoint', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/tools/execute', 'POST', {
      body: { tool: 'githubGetRepo', params: { owner: 'user@invalid', repo: 'test' } }
    })

    expect(res.statusCode).toBe(400)
    expect(res.data.success).toBe(false)
    expect(res.data.message).toContain('所有者')
  })

  it('should list available tools at /api/github/tools', async () => {
    const { server, invoke } = createMockServer()
    registerGitHubRoutes(server as any)

    const res = await invoke('/api/github/tools', 'GET')

    expect(res.statusCode).toBe(200)
    expect(res.data.success).toBe(true)
    expect(Array.isArray(res.data.tools)).toBe(true)
    expect(res.data.tools).toContain('githubGetRepo')
    expect(res.data.tools).toContain('githubCreateIssue')
  })
})
