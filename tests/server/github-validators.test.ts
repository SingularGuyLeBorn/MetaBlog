import { describe, it, expect } from 'vitest'
import {
  validateOwner,
  validateRepo,
  validateOwnerRepo,
  validatePath,
  validateNumber,
  validateQuery,
} from '../../server/utils/github-validators'

describe('GitHub Validators', () => {
  describe('validateOwner', () => {
    it('should accept valid usernames', () => {
      expect(validateOwner('facebook').valid).toBe(true)
      expect(validateOwner('octocat').valid).toBe(true)
      expect(validateOwner('my-org').valid).toBe(true)
    })

    it('should reject missing owner', () => {
      const result = validateOwner('')
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('MISSING_OWNER')
    })

    it('should reject too long owner', () => {
      const result = validateOwner('a'.repeat(40))
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('OWNER_TOO_LONG')
    })

    it('should reject invalid characters', () => {
      const result = validateOwner('user@name')
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('INVALID_OWNER')
    })
  })

  describe('validateRepo', () => {
    it('should accept valid repo names', () => {
      expect(validateRepo('react').valid).toBe(true)
      expect(validateRepo('my-repo').valid).toBe(true)
      expect(validateRepo('repo.name').valid).toBe(true)
    })

    it('should reject missing repo', () => {
      const result = validateRepo('')
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('MISSING_REPO')
    })

    it('should reject too long repo', () => {
      const result = validateRepo('a'.repeat(101))
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('REPO_TOO_LONG')
    })
  })

  describe('validatePath', () => {
    it('should accept valid paths', () => {
      expect(validatePath('src/index.ts').valid).toBe(true)
      expect(validatePath('').valid).toBe(true)
    })

    it('should reject directory traversal', () => {
      const result = validatePath('../etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('PATH_TRAVERSAL')
    })

    it('should reject absolute paths', () => {
      const result = validatePath('/etc/passwd')
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('PATH_TRAVERSAL')
    })
  })

  describe('validateNumber', () => {
    it('should accept positive integers', () => {
      expect(validateNumber(1).valid).toBe(true)
      expect(validateNumber(100).valid).toBe(true)
    })

    it('should reject non-integers', () => {
      expect(validateNumber(0).valid).toBe(false)
      expect(validateNumber(-1).valid).toBe(false)
      expect(validateNumber(1.5).valid).toBe(false)
    })
  })

  describe('validateQuery', () => {
    it('should accept valid queries', () => {
      expect(validateQuery('react').valid).toBe(true)
    })

    it('should reject empty query', () => {
      const result = validateQuery('')
      expect(result.valid).toBe(false)
      expect(result.error?.code).toBe('MISSING_QUERY')
    })
  })
})
