import { describe, it, expect } from 'vitest'
import { translateGitHubError } from '../../server/utils/github-error-translator'

describe('GitHub Error Translator (Backend)', () => {
  it('should translate 401 errors', () => {
    const result = translateGitHubError('GitHub API 401: Bad credentials')
    expect(result.message).toContain('Token 无效')
    expect(result.suggestion).toContain('GITHUB_TOKEN')
  })

  it('should translate 403 rate limit errors', () => {
    const result = translateGitHubError('GitHub API 403: rate limit exceeded')
    expect(result.message).toContain('速率限制')
    expect(result.suggestion).toContain('GITHUB_TOKEN')
  })

  it('should translate 403 non-rate-limit errors', () => {
    const result = translateGitHubError('GitHub API 403: Forbidden')
    expect(result.message).toContain('没有权限')
  })

  it('should translate 404 errors', () => {
    const result = translateGitHubError('GitHub API 404: Not Found')
    expect(result.message).toContain('不存在')
  })

  it('should translate 405 errors', () => {
    const result = translateGitHubError('GitHub API 405: Method Not Allowed')
    expect(result.message).toContain('不被允许')
  })

  it('should translate 409 errors', () => {
    const result = translateGitHubError('GitHub API 409: Conflict')
    expect(result.message).toContain('冲突')
  })

  it('should translate 422 errors', () => {
    const result = translateGitHubError('GitHub API 422: Validation Failed')
    expect(result.message).toContain('参数验证失败')
  })

  it('should translate 429 errors', () => {
    const result = translateGitHubError('GitHub API 429: Too Many Requests')
    expect(result.message).toContain('过于频繁')
  })

  it('should translate 500/502/503 errors', () => {
    expect(translateGitHubError('GitHub API 500: Internal').message).toContain('服务器内部错误')
    expect(translateGitHubError('GitHub API 502: Bad Gateway').message).toContain('网关错误')
    expect(translateGitHubError('GitHub API 503: Service Unavailable').message).toContain('维护中')
  })

  it('should return original message for unknown errors', () => {
    const msg = 'Some random error'
    const result = translateGitHubError(msg)
    expect(result.message).toBe(msg)
  })
})
