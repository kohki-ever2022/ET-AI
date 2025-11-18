/**
 * Firebase Service Tests
 *
 * Tests for Firebase service layer functions (in-memory implementation).
 * Covers:
 * - Listener operations (onSnapshot)
 * - Document operations (addDoc, updateDoc)
 * - Chat operations (addChatDoc, updateChatDoc, deleteChatDoc)
 * - Project operations (createProject, getProject, updateProject)
 * - Channel operations (createChannel, getChannelMessages)
 * - Message operations (sendMessage, markMessageAsApproved)
 */

// Mock uuid before importing the service
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

import {
  onSnapshot,
  addDoc,
  updateDoc,
  addChatDoc,
  updateChatDoc,
  deleteChatDoc,
  createProject,
  getProject,
  updateProject,
  createChannel,
  getChannelMessages,
  sendMessage,
  markMessageAsApproved,
} from '../../services/firebaseService';

describe('firebaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onSnapshot - Specification: Should register listeners for real-time updates', () => {
    it('should register a listener for projects collection', () => {
      const callback = jest.fn();
      onSnapshot('projects', callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should register a listener for users collection', () => {
      const callback = jest.fn();
      onSnapshot('users', callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should register a listener for knowledge collection', () => {
      const callback = jest.fn();
      onSnapshot('knowledge', callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return an unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = onSnapshot('projects', callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow multiple listeners on same collection', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      onSnapshot('projects', callback1);
      onSnapshot('projects', callback2);
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('addDoc - Specification: Should add documents to collections', () => {
    it('should add a document to users collection', async () => {
      const result = await addDoc('users', {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        customClaims: { role: 'employee' },
      });
      expect(result.id).toBe('test-uuid-123');
    });

    it('should add a document to knowledge collection', async () => {
      const result = await addDoc('knowledge', {
        projectId: 'proj-123',
        content: 'Test knowledge',
        category: 'financial',
      });
      expect(result.id).toBe('test-uuid-123');
    });

    it('should notify listeners after adding', async () => {
      const callback = jest.fn();
      onSnapshot('users', callback);
      callback.mockClear();
      await addDoc('users', { uid: 'new', email: 'new@test.com', displayName: 'New', customClaims: {} });
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('updateDoc - Specification: Should update existing documents', () => {
    it('should update a project document', async () => {
      await updateDoc('projects', 'proj-1', { companyName: 'Updated' });
      const project = await getProject('proj-1');
      expect(project?.companyName).toBe('Updated');
    });

    it('should notify listeners after update', async () => {
      const callback = jest.fn();
      onSnapshot('projects', callback);
      callback.mockClear();
      await updateDoc('projects', 'proj-1', { companyName: 'Updated' });
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('addChatDoc - Specification: Should add chat messages to channels', () => {
    it('should add a chat and return full chat object', async () => {
      const result = await addChatDoc('proj-1', 'chan-1-1', {
        userId: 'user-123',
        userName: 'Test',
        userMessage: 'Test',
        aiResponse: 'Response',
        characterCount: 10,
        referencedKnowledge: [],
        referencedDocuments: [],
        approved: false,
        modifications: [],
        addedToKnowledge: false,
      });
      expect(result).toHaveProperty('id');
      expect(result?.id).toBe('test-uuid-123');
    });

    it('should return null for non-existent project', async () => {
      const result = await addChatDoc('non-existent', 'chan', {
        userId: 'test',
        userName: 'Test',
        userMessage: 'Test',
        aiResponse: 'Test',
        characterCount: 10,
        referencedKnowledge: [],
        referencedDocuments: [],
        approved: false,
        modifications: [],
        addedToKnowledge: false,
      });
      expect(result).toBeNull();
    });
  });

  describe('updateChatDoc - Specification: Should update chat messages', () => {
    it('should update a chat', async () => {
      await updateChatDoc('proj-1', 'chan-1-1', 'chat-1-1-1', { approved: false });
      const messages = await getChannelMessages('proj-1', 'chan-1-1');
      const chat = messages.find(m => m.id === 'chat-1-1-1');
      expect(chat?.approved).toBe(false);
    });
  });

  describe('deleteChatDoc - Specification: Should delete chat messages', () => {
    it('should delete a chat', async () => {
      await deleteChatDoc('proj-1', 'chan-1-1', 'chat-1-1-1');
      const messages = await getChannelMessages('proj-1', 'chan-1-1');
      expect(messages.find(m => m.id === 'chat-1-1-1')).toBeUndefined();
    });
  });

  describe('createProject - Specification: Should create projects', () => {
    it('should create and return full project', async () => {
      const result = await createProject({
        companyName: 'New',
        industry: 'Tech',
        fiscalYearEnd: '12月',
        members: [],
        knowledgeVersion: 1,
        createdBy: 'user-123',
        lastActivity: new Date(),
        documents: [],
        channels: [],
      });
      expect(result.id).toBe('test-uuid-123');
      expect(result.companyName).toBe('New');
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getProject - Specification: Should retrieve projects', () => {
    it('should get existing project', async () => {
      const project = await getProject('proj-1');
      expect(project).not.toBeNull();
      expect(project?.id).toBe('proj-1');
    });

    it('should return null for non-existent', async () => {
      const project = await getProject('non-existent');
      expect(project).toBeNull();
    });
  });

  describe('updateProject - Specification: Should update projects', () => {
    it('should update fields', async () => {
      await updateProject('proj-1', { companyName: 'Updated' });
      const project = await getProject('proj-1');
      expect(project?.companyName).toBe('Updated');
    });

    it('should update timestamp', async () => {
      const before = await getProject('proj-1');
      await new Promise(r => setTimeout(r, 10));
      await updateProject('proj-1', { companyName: 'X' });
      const after = await getProject('proj-1');
      expect(after?.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime());
    });

    it('should return null for non-existent', async () => {
      const result = await updateProject('non-existent', { companyName: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('createChannel - Specification: Should create channels', () => {
    it('should create and return full channel', async () => {
      const result = await createChannel('proj-1', {
        projectId: 'proj-1',
        name: 'New',
        category: 'qa',
        visibility: { type: 'shared', viewableBy: [] },
        status: 'draft',
        createdBy: 'user-123',
        lastActivity: new Date(),
        chats: [],
        context: null,
        draft: '',
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-uuid-123');
      expect(result?.name).toBe('New');
    });

    it('should return null for non-existent project', async () => {
      const result = await createChannel('non-existent', {
        projectId: 'non-existent',
        name: 'Test',
        category: 'qa',
        visibility: { type: 'shared', viewableBy: [] },
        status: 'draft',
        createdBy: 'user-123',
        lastActivity: new Date(),
        chats: [],
        context: null,
        draft: '',
      });
      expect(result).toBeNull();
    });
  });

  describe('getChannelMessages - Specification: Should retrieve messages', () => {
    it('should get messages', async () => {
      const messages = await getChannelMessages('proj-1', 'chan-1-1');
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent', async () => {
      const messages = await getChannelMessages('non-existent', 'x');
      expect(messages).toEqual([]);
    });
  });

  describe('sendMessage - Specification: Should send messages', () => {
    it('should send and return full message', async () => {
      const result = await sendMessage('proj-1', 'chan-1-1', {
        userId: 'user-123',
        userName: 'Test',
        userMessage: 'Msg',
        aiResponse: 'Reply',
        characterCount: 10,
        referencedKnowledge: [],
        referencedDocuments: [],
        approved: false,
        modifications: [],
        addedToKnowledge: false,
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-uuid-123');
    });
  });

  describe('markMessageAsApproved - Specification: Should approve messages', () => {
    it('should mark as approved', async () => {
      await markMessageAsApproved('proj-1', 'chan-1-1', 'chat-1-1-2', 'admin');
      const messages = await getChannelMessages('proj-1', 'chan-1-1');
      const chat = messages.find(m => m.id === 'chat-1-1-2');
      expect(chat?.approved).toBe(true);
      expect(chat?.approvedBy).toBe('admin');
    });
  });

  describe('Integration - Full workflow', () => {
    it('should handle complete lifecycle', async () => {
      const project = await createProject({
        companyName: 'Test Co',
        industry: 'Test',
        fiscalYearEnd: '12月',
        members: [],
        knowledgeVersion: 1,
        createdBy: 'user',
        lastActivity: new Date(),
        documents: [],
        channels: [],
      });

      const channel = await createChannel(project.id, {
        projectId: project.id,
        name: 'Ch',
        category: 'qa',
        visibility: { type: 'shared', viewableBy: [] },
        status: 'draft',
        createdBy: 'user',
        lastActivity: new Date(),
        chats: [],
        context: null,
        draft: '',
      });

      const message = await sendMessage(project.id, channel!.id, {
        userId: 'user',
        userName: 'User',
        userMessage: 'Test',
        aiResponse: 'Reply',
        characterCount: 10,
        referencedKnowledge: [],
        referencedDocuments: [],
        approved: false,
        modifications: [],
        addedToKnowledge: false,
      });

      await markMessageAsApproved(project.id, channel!.id, message!.id, 'admin');

      const messages = await getChannelMessages(project.id, channel!.id);
      expect(messages[0].approved).toBe(true);
    });
  });
});
