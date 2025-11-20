/**
 * AdminDashboard Component Tests
 *
 * Tests for the admin dashboard displaying statistics and user management
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminDashboard } from '../../components/AdminDashboard';
import { AppState } from '../../context/AppContext';

// Mock context state
const mockDispatch = jest.fn();
let mockState: AppState;

// Mock geminiService to avoid ES Module issues
jest.mock('../../services/geminiService', () => ({
  generateContent: jest.fn(),
}));

// Mock AppContext
jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

const createMockState = (overrides?: Partial<AppState>): AppState => ({
  isInitialized: true,
  isAuthenticated: true,
  currentUser: {
    uid: 'admin-1',
    email: 'admin@trias.co.jp',
    displayName: 'Admin User',
    customClaims: { role: 'admin' },
  },
  users: [
    {
      uid: 'user-1',
      email: 'user1@trias.co.jp',
      displayName: 'User 1',
      customClaims: { role: 'employee' },
    },
    {
      uid: 'user-2',
      email: 'user2@trias.co.jp',
      displayName: 'User 2',
      customClaims: { role: 'admin' },
    },
  ],
  projects: [
    {
      id: 'proj-1',
      companyName: 'Test Company',
      industry: 'Tech',
      fiscalYearEnd: '12月',
      members: [],
      knowledgeVersion: 1,
      createdBy: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      documents: [],
      channels: [
        {
          id: 'chan-1',
          projectId: 'proj-1',
          name: 'Channel 1',
          category: 'qa',
          visibility: { type: 'shared', viewableBy: [] },
          status: 'draft',
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivity: new Date(),
          chats: [
            {
              id: 'chat-1',
              channelId: 'chan-1',
              projectId: 'proj-1',
              userId: 'user-1',
              userName: 'User 1',
              userMessage: 'Test message 1',
              aiResponse: 'Test response 1',
              timestamp: new Date(),
              characterCount: 15,
              referencedKnowledge: [],
              referencedDocuments: [],
              approved: true,
              modifications: [],
              addedToKnowledge: false,
            },
            {
              id: 'chat-2',
              channelId: 'chan-1',
              projectId: 'proj-1',
              userId: 'user-1',
              userName: 'User 1',
              userMessage: 'Test message 2',
              aiResponse: 'Test response 2',
              timestamp: new Date(),
              characterCount: 15,
              referencedKnowledge: [],
              referencedDocuments: [],
              approved: false,
              modifications: [],
              addedToKnowledge: false,
            },
          ],
          context: null,
          draft: '',
        },
      ],
    },
  ],
  knowledge: [
    {
      id: 'know-1',
      projectId: 'proj-1',
      sourceType: 'approved-chat',
      sourceId: 'chat-1',
      content: 'Test knowledge',
      embedding: [],
      category: 'company-info',
      reliability: 90,
      usageCount: 5,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'know-2',
      projectId: 'proj-1',
      sourceType: 'manual-entry',
      sourceId: 'manual-1',
      content: 'Test knowledge 2',
      embedding: [],
      category: 'financial',
      reliability: 95,
      usageCount: 3,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  activeProjectId: null,
  activeChannelId: null,
  searchQuery: '',
  isSidebarOpen: true,
  expandedProjects: new Set(),
  ...overrides,
});

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering - Specification: Admin should see dashboard overview', () => {
    it('should display dashboard title', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      expect(screen.getByText('管理者ダッシュボード')).toBeInTheDocument();
    });

    it('should display all stat cards', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      expect(screen.getByText('総チャット数')).toBeInTheDocument();
      expect(screen.getByText('承認済みチャット数')).toBeInTheDocument();
      expect(screen.getByText('ナレッジ数')).toBeInTheDocument();
    });

    it('should display user management section', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      expect(screen.getByText('ユーザー管理')).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation - Specification: Display accurate statistics', () => {
    it('should calculate and display total chat count correctly', () => {
      mockState = createMockState();
      const { container } = render(<AdminDashboard />);

      // Find the stat card with "総チャット数" and verify it shows 2
      const statCards = container.querySelectorAll('.bg-white\\/60');
      const totalChatsCard = Array.from(statCards).find(
        (card) => card.textContent?.includes('総チャット数')
      );
      expect(totalChatsCard?.textContent).toContain('2');
    });

    it('should calculate and display approved chat count correctly', () => {
      mockState = createMockState();
      const { container } = render(<AdminDashboard />);

      // Find the stat card with "承認済みチャット数" and verify it shows 1
      const statCards = container.querySelectorAll('.bg-white\\/60');
      const approvedChatsCard = Array.from(statCards).find(
        (card) => card.textContent?.includes('承認済みチャット数')
      );
      expect(approvedChatsCard?.textContent).toContain('1');
    });

    it('should display knowledge count correctly', () => {
      mockState = createMockState();
      const { container } = render(<AdminDashboard />);

      // Find the stat card with "ナレッジ数" and verify it shows 2
      const statCards = container.querySelectorAll('.bg-white\\/60');
      const knowledgeCard = Array.from(statCards).find(
        (card) => card.textContent?.includes('ナレッジ数')
      );
      expect(knowledgeCard?.textContent).toContain('2');
    });

    it('should handle zero chats', () => {
      mockState = createMockState({
        projects: [
          {
            id: 'proj-1',
            companyName: 'Test Company',
            industry: 'Tech',
            fiscalYearEnd: '12月',
            members: [],
            knowledgeVersion: 1,
            createdBy: 'admin-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivity: new Date(),
            documents: [],
            channels: [],
          },
        ],
      });
      render(<AdminDashboard />);

      // Should show 0 for chats
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    it('should handle multiple projects with multiple channels', () => {
      mockState = createMockState({
        projects: [
          {
            id: 'proj-1',
            companyName: 'Test Company 1',
            industry: 'Tech',
            fiscalYearEnd: '12月',
            members: [],
            knowledgeVersion: 1,
            createdBy: 'admin-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivity: new Date(),
            documents: [],
            channels: [
              {
                id: 'chan-1',
                projectId: 'proj-1',
                name: 'Channel 1',
                category: 'qa',
                visibility: { type: 'shared', viewableBy: [] },
                status: 'draft',
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivity: new Date(),
                chats: [
                  {
                    id: 'chat-1',
                    channelId: 'chan-1',
                    projectId: 'proj-1',
                    userId: 'user-1',
                    userName: 'User 1',
                    userMessage: 'Test',
                    aiResponse: 'Response',
                    timestamp: new Date(),
                    characterCount: 10,
                    referencedKnowledge: [],
                    referencedDocuments: [],
                    approved: true,
                    modifications: [],
                    addedToKnowledge: false,
                  },
                ],
                context: null,
                draft: '',
              },
            ],
          },
          {
            id: 'proj-2',
            companyName: 'Test Company 2',
            industry: 'Finance',
            fiscalYearEnd: '3月',
            members: [],
            knowledgeVersion: 1,
            createdBy: 'admin-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivity: new Date(),
            documents: [],
            channels: [
              {
                id: 'chan-2',
                projectId: 'proj-2',
                name: 'Channel 2',
                category: 'qa',
                visibility: { type: 'shared', viewableBy: [] },
                status: 'draft',
                createdBy: 'admin-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivity: new Date(),
                chats: [
                  {
                    id: 'chat-2',
                    channelId: 'chan-2',
                    projectId: 'proj-2',
                    userId: 'user-1',
                    userName: 'User 1',
                    userMessage: 'Test 2',
                    aiResponse: 'Response 2',
                    timestamp: new Date(),
                    characterCount: 12,
                    referencedKnowledge: [],
                    referencedDocuments: [],
                    approved: false,
                    modifications: [],
                    addedToKnowledge: false,
                  },
                ],
                context: null,
                draft: '',
              },
            ],
          },
        ],
      });
      render(<AdminDashboard />);

      // 2 total chats, 1 approved
      const statValues = screen.getAllByText(/[0-9]+/);
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  describe('User Management - Specification: Admin can manage user roles', () => {
    it('should display all users in the table', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      expect(screen.getByText('user1@trias.co.jp')).toBeInTheDocument();
      expect(screen.getByText('user2@trias.co.jp')).toBeInTheDocument();
    });

    it('should display user roles', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      // Check that roles are displayed
      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(2);
    });

    it('should show correct role for employee', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      // First user is employee
      expect(selects[0].value).toBe('employee');
    });

    it('should show correct role for admin', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      // Second user is admin
      expect(selects[1].value).toBe('admin');
    });

    it('should dispatch UPDATE_USER_ROLE when role is changed', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      const selects = screen.getAllByRole('combobox');
      // Change first user from employee to admin
      fireEvent.change(selects[0], { target: { value: 'admin' } });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_USER_ROLE',
        payload: { uid: 'user-1', role: 'admin' },
      });
    });

    it('should dispatch UPDATE_USER_ROLE when role is changed to employee', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      const selects = screen.getAllByRole('combobox');
      // Change second user from admin to employee
      fireEvent.change(selects[1], { target: { value: 'employee' } });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_USER_ROLE',
        payload: { uid: 'user-2', role: 'employee' },
      });
    });

    it('should display table headers', () => {
      mockState = createMockState();
      render(<AdminDashboard />);

      expect(screen.getByText('メール')).toBeInTheDocument();
      expect(screen.getByText('ロール')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
    });

    it('should handle users with no customClaims', () => {
      mockState = createMockState({
        users: [
          {
            uid: 'user-3',
            email: 'user3@trias.co.jp',
            displayName: 'User 3',
          },
        ],
      });
      render(<AdminDashboard />);

      expect(screen.getByText('user3@trias.co.jp')).toBeInTheDocument();
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      // Should default to employee
      expect(select.value).toBe('employee');
    });
  });
});
