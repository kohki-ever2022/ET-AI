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
  SystemPromptSchema,
  UserEmailSchema,
  UserRoleSchema,
  formatZodError,
  safeValidate,
  validateFileExtension,
  validateFileSize,
  validateTextLength,
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
        expect((result as { success: false; error: string }).error).toBeTruthy();
        expect(typeof (result as { success: false; error: string }).error).toBe('string');
      }
    });
  });

  describe('validateFileExtension - Specification: Validate allowed file extensions', () => {
    it('should accept .pdf files', () => {
      expect(validateFileExtension('document.pdf')).toBe(true);
    });

    it('should accept .docx files', () => {
      expect(validateFileExtension('report.docx')).toBe(true);
    });

    it('should accept .PDF files (uppercase)', () => {
      expect(validateFileExtension('document.PDF')).toBe(true);
    });

    it('should accept .DOCX files (uppercase)', () => {
      expect(validateFileExtension('report.DOCX')).toBe(true);
    });

    it('should reject .txt files', () => {
      expect(validateFileExtension('file.txt')).toBe(false);
    });

    it('should reject .jpg files', () => {
      expect(validateFileExtension('image.jpg')).toBe(false);
    });

    it('should reject .xlsx files', () => {
      expect(validateFileExtension('spreadsheet.xlsx')).toBe(false);
    });

    it('should reject files without extension', () => {
      expect(validateFileExtension('noextension')).toBe(false);
    });

    it('should handle files with multiple dots', () => {
      expect(validateFileExtension('my.file.name.pdf')).toBe(true);
      expect(validateFileExtension('my.file.name.txt')).toBe(false);
    });

    it('should reject empty filename', () => {
      expect(validateFileExtension('')).toBe(false);
    });

    it('should handle mixed case extensions', () => {
      expect(validateFileExtension('document.PdF')).toBe(true);
      expect(validateFileExtension('report.DoCx')).toBe(true);
    });
  });

  describe('validateFileSize - Specification: Validate file size limits', () => {
    const MB = 1024 * 1024;

    it('should accept file under default 5MB limit', () => {
      expect(validateFileSize(3 * MB)).toBe(true);
    });

    it('should accept file at exactly 5MB (default limit)', () => {
      expect(validateFileSize(5 * MB)).toBe(true);
    });

    it('should reject file over 5MB (default limit)', () => {
      expect(validateFileSize(6 * MB)).toBe(false);
    });

    it('should accept very small files', () => {
      expect(validateFileSize(1024)).toBe(true); // 1KB
    });

    it('should accept 0 byte file', () => {
      expect(validateFileSize(0)).toBe(true);
    });

    it('should accept file under custom limit (10MB)', () => {
      expect(validateFileSize(8 * MB, 10)).toBe(true);
    });

    it('should accept file at exactly custom limit (10MB)', () => {
      expect(validateFileSize(10 * MB, 10)).toBe(true);
    });

    it('should reject file over custom limit (10MB)', () => {
      expect(validateFileSize(11 * MB, 10)).toBe(false);
    });

    it('should work with custom limit of 1MB', () => {
      expect(validateFileSize(0.5 * MB, 1)).toBe(true);
      expect(validateFileSize(1 * MB, 1)).toBe(true);
      expect(validateFileSize(1.5 * MB, 1)).toBe(false);
    });

    it('should handle very large custom limits (100MB)', () => {
      expect(validateFileSize(50 * MB, 100)).toBe(true);
      expect(validateFileSize(101 * MB, 100)).toBe(false);
    });
  });

  describe('validateTextLength - Specification: Validate text token limits', () => {
    it('should accept short text well under limit', () => {
      expect(validateTextLength('Short text')).toBe(true);
    });

    it('should accept empty text', () => {
      expect(validateTextLength('')).toBe(true);
    });

    it('should accept text at approximately 150000 tokens (default)', () => {
      // 150000 tokens * 0.7 chars/token = 105000 chars
      const text = 'a'.repeat(105000);
      expect(validateTextLength(text)).toBe(true);
    });

    it('should reject text over 150000 tokens (default)', () => {
      // Over 150000 tokens: 150001 * 0.7 = 105001 chars
      const text = 'a'.repeat(110000);
      expect(validateTextLength(text)).toBe(false);
    });

    it('should accept text under custom limit (1000 tokens)', () => {
      // 1000 tokens * 0.7 = 700 chars
      const text = 'a'.repeat(600);
      expect(validateTextLength(text, 1000)).toBe(true);
    });

    it('should reject text over custom limit (1000 tokens)', () => {
      // Over 1000 tokens: 1001 * 0.7 = 700.7 chars
      const text = 'a'.repeat(800);
      expect(validateTextLength(text, 1000)).toBe(false);
    });

    it('should handle Japanese text estimation', () => {
      // Japanese characters: estimate is chars / 0.7
      const japaneseText = 'こんにちは'.repeat(100); // 500 chars
      // Estimated tokens: 500 / 0.7 = ~714 tokens
      expect(validateTextLength(japaneseText, 1000)).toBe(true);
      expect(validateTextLength(japaneseText, 500)).toBe(false);
    });

    it('should handle very small custom limits', () => {
      expect(validateTextLength('hello', 10)).toBe(true);
      expect(validateTextLength('hello world this is long', 10)).toBe(false);
    });

    it('should handle mixed English and Japanese text', () => {
      const mixedText = 'Hello こんにちは World 世界'.repeat(50);
      expect(validateTextLength(mixedText, 5000)).toBe(true);
    });
  });

  describe('SystemPromptSchema - Specification: Validate system prompt structure', () => {
    it('should validate valid system prompt with ir-framework category', () => {
      const validPrompt = {
        category: 'ir-framework',
        title: 'IR Framework Prompt',
        content: 'Content about IR framework',
        changeDescription: 'Initial setup',
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should validate valid system prompt with tcfd category', () => {
      const validPrompt = {
        category: 'tcfd',
        title: 'TCFD Prompt',
        content: 'Content about TCFD',
        changeDescription: 'Updated TCFD guidelines',
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should validate valid system prompt with human-capital category', () => {
      const validPrompt = {
        category: 'human-capital',
        title: 'Human Capital Prompt',
        content: 'Content about human capital',
        changeDescription: 'Added human capital metrics',
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should validate valid system prompt with sx-concept category', () => {
      const validPrompt = {
        category: 'sx-concept',
        title: 'SX Concept Prompt',
        content: 'Content about SX concept',
        changeDescription: 'Updated SX framework',
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should accept minimum length strings', () => {
      const validPrompt = {
        category: 'ir-framework',
        title: 'T',
        content: 'C',
        changeDescription: 'D',
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should accept maximum length title (200 chars)', () => {
      const validPrompt = {
        category: 'tcfd',
        title: 'A'.repeat(200),
        content: 'Content',
        changeDescription: 'Description',
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should accept maximum length content (10000 chars)', () => {
      const validPrompt = {
        category: 'human-capital',
        title: 'Title',
        content: 'C'.repeat(10000),
        changeDescription: 'Description',
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should accept maximum length changeDescription (500 chars)', () => {
      const validPrompt = {
        category: 'sx-concept',
        title: 'Title',
        content: 'Content',
        changeDescription: 'D'.repeat(500),
      };

      const result = SystemPromptSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      const invalidPrompt = {
        category: 'invalid-category',
        title: 'Title',
        content: 'Content',
        changeDescription: 'Description',
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const invalidPrompt = {
        category: 'ir-framework',
        title: '',
        content: 'Content',
        changeDescription: 'Description',
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding 200 chars', () => {
      const invalidPrompt = {
        category: 'tcfd',
        title: 'A'.repeat(201),
        content: 'Content',
        changeDescription: 'Description',
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const invalidPrompt = {
        category: 'human-capital',
        title: 'Title',
        content: '',
        changeDescription: 'Description',
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding 10000 chars', () => {
      const invalidPrompt = {
        category: 'sx-concept',
        title: 'Title',
        content: 'C'.repeat(10001),
        changeDescription: 'Description',
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should reject empty changeDescription', () => {
      const invalidPrompt = {
        category: 'ir-framework',
        title: 'Title',
        content: 'Content',
        changeDescription: '',
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should reject changeDescription exceeding 500 chars', () => {
      const invalidPrompt = {
        category: 'tcfd',
        title: 'Title',
        content: 'Content',
        changeDescription: 'D'.repeat(501),
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const invalidPrompt = {
        category: 'ir-framework',
        title: 'Title',
      };

      const result = SystemPromptSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });
  });

  describe('UserEmailSchema - Specification: Validate email addresses', () => {
    it('should validate standard email address', () => {
      const result = UserEmailSchema.safeParse('user@example.com');
      expect(result.success).toBe(true);
    });

    it('should validate email with subdomain', () => {
      const result = UserEmailSchema.safeParse('user@mail.example.com');
      expect(result.success).toBe(true);
    });

    it('should validate email with plus addressing', () => {
      const result = UserEmailSchema.safeParse('user+tag@example.com');
      expect(result.success).toBe(true);
    });

    it('should validate email with dots in local part', () => {
      const result = UserEmailSchema.safeParse('first.last@example.com');
      expect(result.success).toBe(true);
    });

    it('should validate email with numbers', () => {
      const result = UserEmailSchema.safeParse('user123@example456.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email without @', () => {
      const result = UserEmailSchema.safeParse('userexample.com');
      expect(result.success).toBe(false);
    });

    it('should reject invalid email without domain', () => {
      const result = UserEmailSchema.safeParse('user@');
      expect(result.success).toBe(false);
    });

    it('should reject invalid email without local part', () => {
      const result = UserEmailSchema.safeParse('@example.com');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = UserEmailSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject email with spaces', () => {
      const result = UserEmailSchema.safeParse('user name@example.com');
      expect(result.success).toBe(false);
    });
  });

  describe('UserRoleSchema - Specification: Validate user roles', () => {
    it('should validate "admin" role', () => {
      const result = UserRoleSchema.safeParse('admin');
      expect(result.success).toBe(true);
    });

    it('should validate "employee" role', () => {
      const result = UserRoleSchema.safeParse('employee');
      expect(result.success).toBe(true);
    });

    it('should reject "user" role (not in allowed list)', () => {
      const result = UserRoleSchema.safeParse('user');
      expect(result.success).toBe(false);
    });

    it('should reject "manager" role (not in allowed list)', () => {
      const result = UserRoleSchema.safeParse('manager');
      expect(result.success).toBe(false);
    });

    it('should reject "ADMIN" (uppercase)', () => {
      const result = UserRoleSchema.safeParse('ADMIN');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = UserRoleSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject invalid role type', () => {
      const result = UserRoleSchema.safeParse('superuser');
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = UserRoleSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined', () => {
      const result = UserRoleSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });
});
