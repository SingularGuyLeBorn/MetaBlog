/**
 * 后端路由测试辅助函数
 *
 * 模拟 ViteDevServer 的 middleware 系统,用于测试 registerLarkRoutes / registerYuqueRoutes. 
 */

import type { ViteDevServer } from 'vite'

export interface MockResponse {
  statusCode: number
  headers: Record<string, string>
  data: any
  ended: boolean
}

export interface MockServer {
  server: ViteDevServer
  middlewares: Array<{ path: string; handler: Function }>
  invoke: (path: string, method: string, options?: { body?: any; query?: Record<string, string> }) => Promise<MockResponse>
}

/**
 * 创建模拟的 ViteDevServer,收集通过 middlewares.use 注册的路由
 */
export function createMockServer(): MockServer {
  const middlewares: Array<{ path: string; handler: Function }> = []

  const server = {
    middlewares: {
      use: (path: string, handler: Function) => {
        middlewares.push({ path, handler })
      },
    },
  } as any

  const invoke = async (
    path: string,
    method: string,
    options?: { body?: any; query?: Record<string, string> }
  ): Promise<MockResponse> => {
    const fullPath = options?.query
      ? `${path}?${new URLSearchParams(options.query).toString()}`
      : path

    const req = createMockReq(method, fullPath, options?.body)
    const res = createMockRes()

    for (const mw of middlewares) {
      if (path.startsWith(mw.path) || mw.path === path) {
        let nextCalled = false
        const next = () => {
          nextCalled = true
        }
        await mw.handler(req, res, next)
        if (!nextCalled) {
          return res as MockResponse
        }
      }
    }

    throw new Error(`No route matched for ${method} ${path}`)
  }

  return { server, middlewares, invoke }
}

/**
 * 创建模拟 RouteContext
 */
export function createMockCtx() {
  return {
    system: {},
    structuredLog: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    gitCommit: () => {},
  }
}

/**
 * Mock global.fetch,用于拦截飞书/语雀 API 调用
 */
export function mockFetch(responseFn: (url: string, options: any) => { code: number; data?: any; msg?: string; status?: number }) {
  const originalFetch = global.fetch
  global.fetch = vi.fn(async (url: string | URL | Request, options?: any) => {
    const urlStr = url.toString()
    const result = responseFn(urlStr, options)
    const status = result.status ?? (result.code === 0 ? 200 : 400)
    return new Response(JSON.stringify(result), { status })
  }) as any
  return () => {
    global.fetch = originalFetch
  }
}

function createMockReq(method: string, url: string, body?: any) {
  const req: any = {
    method,
    url,
    headers: {},
    on: (event: string, cb: Function) => {
      if (event === 'data') {
        if (body) {
          cb(Buffer.from(JSON.stringify(body)))
        }
      }
      if (event === 'end') {
        cb()
      }
      if (event === 'error') {
        // no-op
      }
    },
  }
  return req
}

function createMockRes(): MockResponse {
  const res: any = {
    statusCode: 200,
    headers: {},
    data: null,
    ended: false,
    setHeader: (key: string, value: string) => {
      res.headers[key] = value
    },
    end: (data: string) => {
      res.ended = true
      try {
        res.data = JSON.parse(data)
      } catch {
        res.data = data
      }
    },
  }
  return res
}
