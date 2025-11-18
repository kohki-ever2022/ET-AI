/**
 * ChatInterface Component Tests
 *
 * Tests for the chat interface and messaging functionality
 * Testing philosophy: Test as specifications - what users should be able to do
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatWindow } from '../../components/ChatInterface';
import { Channel } from '../../types';

// Mock AppContext
const mockSendMessage = jest.fn();
const mockDispatch = jest.fn();
jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    sendMessage: mockSendMessage,
    dispatch: mockDispatch,
    state: {
      currentUser: {
        customClaims: {
          role: 'admin',
        },
      },
    },
  }),
}));

// Mock Toast
const mockShowToast = jest.fn();
jest.mock('../../components/ui/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock marked
jest.mock('marked', () => ({
  marked: (text: string) => text,
}));

describe('ChatInterface Component - User Chat Experience', () => {
  let mockChannel: Channel;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock scrollTo for the chat container
    Element.prototype.scrollTo = jest.fn();

    mockChannel = {
      id: 'channel-123',
      projectId: 'project-123',
      name: 'Test Channel',
      chats: [
        {
          id: 'chat-1',
          userMessage: 'Hello, ET AI!',
          aiResponse: 'Hello! How can I help you today?',
          timestamp: Date.now(),
          approved: false,
        },
        {
          id: 'chat-2',
          userMessage: 'What is AI?',
          aiResponse: 'AI stands for Artificial Intelligence.',
          timestamp: Date.now(),
          approved: true,
        },
      ],
      timestamp: Date.now(),
    };

    mockSendMessage.mockResolvedValue(undefined);
  });

  describe('Initial Rendering - Specification: Users should see the chat interface', () => {
    it('should display chat messages', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      expect(screen.getByText('Hello, ET AI!')).toBeInTheDocument();
      expect(screen.getByText('What is AI?')).toBeInTheDocument();
    });

    it('should display chat input', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);
      expect(input).toBeInTheDocument();
    });

    it('should display send button', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('should display attach button', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const attachButton = screen.getByRole('button', { name: /ファイルを添付/i });
      expect(attachButton).toBeInTheDocument();
    });
  });

  describe('Message Sending - Specification: Users can send messages', () => {
    it('should allow users to type in the input', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i) as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: 'Test message' } });

      expect(input.value).toBe('Test message');
    });

    it('should send message when send button is clicked', async () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });

      fireEvent.change(input, { target: { value: 'New test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          'channel-123',
          'project-123',
          'New test message'
        );
      });
    });

    it('should clear input after sending message', async () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i) as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });

      fireEvent.change(input, { target: { value: 'Message to clear' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should show success toast after sending message', async () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });

      fireEvent.change(input, { target: { value: 'Success message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('success', 'メッセージを送信しました');
      });
    });

    it('should disable send button when input is empty', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });

      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has text', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });

      fireEvent.change(input, { target: { value: 'Some text' } });

      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Error Handling - Specification: Users should see errors when sending fails', () => {
    it('should show error toast when message send fails', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Network error'));

      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });

      fireEvent.change(input, { target: { value: 'Error message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('error', 'エラー: Network error');
      });
    });
  });

  describe('Attachment - Specification: Users can attach files', () => {
    it('should show info toast when attach button is clicked', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const attachButton = screen.getByRole('button', { name: /ファイルを添付/i });
      fireEvent.click(attachButton);

      expect(mockShowToast).toHaveBeenCalledWith(
        'info',
        'ヘッダーの「引用ファイル」ボタンからドキュメントを管理できます',
        4000
      );
    });
  });

  describe('Keyboard Shortcuts - Specification: Users can use keyboard to send messages', () => {
    it('should send message when Enter key is pressed', async () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);

      fireEvent.change(input, { target: { value: 'Enter key message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          'channel-123',
          'project-123',
          'Enter key message'
        );
      });
    });

    it('should not send message when Shift+Enter is pressed', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);

      fireEvent.change(input, { target: { value: 'Shift Enter message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Message Display - Specification: Users should see approved and unapproved messages differently', () => {
    it('should display approved badge for approved messages', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const approvedBadges = screen.getAllByText('承認済み');
      expect(approvedBadges.length).toBeGreaterThan(0);
    });

    it('should display approve button for unapproved messages as admin', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const approveButtons = screen.getAllByText('承認');
      expect(approveButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Context Display - Specification: Users should see context information when available', () => {
    it('should display context when channel has context', () => {
      const channelWithContext: Channel = {
        ...mockChannel,
        context: {
          document: {
            id: 'doc-1',
            name: 'Test Document.pdf',
          },
        },
      };

      render(<ChatWindow activeChat={channelWithContext} />);

      expect(screen.getByText('コンテキスト:')).toBeInTheDocument();
      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument();
    });

    it('should not display context when channel has no context', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      expect(screen.queryByText('コンテキスト:')).not.toBeInTheDocument();
    });

    it('should display snippet context when available', () => {
      const channelWithSnippet: Channel = {
        ...mockChannel,
        context: {
          document: {
            id: 'doc-1',
            name: 'Test Document.pdf',
          },
          snippet: 'This is a snippet from the document',
        },
      };

      render(<ChatWindow activeChat={channelWithSnippet} />);

      expect(screen.getByText('コンテキスト:')).toBeInTheDocument();
      expect(screen.getByText(/「Test Document.pdf」からの抜粋/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling - Specification: Users should see error messages when operations fail', () => {
    it('should show unknown error message when non-Error exception is thrown', async () => {
      mockSendMessage.mockRejectedValueOnce('String error');

      render(<ChatWindow activeChat={mockChannel} />);

      const input = screen.getByPlaceholderText(/ET AIに質問を入力してください/i);
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'error',
          'メッセージの送信中に不明なエラーが発生しました'
        );
      });
    });
  });

  describe('Message Actions - Specification: Users can modify and delete messages', () => {
    beforeEach(() => {
      // Mock window.prompt
      global.prompt = jest.fn();
      // Mock window.confirm
      global.confirm = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should not modify message when prompt is cancelled', () => {
      (global.prompt as jest.Mock).mockReturnValue(null);

      render(<ChatWindow activeChat={mockChannel} />);

      const modifyButtons = screen.getAllByText('修正');
      fireEvent.click(modifyButtons[0]);

      expect(global.prompt).toHaveBeenCalledWith(
        '修正後のテキストを入力:',
        'Hello! How can I help you today?'
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should not modify message when same text is entered', () => {
      (global.prompt as jest.Mock).mockReturnValue('Hello! How can I help you today?');

      render(<ChatWindow activeChat={mockChannel} />);

      const modifyButtons = screen.getAllByText('修正');
      fireEvent.click(modifyButtons[0]);

      expect(global.prompt).toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should modify message when different text is entered', () => {
      (global.prompt as jest.Mock).mockReturnValue('Modified response');

      render(<ChatWindow activeChat={mockChannel} />);

      const modifyButtons = screen.getAllByText('修正');
      fireEvent.click(modifyButtons[0]);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'MODIFY_CHAT',
        payload: {
          projectId: 'project-123',
          channelId: 'channel-123',
          chatId: 'chat-1',
          originalText: 'Hello! How can I help you today?',
          modifiedText: 'Modified response',
        },
      });
    });

    it('should not delete message when confirm is cancelled', () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<ChatWindow activeChat={mockChannel} />);

      const deleteButtons = screen.getAllByText('削除');
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('このチャットを削除しますか？');
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should delete message when confirm is accepted', () => {
      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<ChatWindow activeChat={mockChannel} />);

      const deleteButtons = screen.getAllByText('削除');
      fireEvent.click(deleteButtons[0]);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'DELETE_CHAT',
        payload: {
          projectId: 'project-123',
          channelId: 'channel-123',
          chatId: 'chat-1',
        },
      });
    });

    it('should approve message when approve button is clicked', () => {
      render(<ChatWindow activeChat={mockChannel} />);

      const approveButtons = screen.getAllByText('承認');
      fireEvent.click(approveButtons[0]);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'APPROVE_CHAT',
        payload: {
          projectId: 'project-123',
          channelId: 'channel-123',
          chatId: 'chat-1',
        },
      });
    });
  });
});
