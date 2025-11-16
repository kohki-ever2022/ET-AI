/**
 * Validators Utility Tests
 *
 * Tests for Zod-based validation functions
 */

import {
  ProjectSchema,
  ChannelSchema,
  ChatMessageSchema,
  FileUploadSchema,
  formatZodError,
  safeValidate,
} from '../../utils/validators';

describe('Validators', () => {
  describe('ProjectSchema', () => {
    it('should validate valid project data', () => {
      const validProject = {
        companyName: 'Test Company',
        industry: 'Technology',
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('should reject empty company name', () => {
      const invalidProject = {
        companyName: '',
        industry: 'Technology',
      };

      const result = ProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('should reject company name exceeding 100 characters', () => {
      const invalidProject = {
        companyName: 'A'.repeat(101),
        industry: 'Technology',
      };

      const result = ProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });
  });

  describe('ChannelSchema', () => {
    it('should validate valid channel data', () => {
      const validChannel = {
        name: 'Test Channel',
        category: 'integrated-report',
        visibility: {
          type: 'shared',
        },
      };

      const result = ChannelSchema.safeParse(validChannel);
      expect(result.success).toBe(true);
    });

    it('should reject empty channel name', () => {
      const invalidChannel = {
        name: '',
        category: 'integrated-report',
        visibility: {
          type: 'shared',
        },
      };

      const result = ChannelSchema.safeParse(invalidChannel);
      expect(result.success).toBe(false);
    });

    it('should validate personal visibility', () => {
      const validChannel = {
        name: 'Personal Channel',
        category: 'other',
        visibility: {
          type: 'personal',
        },
      };

      const result = ChannelSchema.safeParse(validChannel);
      expect(result.success).toBe(true);
    });
  });

  describe('ChatMessageSchema', () => {
    it('should validate valid chat message', () => {
      const validMessage = {
        userMessage: 'This is a test message',
      };

      const result = ChatMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject empty message', () => {
      const invalidMessage = {
        userMessage: '',
      };

      const result = ChatMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject message exceeding 50000 characters', () => {
      const invalidMessage = {
        userMessage: 'A'.repeat(50001),
      };

      const result = ChatMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('FileUploadSchema', () => {
    it('should validate valid PDF upload', () => {
      const validFile = {
        filename: 'document.pdf',
        contentType: 'application/pdf',
        size: 1024 * 1024, // 1MB
      };

      const result = FileUploadSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });

    it('should validate valid DOCX upload', () => {
      const validFile = {
        filename: 'document.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2 * 1024 * 1024, // 2MB
      };

      const result = FileUploadSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });

    it('should reject file exceeding 5MB', () => {
      const invalidFile = {
        filename: 'large.pdf',
        contentType: 'application/pdf',
        size: 6 * 1024 * 1024, // 6MB
      };

      const result = FileUploadSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it('should reject invalid content type', () => {
      const invalidFile = {
        filename: 'document.txt',
        contentType: 'text/plain',
        size: 1024,
      };

      const result = FileUploadSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });
  });

  describe('formatZodError', () => {
    it('should format Zod error messages', () => {
      const invalidData = {
        companyName: '',
      };

      const result = ProjectSchema.safeParse(invalidData);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('companyName');
        expect(typeof formatted).toBe('string');
      }
    });
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const validProject = {
        companyName: 'Test Company',
        industry: 'Technology',
      };

      const result = safeValidate(ProjectSchema, validProject);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.companyName).toBe('Test Company');
      }
    });

    it('should return error for invalid data', () => {
      const invalidProject = {
        companyName: '',
      };

      const result = safeValidate(ProjectSchema, invalidProject);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
