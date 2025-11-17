/**
 * Auth Service Tests
 *
 * Tests for authentication and authorization (RBAC) functionality
 */

import {
  validateEmailDomain,
  canRegister,
  determineRole,
  canCreateProject,
  canDeleteProject,
  canUpdateSystemPrompt,
  canViewProject,
  canEditChannel,
  canApproveChat,
} from '../../services/authService';
import type { User } from '../../types/firestore';

describe('Auth Service', () => {
  describe('validateEmailDomain', () => {
    it('should allow @trias.co.jp emails', () => {
      const validEmails = [
        'user@trias.co.jp',
        'admin@trias.co.jp',
        'test.user@trias.co.jp',
      ];

      validEmails.forEach((email) => {
        expect(validateEmailDomain(email)).toBe(true);
      });
    });

    it('should reject non-@trias.co.jp emails', () => {
      const invalidEmails = [
        'user@gmail.com',
        'admin@example.com',
        'test@otherdomain.jp',
        'user@trias.jp',
        'user@trias.co.com',
      ];

      invalidEmails.forEach((email) => {
        expect(validateEmailDomain(email)).toBe(false);
      });
    });

    it('should reject malformed emails', () => {
      const malformedEmails = [
        'notanemail',
        '@trias.co.jp',
        'user@',
        'user',
        '',
      ];

      malformedEmails.forEach((email) => {
        expect(validateEmailDomain(email)).toBe(false);
      });
    });
  });

  describe('canRegister', () => {
    it('should allow registration for valid @trias.co.jp emails', () => {
      const result = canRegister('user@trias.co.jp');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject registration for invalid domains', () => {
      const result = canRegister('user@gmail.com');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('@trias.co.jp');
    });

    it('should provide helpful error message', () => {
      const result = canRegister('invalid@example.com');

      expect(result.reason).toContain('許可されています');
    });
  });

  describe('determineRole', () => {
    it('should assign admin role to admin@trias.co.jp', () => {
      const role = determineRole('admin@trias.co.jp');
      expect(role).toBe('admin');
    });

    it('should assign employee role to regular users', () => {
      const emails = [
        'user@trias.co.jp',
        'test@trias.co.jp',
        'developer@trias.co.jp',
      ];

      emails.forEach((email) => {
        const role = determineRole(email);
        expect(role).toBe('employee');
      });
    });

    it('should be case-insensitive for admin emails', () => {
      const variations = [
        'ADMIN@trias.co.jp',
        'Admin@trias.co.jp',
        'admin@TRIAS.co.jp',
      ];

      variations.forEach((email) => {
        const role = determineRole(email);
        expect(role).toBe('admin');
      });
    });
  });

  describe('canCreateProject', () => {
    it('should allow admin to create projects', () => {
      const adminUser: User = {
        uid: 'user-1',
        email: 'admin@trias.co.jp',
        displayName: 'Admin User',
        role: 'admin',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canCreateProject(adminUser)).toBe(true);
    });

    it('should not allow employee to create projects', () => {
      const employeeUser: User = {
        uid: 'user-2',
        email: 'employee@trias.co.jp',
        displayName: 'Employee User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canCreateProject(employeeUser)).toBe(false);
    });
  });

  describe('canDeleteProject', () => {
    it('should allow admin to delete projects', () => {
      const adminUser: User = {
        uid: 'user-1',
        email: 'admin@trias.co.jp',
        displayName: 'Admin User',
        role: 'admin',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canDeleteProject(adminUser)).toBe(true);
    });

    it('should not allow employee to delete projects', () => {
      const employeeUser: User = {
        uid: 'user-2',
        email: 'employee@trias.co.jp',
        displayName: 'Employee User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canDeleteProject(employeeUser)).toBe(false);
    });
  });

  describe('canUpdateSystemPrompt', () => {
    it('should allow admin to update system prompts', () => {
      const adminUser: User = {
        uid: 'user-1',
        email: 'admin@trias.co.jp',
        displayName: 'Admin User',
        role: 'admin',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canUpdateSystemPrompt(adminUser)).toBe(true);
    });

    it('should not allow employee to update system prompts', () => {
      const employeeUser: User = {
        uid: 'user-2',
        email: 'employee@trias.co.jp',
        displayName: 'Employee User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canUpdateSystemPrompt(employeeUser)).toBe(false);
    });
  });

  describe('canViewProject', () => {
    const mockProject = {
      id: 'project-1',
      companyName: 'Test Company',
      industry: 'Technology',
      members: ['user-1', 'user-2'],
      createdBy: 'user-1',
      createdAt: { seconds: 0, nanoseconds: 0 } as any,
      updatedAt: { seconds: 0, nanoseconds: 0 } as any,
    };

    it('should allow admin to view any project', () => {
      const adminUser: User = {
        uid: 'admin-user',
        email: 'admin@trias.co.jp',
        displayName: 'Admin User',
        role: 'admin',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canViewProject(adminUser, mockProject)).toBe(true);
    });

    it('should allow project member to view project', () => {
      const memberUser: User = {
        uid: 'user-1',
        email: 'member@trias.co.jp',
        displayName: 'Member User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canViewProject(memberUser, mockProject)).toBe(true);
    });

    it('should not allow non-member employee to view project', () => {
      const nonMemberUser: User = {
        uid: 'user-999',
        email: 'other@trias.co.jp',
        displayName: 'Other User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canViewProject(nonMemberUser, mockProject)).toBe(false);
    });
  });

  describe('canEditChannel', () => {
    const sharedChannel = {
      id: 'channel-1',
      projectId: 'project-1',
      name: 'Shared Channel',
      category: 'integrated-report' as const,
      visibility: {
        type: 'shared' as const,
      },
      createdBy: 'user-1',
      createdAt: { seconds: 0, nanoseconds: 0 } as any,
      updatedAt: { seconds: 0, nanoseconds: 0 } as any,
    };

    const personalChannel = {
      ...sharedChannel,
      id: 'channel-2',
      name: 'Personal Channel',
      visibility: {
        type: 'personal' as const,
      },
    };

    it('should allow creator to edit personal channel', () => {
      const creatorUser: User = {
        uid: 'user-1',
        email: 'creator@trias.co.jp',
        displayName: 'Creator User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canEditChannel(creatorUser, personalChannel)).toBe(true);
    });

    it('should not allow non-creator to edit personal channel', () => {
      const otherUser: User = {
        uid: 'user-2',
        email: 'other@trias.co.jp',
        displayName: 'Other User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canEditChannel(otherUser, personalChannel)).toBe(false);
    });

    it('should allow creator to edit shared channel', () => {
      const creatorUser: User = {
        uid: 'user-1',
        email: 'creator@trias.co.jp',
        displayName: 'Creator User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canEditChannel(creatorUser, sharedChannel)).toBe(true);
    });

    it('should allow admin to edit any channel', () => {
      const adminUser: User = {
        uid: 'admin-user',
        email: 'admin@trias.co.jp',
        displayName: 'Admin User',
        role: 'admin',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canEditChannel(adminUser, personalChannel)).toBe(true);
      expect(canEditChannel(adminUser, sharedChannel)).toBe(true);
    });
  });

  describe('canApproveChat', () => {
    it('should allow admin to approve chats', () => {
      const adminUser: User = {
        uid: 'admin-user',
        email: 'admin@trias.co.jp',
        displayName: 'Admin User',
        role: 'admin',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canApproveChat(adminUser)).toBe(true);
    });

    it('should not allow employee to approve chats', () => {
      const employeeUser: User = {
        uid: 'user-1',
        email: 'employee@trias.co.jp',
        displayName: 'Employee User',
        role: 'employee',
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        lastLoginAt: { seconds: 0, nanoseconds: 0 } as any,
      };

      expect(canApproveChat(employeeUser)).toBe(false);
    });
  });
});
