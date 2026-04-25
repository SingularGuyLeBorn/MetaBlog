import { describe, it, expect } from 'vitest'
import {
  encodeRefPath,
  encodeBase64,
  decodeBase64,
  GITHUB_API_BASE,
} from '../src/theme/tools/github/utils'

describe('GitHub Utils', () => {
  describe('GITHUB_API_BASE', () => {
    it('should point to backend BFF proxy', () => {
      expect(GITHUB_API_BASE).toBe('/api/github')
    })
  })

  describe('encodeRefPath', () => {
    it('should encode special characters in branch names', () => {
      expect(encodeRefPath('feature/test')).toBe('feature/test')
      expect(encodeRefPath('feature#test')).toBe('feature%23test')
      expect(encodeRefPath('release v1.0')).toBe('release%20v1.0')
    })

    it('should preserve path separators', () => {
      expect(encodeRefPath('a/b/c')).toBe('a/b/c')
    })
  })

  describe('encodeBase64 / decodeBase64', () => {
    it('should round-trip ASCII strings', () => {
      const original = 'Hello World'
      const encoded = encodeBase64(original)
      const decoded = decodeBase64(encoded)
      expect(decoded).toBe(original)
    })

    it('should round-trip Unicode strings', () => {
      const original = '你好世界 🌍'
      const encoded = encodeBase64(original)
      const decoded = decodeBase64(encoded)
      expect(decoded).toBe(original)
    })

    it('should round-trip empty string', () => {
      const original = ''
      const encoded = encodeBase64(original)
      const decoded = decodeBase64(encoded)
      expect(decoded).toBe(original)
    })

    it('should round-trip code content', () => {
      const original = 'const x = 1;\nconsole.log(x);'
      const encoded = encodeBase64(original)
      const decoded = decodeBase64(encoded)
      expect(decoded).toBe(original)
    })
  })
})
