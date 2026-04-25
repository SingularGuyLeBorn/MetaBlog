import { describe, it, expect } from 'vitest'
import {
  ALLOWED_SECTIONS,
  BLOCKED_SECTIONS,
  extractSection,
  validateSectionPath,
  validateNoTraversal,
  normalizeFilePath,
} from '../src/theme/tools/article/utils'

describe('Article Utils', () => {
  describe('ALLOWED_SECTIONS / BLOCKED_SECTIONS', () => {
    it('should define correct allowed sections', () => {
      expect(ALLOWED_SECTIONS).toEqual(['posts', 'knowledge', 'resources'])
    })

    it('should define correct blocked sections', () => {
      expect(BLOCKED_SECTIONS).toEqual(['about', 'ai-research'])
    })
  })

  describe('extractSection', () => {
    it('should extract section from sections/ prefix path', () => {
      expect(extractSection('sections/posts/my-article.md')).toBe('posts')
    })

    it('should extract section from leading slash path', () => {
      // /sections/knowledge/... → after removing leading / → sections/knowledge/...
      // extractSection removes sections/ first, then leading /, so this returns "knowledge"
      expect(extractSection('/knowledge/deep-learning.md')).toBe('knowledge')
    })

    it('should return the whole string if no slash', () => {
      expect(extractSection('resources')).toBe('resources')
    })

    it('should handle empty string', () => {
      expect(extractSection('')).toBe('')
    })

    it('should handle path without sections/ prefix', () => {
      expect(extractSection('posts/article.md')).toBe('posts')
    })
  })

  describe('validateSectionPath', () => {
    it('should validate allowed sections', () => {
      expect(validateSectionPath('sections/posts/test.md').valid).toBe(true)
      expect(validateSectionPath('sections/knowledge/ai.md').valid).toBe(true)
      expect(validateSectionPath('sections/resources/link.md').valid).toBe(true)
    })

    it('should reject blocked sections', () => {
      const result = validateSectionPath('sections/about/me.md')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不允许AI操作')
    })

    it('should reject unknown sections', () => {
      const result = validateSectionPath('sections/unknown/file.md')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不存在')
    })

    it('should handle empty path', () => {
      const result = validateSectionPath('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('无法从路径中识别板块')
    })
  })

  describe('validateNoTraversal', () => {
    it('should allow safe paths', () => {
      expect(validateNoTraversal('sections/posts/article.md').valid).toBe(true)
      expect(validateNoTraversal('posts/test.md').valid).toBe(true)
    })

    it('should reject paths with directory traversal', () => {
      const result = validateNoTraversal('sections/posts/../../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('..')
    })
  })

  describe('normalizeFilePath', () => {
    it('should add sections/ prefix if missing', () => {
      expect(normalizeFilePath('posts/article.md')).toBe('sections/posts/article.md')
    })

    it('should remove leading slash', () => {
      expect(normalizeFilePath('/sections/posts/article.md')).toBe('sections/posts/article.md')
    })

    it('should convert folder path to folder/index.md', () => {
      expect(normalizeFilePath('posts/my-folder')).toBe('sections/posts/my-folder/index.md')
    })

    it('should add index.md for trailing slash', () => {
      expect(normalizeFilePath('posts/my-folder/')).toBe('sections/posts/my-folder/index.md')
    })

    it('should preserve .md suffix', () => {
      expect(normalizeFilePath('sections/posts/article.md')).toBe('sections/posts/article.md')
    })

    it('should handle empty string', () => {
      expect(normalizeFilePath('')).toBe('')
    })
  })
})
