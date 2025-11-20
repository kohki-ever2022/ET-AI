import React, { useState, useRef, useEffect } from 'react';
// FIX: The component should operate on a Channel, which contains multiple chats, not a single Chat.
import { Chat, Channel } from '../types';
import { SendIcon, BotIcon, UserIcon, DocumentIcon, QuoteIcon, PaperclipIcon, SpinnerIcon } from './Icons';
import { marked } from 'marked';
import { useAppContext } from '../context/AppContext';
import { useToast } from './ui/Toast';

// As per spec (Week 6, ChatMessage.tsx)
const ChatMessageItem: React.FC<{ chatMessage: {role: 'user' | 'model', content: string}, onApprove: () => void, onModify: () => void, onDelete: () => void, isApproved: boolean, isAiMessage: boolean }> = 
({ chatMessage, onApprove, onModify, onDelete, isApproved, isAiMessage }) => {
    const { state } = useAppContext();
    // Assuming a simple role check from a mock user object for now
    // FIX: currentUser property was missing from AppState. It is now added.
    const isAdmin = state.currentUser?.customClaims?.role === 'admin';

    return (
        <div className={`flex items-start gap-apple-md ${!isAiMessage ? 'justify-end' : ''}`}>
            {isAiMessage && <BotIcon className="w-8 h-8 text-apple-blue-light dark:text-apple-blue-dark flex-shrink-0" />}
            
            <div className="flex flex-col items-start w-full max-w-2xl">
                <div className={`w-fit max-w-full p-apple-base rounded-apple-card ${!isAiMessage ? 'bg-apple-blue-light dark:bg-apple-blue-dark text-white self-end' : isApproved ? 'bg-apple-green-light/10 dark:bg-apple-green-dark/10 backdrop-blur-sm text-apple-label-light dark:text-apple-label-dark border-2 border-apple-green-light/30 dark:border-apple-green-dark/30' : 'bg-white/80 dark:bg-apple-bg-secondary-dark/90 backdrop-blur-sm text-apple-label-light dark:text-apple-label-dark'}`}>
                {chatMessage.content ? (
                    isAiMessage ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: marked(chatMessage.content) }} />
                    ) : (
                        <pre className="whitespace-pre-wrap font-sf-pro text-apple-body text-white">{chatMessage.content}</pre>
                    )
                ) : (
                    <div className="flex items-center space-x-apple-sm">
                        <div className="w-2 h-2 bg-apple-label-tertiary-light dark:bg-apple-label-tertiary-dark rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-apple-label-tertiary-light dark:bg-apple-label-tertiary-dark rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-apple-label-tertiary-light dark:bg-apple-label-tertiary-dark rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                )}
                </div>
                {isAiMessage && (
                    <div className="mt-2 flex gap-2 items-center flex-wrap">
                        {isApproved && (
                             <div className="flex items-center gap-1 px-apple-sm py-1 bg-apple-green-light/20 dark:bg-apple-green-dark/20 rounded-apple-capsule border border-apple-green-light dark:border-apple-green-dark">
                                <span className="text-apple-body text-apple-green-light dark:text-apple-green-dark font-sf-semibold">✓</span>
                                <span className="text-apple-footnote text-apple-green-light dark:text-apple-green-dark font-sf-semibold">承認済み</span>
                             </div>
                        )}
                        {!isApproved && isAdmin && (
                             <button onClick={onApprove} className="px-apple-md py-apple-sm min-h-[44px] bg-apple-green-light dark:bg-apple-green-dark text-white rounded-apple-button text-apple-body font-sf-semibold hover:brightness-110 transition-all active:scale-95 motion-reduce:transform-none motion-reduce:transition-none">承認</button>
                        )}
                        {isAdmin && (
                            <button onClick={onModify} className="px-apple-md py-apple-sm min-h-[44px] bg-apple-orange-light dark:bg-apple-orange-dark text-white rounded-apple-button text-apple-body font-sf-semibold hover:brightness-110 transition-all active:scale-95 motion-reduce:transform-none motion-reduce:transition-none">修正</button>
                        )}
                        {!isApproved && isAdmin && (
                            <button onClick={onDelete} className="px-apple-md py-apple-sm min-h-[44px] bg-apple-red-light dark:bg-apple-red-dark text-white rounded-apple-button text-apple-body font-sf-semibold hover:brightness-110 transition-all active:scale-95 motion-reduce:transform-none motion-reduce:transition-none">削除</button>
                        )}
                    </div>
                )}
            </div>
            
            {!isAiMessage && <UserIcon className="w-8 h-8 text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark flex-shrink-0" />}
        </div>
    );
};


// Based on spec (Week 6, ChatInput.tsx)
const ChatInput: React.FC<{ onSend: (msg: string) => void, onAttach: () => void, isLoading: boolean, currentDraft: string, characterCount: number }> = 
({ onSend, onAttach, isLoading, currentDraft, characterCount }) => {
    const [input, setInput] = useState(currentDraft);

    useEffect(() => {
      setInput(currentDraft);
    }, [currentDraft]);

    const handleSend = () => {
        if (input.trim()) {
            onSend(input);
            setInput('');
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    return (
        <div className="p-apple-base md:p-apple-lg pt-apple-base border-t-2 border-white/30 dark:border-white/20 bg-white/85 dark:bg-black/75 backdrop-blur-xl shadow-lg">
            {isLoading && (
                <div className="flex items-center justify-center text-apple-footnote text-apple-label-secondary-light dark:text-apple-label-secondary-dark mb-apple-sm">
                    <SpinnerIcon className="w-4 h-4 mr-apple-sm" />
                    ET AIが応答を生成中...
                </div>
            )}
            <div className="flex flex-col bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-apple-card ring-2 ring-white/40 dark:ring-white/30 focus-within:ring-2 focus-within:ring-apple-blue-light dark:focus-within:ring-apple-blue-dark transition-all duration-200 motion-reduce:transition-none shadow-md">
                <label htmlFor="chat-input" className="sr-only">メッセージを入力</label>
                <textarea
                    id="chat-input"
                    rows={3}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ET AIに質問を入力してください（Enter で送信、Shift + Enter で改行）..."
                    className="w-full bg-transparent text-apple-label-light dark:text-apple-label-dark placeholder:text-apple-label-tertiary-light dark:placeholder:text-apple-label-tertiary-dark focus:outline-none p-apple-base resize-none"
                    disabled={isLoading}
                />
                <div className="flex justify-between items-center p-apple-sm border-t border-apple-label-quaternary-light/50 dark:border-apple-label-quaternary-dark/50">
                     <div className="flex items-center">
                        <button
                            onClick={onAttach}
                            disabled={isLoading}
                            className="p-2 rounded-full text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark hover:text-apple-label-light dark:hover:text-apple-label-dark hover:bg-apple-fill-tertiary-light dark:hover:bg-apple-fill-tertiary-dark disabled:cursor-not-allowed transition-colors duration-200 motion-reduce:transition-none"
                            title="ファイルを添付"
                            aria-label="ファイルを添付"
                        >
                            <PaperclipIcon className="w-5 h-5" />
                        </button>
                         <span className="text-sm text-apple-label-secondary-light dark:text-apple-label-secondary-dark">{characterCount} 文字</span>
                     </div>
                    <button onClick={handleSend} disabled={isLoading || input.trim() === ''} className="ml-apple-sm px-4 py-2 text-sm font-semibold rounded-apple-button bg-apple-blue-light dark:bg-apple-blue-dark hover:brightness-110 disabled:bg-apple-gray5 disabled:text-apple-label-tertiary-light dark:disabled:text-apple-label-tertiary-dark disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 flex-shrink-0 motion-reduce:transform-none motion-reduce:transition-none" aria-label="メッセージを送信">
                       {isLoading ? '送信中...' : '送信'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ChatWindowProps {
    // FIX: The component receives a Channel object, which contains the list of chats.
    activeChat: Channel;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ activeChat }) => {
  const { sendMessage, dispatch } = useAppContext();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
    });
  // FIX: activeChat is a Channel, so `activeChat.chats` is the correct dependency.
  }, [activeChat.id, activeChat.chats]);
  
  const handleSend = async (message: string) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
        // FIX: sendMessage expects (channelId, projectId, message). activeChat is a Channel, so its id is the channelId.
        await sendMessage(activeChat.id, activeChat.projectId, message);
        showToast('success', 'メッセージを送信しました');
    } catch (error) {
        if (error instanceof Error) {
            showToast('error', `エラー: ${error.message}`);
        } else {
            showToast('error', 'メッセージの送信中に不明なエラーが発生しました');
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleAttachment = () => {
    // This would likely trigger the DocumentManager modal in the new design
    // For now, it's a placeholder.
    showToast('info', 'ヘッダーの「引用ファイル」ボタンからドキュメントを管理できます', 4000);
  };

  // FIX: Dispatch actions with correct types and payloads as defined in the updated AppContext.
  const handleApprove = (chatId: string) => dispatch({ type: 'APPROVE_CHAT', payload: { projectId: activeChat.projectId, channelId: activeChat.id, chatId }});
  const handleModify = (chatId: string, originalText: string) => {
      const modifiedText = prompt('修正後のテキストを入力:', originalText);
      if (modifiedText && modifiedText !== originalText) {
          dispatch({ type: 'MODIFY_CHAT', payload: { projectId: activeChat.projectId, channelId: activeChat.id, chatId, originalText, modifiedText }});
      }
  };
  const handleDelete = (chatId: string) => {
      if(confirm('このチャットを削除しますか？')) {
        dispatch({ type: 'DELETE_CHAT', payload: { projectId: activeChat.projectId, channelId: activeChat.id, chatId }});
      }
  };

  const allMessages = [
      // FIX: activeChat is a Channel, so accessing its `chats` property is correct.
      ...activeChat.chats.flatMap(c => ([
          { role: 'user' as const, content: c.userMessage, originalChat: c },
          { role: 'model' as const, content: c.aiResponse, originalChat: c }
      ]))
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {activeChat.context && (
        <div className="flex-shrink-0 bg-white/80 dark:bg-black/70 backdrop-blur-xl text-apple-label-light dark:text-apple-label-dark text-apple-footnote p-apple-sm flex items-center justify-center shadow-sm border-b-2 border-white/30 dark:border-white/20">
            {activeChat.context.snippet ? <QuoteIcon className="w-5 h-5 mr-apple-sm flex-shrink-0" /> : <DocumentIcon className="w-5 h-5 mr-apple-sm flex-shrink-0" />}
            <span className="font-sf-semibold mr-1 text-apple-label-light dark:text-apple-label-dark">コンテキスト:</span>
            {activeChat.context.snippet ? (
                <span className="truncate italic">「{activeChat.context.document.name}」からの抜粋</span>
            ) : (
                <span className="truncate">{activeChat.context.document.name}</span>
            )}
        </div>
      )}
      <div ref={chatContainerRef} aria-live="polite" aria-atomic="false" className="flex-1 overflow-y-auto p-apple-base md:p-apple-xl space-y-apple-base">
        {allMessages.map((msg, index) => (
            <ChatMessageItem
                key={`${msg.originalChat.id}-${index}`}
                chatMessage={{ role: msg.role, content: msg.content }}
                onApprove={() => handleApprove(msg.originalChat.id)}
                onModify={() => handleModify(msg.originalChat.id, msg.originalChat.aiResponse)}
                onDelete={() => handleDelete(msg.originalChat.id)}
                isApproved={msg.originalChat.approved}
                isAiMessage={msg.role === 'model'}
            />
        ))}
      </div>
      <ChatInput 
        onSend={handleSend}
        onAttach={handleAttachment}
        isLoading={isLoading}
        currentDraft={activeChat.draft || ""}
        characterCount={activeChat.draft?.length || 0}
      />
    </div>
  );
};