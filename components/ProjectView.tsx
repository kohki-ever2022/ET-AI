import React, { useState, useMemo } from 'react';
import { TriasLogo, SidebarToggleIcon, FileIcon, PlusIcon, UploadIcon, ExportIcon, DeleteIcon } from './Icons';
import { ChatWindow } from './ChatInterface';
import { DocumentManager } from './Workspace';
import { AdminDashboard } from './AdminDashboard';
import { useAppContext } from '../context/AppContext';

export const MainView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { projects, activeProjectId, activeChannelId, isSidebarOpen } = state;
    const [isDocManagerOpen, setDocManagerOpen] = useState(false);

    const { activeProject, activeChannel } = useMemo(() => {
        if (activeProjectId) {
            const project = projects.find(p => p.id === activeProjectId);
            const channel = project?.channels.find(c => c.id === activeChannelId);
            return { activeProject: project, activeChannel: channel };
        }
        return { activeProject: undefined, activeChannel: undefined };
    }, [projects, activeProjectId, activeChannelId]);
    
    if (activeProjectId === 'ADMIN_DASHBOARD') {
        return <AdminDashboard />;
    }

    const handleExportChat = () => {
        if (!activeChannel) return;

        const chatContent = activeChannel.chats.map(chat => {
            const user = `ユーザー (${chat.userName}):\n${chat.userMessage}`;
            const ai = `ET AIアシスタント:\n${chat.aiResponse}`;
            return `${user}\n\n${ai}\n\n--------------------------------\n`;
        }).join('');

        const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${activeChannel.name.replace(/\s+/g, '_')}_history.txt`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handleClearChat = () => {
        if (!activeChannel || !activeProject) return;

        if (window.confirm(`「${activeChannel.name}」のチャット履歴を完全に消去してもよろしいですか？この操作は元に戻せません。`)) {
            dispatch({
                type: 'CLEAR_CHATS_IN_CHANNEL',
                payload: {
                    projectId: activeProject.id,
                    channelId: activeChannel.id,
                },
            });
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col">
            {!activeChannel ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-apple-xl relative">
                     <div className="absolute top-4 left-4">
                        {!isSidebarOpen && (
                            <button onClick={() => dispatch({type: 'TOGGLE_SIDEBAR'})} className="p-2 rounded-apple-button text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark hover:bg-white/30 dark:hover:bg-black/30 hover:text-apple-label-light dark:hover:text-apple-label-dark transition-colors motion-reduce:transition-none">
                                <SidebarToggleIcon />
                            </button>
                        )}
                    </div>
                    <TriasLogo className="w-24 h-24 mb-apple-base" />
                    <h1 className="text-apple-large-title font-sf-bold text-apple-label-light dark:text-apple-label-dark">ET AI</h1>
                    <p className="mt-apple-sm text-apple-title-3 text-apple-label-secondary-light dark:text-apple-label-secondary-dark">Ethics & Transparency Engine</p>
                    
                    <p className="mt-apple-xl text-apple-body text-apple-label-secondary-light dark:text-apple-label-secondary-dark">サイドバーからプロジェクトとチャンネルを選択してください。</p>
                </div>
            ) : (
                <>
                    <header className="flex-shrink-0 flex justify-between items-center p-apple-md border-b-2 border-white/30 dark:border-white/20 bg-white/80 dark:bg-black/70 backdrop-blur-xl shadow-sm">
                        <div className="flex items-center min-w-0">
                            {!isSidebarOpen && (
                                <button onClick={() => dispatch({type: 'TOGGLE_SIDEBAR'})} className="p-2 rounded-apple-button hover:bg-apple-fill-tertiary-light dark:hover:bg-apple-fill-tertiary-dark mr-apple-sm transition-colors motion-reduce:transition-none">
                                    <SidebarToggleIcon />
                                </button>
                            )}
                            <div className="min-w-0">
                                <h2 className="text-apple-headline font-sf-semibold text-apple-label-light dark:text-apple-label-dark truncate">{activeChannel.name}</h2>
                                {activeProject && <p className="text-apple-footnote text-apple-label-secondary-light dark:text-apple-label-secondary-dark truncate">プロジェクト: {activeProject.companyName}</p>}
                            </div>
                        </div>
                        <div className="flex items-center">
                             {activeProject && (
                                <button 
                                    onClick={() => setDocManagerOpen(true)}
                                    className="flex items-center px-apple-base py-apple-sm text-apple-body font-sf-semibold text-apple-blue-light dark:text-apple-blue-dark border border-apple-blue-light dark:border-apple-blue-dark rounded-apple-button hover:bg-apple-blue-light/20 dark:hover:bg-apple-blue-dark/20 transition-all duration-200 motion-reduce:transition-none flex-shrink-0 ml-apple-sm min-h-touch whitespace-nowrap"
                                >
                                    <FileIcon className="w-5 h-5 mr-apple-sm" />
                                    引用ファイル
                                </button>
                            )}
                             <button
                                onClick={handleExportChat}
                                title="チャット履歴をエクスポート"
                                className="flex items-center px-apple-base py-apple-sm text-apple-body font-sf-semibold text-apple-label-light dark:text-apple-label-dark bg-white/50 dark:bg-black/50 rounded-apple-button hover:bg-white/70 dark:hover:bg-black/70 transition-colors duration-200 motion-reduce:transition-none flex-shrink-0 ml-apple-sm min-h-touch border border-apple-label-quaternary-light/50 dark:border-apple-label-quaternary-dark/50 whitespace-nowrap"
                            >
                                <ExportIcon className="w-5 h-5 mr-apple-sm" />
                                <span>エクスポート</span>
                            </button>
                            <button
                                onClick={handleClearChat}
                                title="チャット履歴を消去"
                                className="flex items-center px-apple-base py-apple-sm text-apple-body font-sf-semibold text-apple-red-light dark:text-apple-red-dark rounded-apple-button hover:bg-apple-red-light/20 dark:hover:bg-apple-red-dark/20 transition-colors duration-200 motion-reduce:transition-none flex-shrink-0 ml-apple-sm min-h-touch border border-apple-red-light/50 dark:border-apple-red-dark/50 whitespace-nowrap"
                            >
                                <DeleteIcon className="w-5 h-5 mr-apple-sm" />
                                <span>クリア</span>
                            </button>
                        </div>
                    </header>
                    <ChatWindow 
                        activeChat={activeChannel} // Pass the entire channel object
                    />
                </>
            )}
            {isDocManagerOpen && activeProject && activeChannel && (
                <DocumentManager 
                    project={activeProject}
                    activeChannelId={activeChannel.id}
                    onClose={() => setDocManagerOpen(false)}
                />
            )}
        </div>
    );
};
