import { describe, it, expect } from 'vitest';
import { UploadMetadataSchema } from '../../src/server/schemas';

describe('UploadMetadataSchema', () => {
  it('should validate correct metadata', () => {
    const validData = {
      project_alias: 'my-project_123',
      profile: 'full-scan'
    };
    const result = UploadMetadataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid project_alias characters', () => {
    const invalidData = {
      project_alias: 'project/path',
      profile: 'full-scan'
    };
    const result = UploadMetadataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('alphanumeric');
    }
  });

  it('should reject project_alias too short', () => {
    const invalidData = {
      project_alias: 'ab',
      profile: 'full-scan'
    };
    const result = UploadMetadataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject project_alias too long', () => {
    const invalidData = {
      project_alias: 'a'.repeat(51),
      profile: 'full-scan'
    };
    const result = UploadMetadataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid profile characters', () => {
    const invalidData = {
      project_alias: 'valid-project',
      profile: 'scan_with_underscore' // profile schema is alphanumeric and hyphens only
    };
    const result = UploadMetadataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject path traversal attempts', () => {
    const invalidData = {
      project_alias: '../../etc/passwd',
      profile: 'full-scan'
    };
    const result = UploadMetadataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
  
  it('should reject SQL injection attempts', () => {
    const invalidData = {
      project_alias: 'DROP TABLE users',
      profile: 'full-scan'
    };
    const result = UploadMetadataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
