import React, { useMemo } from 'react';
import { Project, Channel } from '../types';
import { PlusIcon, ProjectIcon, ChatIcon, TriasLogo, LogoutIcon, ChevronRightIcon, SearchIcon, UserCircleIcon } from './Icons';
import { useAppContext } from '../context/AppContext';

const ProjectItem: React.FC<{ project: Project }> = ({ project }) => {
    const { state, dispatch } = useAppContext();
    // FIX: Access active project ID from the correct state property.
    const { activeProjectId, expandedProjects } = state;

    const isActive = activeProjectId === project.id;
    const isExpanded = expandedProjects.has(project.id);
    
    return (
        <div>
            <div
                className={`flex items-center justify-between rounded-apple-button group ${isActive ? 'bg-apple-fill-secondary-light dark:bg-apple-fill-secondary-dark' : 'hover:bg-apple-fill-tertiary-light dark:hover:bg-apple-fill-tertiary-dark'}`}
            >
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SELECT_PROJECT', payload: { projectId: project.id } })}
                  className="flex items-center flex-1 min-w-0 p-apple-sm text-left w-full transition-colors duration-200 motion-reduce:transition-none"
                >
                    <span 
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_EXPAND_PROJECT', payload: { projectId: project.id } }); }} 
                        aria-expanded={isExpanded}
                        className="p-1 -ml-1 text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark hover:text-apple-label-light dark:hover:text-apple-label-dark"
                    >
                        <ChevronRightIcon className={`w-4 h-4 transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-90' : ''}`} />
                    </span>
                    <ProjectIcon className={`w-5 h-5 ml-1 mr-2 flex-shrink-0 ${isActive ? 'text-apple-blue-light dark:text-apple-blue-dark' : 'text-apple-label-secondary-light dark:text-apple-label-secondary-dark group-hover:text-apple-label-light dark:group-hover:text-apple-label-dark'}`} />
                    <span className={`text-apple-body truncate font-sf-medium ${isActive ? 'text-apple-label-light dark:text-apple-label-dark font-sf-semibold' : 'text-apple-label-light dark:text-apple-label-dark'}`}>{project.companyName}</span>
                </button>
            </div>
        </div>
    );
};

const ChannelList: React.FC<{ channels: Channel[], activeChannelId: string | null, projectId: string }> = ({ channels, activeChannelId, projectId }) => {
    const { dispatch } = useAppContext();

    const handleCreateChannel = () => {
        const channelName = prompt(`新しいチャンネル名:`, `新規チャンネル ${channels.length + 1}`);
        if(channelName?.trim()){
            // FIX: Dispatch the correct action type and payload for creating a channel.
            dispatch({ type: 'CREATE_CHANNEL', payload: { projectId, name: channelName.trim() } });
        }
    };
    
    return (
        <div className="flex flex-col flex-grow bg-white/95 dark:bg-black/90 backdrop-blur-2xl p-apple-md border-r-2 border-white/30 dark:border-white/20 min-w-[280px] shadow-lg">
             <div className="flex justify-between items-center mb-apple-base">
                <h2 className="text-apple-headline font-sf-semibold text-apple-label-light dark:text-apple-label-dark">チャンネル</h2>
                <button onClick={handleCreateChannel} className="p-1 text-apple-blue-light dark:text-apple-blue-dark hover:bg-apple-blue-light/10 dark:hover:bg-apple-blue-dark/10 rounded-full">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-apple-xs -mr-2 pr-2">
                {channels.length > 0 ? channels.map(channel => (
                     <button
                        key={channel.id}
                        // FIX: Dispatch the correct action type and payload for selecting a channel.
                        onClick={() => dispatch({ type: 'SELECT_CHANNEL', payload: { projectId, channelId: channel.id } })}
                        className={`w-full flex items-center p-apple-sm rounded-apple-button cursor-pointer transition-colors duration-200 motion-reduce:transition-none text-apple-body text-left ${activeChannelId === channel.id ? 'bg-apple-blue-light dark:bg-apple-blue-dark text-white font-sf-semibold shadow-sm' : 'text-apple-label-light dark:text-apple-label-dark hover:bg-white/50 dark:hover:bg-black/50 hover:shadow-sm'}`}
                        aria-current={activeChannelId === channel.id ? 'page' : undefined}
                    >
                        <ChatIcon className="w-4 h-4 mr-apple-sm flex-shrink-0" />
                        <span className="truncate">{channel.name}</span>
                    </button>
                )) : <p className="text-apple-footnote text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark p-2">チャンネルがありません。</p>}
            </div>
        </div>
    )
}

export const Sidebar: React.FC = () => {
    const { state, dispatch } = useAppContext();
    // FIX: Access state properties that now exist in the updated AppState.
    const { projects, activeProjectId, activeChannelId, searchQuery } = state;

    const filteredProjects = useMemo(() => {
        if (!searchQuery) return projects;
        return projects.filter(p => 
            p.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.channels.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [projects, searchQuery]);

    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

    const handleCreateProject = () => {
        const companyName = prompt("新しいプロジェクトの会社名:", `株式会社サンプル ${projects.length + 1}`);
        if (companyName?.trim()) {
            dispatch({ type: 'CREATE_PROJECT', payload: { name: companyName.trim() } });
        }
    };

    return (
        <div className="flex h-full">
            <aside className="flex flex-col h-full w-72 bg-white/92 dark:bg-black/85 backdrop-blur-2xl p-apple-md border-r-2 border-white/30 dark:border-white/20 shadow-xl">
                <div className="flex-shrink-0 flex flex-col items-start pb-apple-md">
                    <div className="flex items-center">
                        <TriasLogo className="w-8 h-8" />
                        <span className="ml-apple-sm text-apple-title-3 font-sf-semibold text-apple-label-light dark:text-apple-label-dark">ET AI</span>
                    </div>
                </div>
                
                <div className="relative mb-apple-base flex-shrink-0">
                    <label htmlFor="sidebar-search" className="sr-only">プロジェクトを検索</label>
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-label-tertiary-light dark:text-apple-label-tertiary-dark pointer-events-none" />
                    <input 
                        type="search" 
                        id="sidebar-search"
                        placeholder="検索..." 
                        value={searchQuery}
                        onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
                        className="w-full bg-white/80 dark:bg-black/70 border-2 border-white/40 dark:border-white/30 rounded-apple-field py-apple-sm pl-10 pr-apple-base text-apple-label-light dark:text-apple-label-dark placeholder:text-apple-label-tertiary-light dark:placeholder:text-apple-label-tertiary-dark focus:outline-none focus:ring-2 focus:ring-apple-blue-light dark:focus:ring-apple-blue-dark focus:border-apple-blue-light dark:focus:border-apple-blue-dark transition-colors motion-reduce:transition-none shadow-sm" 
                    />
                </div>

                <nav className="flex-1 overflow-y-auto pr-1 -mr-1" aria-label="プロジェクトリスト">
                    <div className="flex justify-between items-center mb-apple-sm px-1">
                        <h3 className="text-apple-caption-1 font-sf-semibold text-apple-label-secondary-light dark:text-apple-label-secondary-dark uppercase tracking-wider" id="projects-heading">企業プロジェクト</h3>
                        <button onClick={handleCreateProject} className="p-1 text-apple-blue-light dark:text-apple-blue-dark hover:bg-apple-blue-light/10 dark:hover:bg-apple-blue-dark/10 rounded-full">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-apple-xs" role="group" aria-labelledby="projects-heading">
                        {filteredProjects.map(p => <ProjectItem key={p.id} project={p} />)}
                    </div>
                </nav>

                <div className="flex-shrink-0 pt-apple-md mt-apple-sm border-t border-white/20 dark:border-white/10">
                    <div className="flex items-center p-apple-sm">
                        <UserCircleIcon className="h-8 w-8 text-apple-label-secondary-light dark:text-apple-label-secondary-dark" />
                        <div className="ml-apple-md">
                            {/* FIX: currentUser is now available in the state. */}
                            <p className="text-apple-body font-sf-semibold text-apple-label-light dark:text-apple-label-dark">{state.currentUser?.displayName}</p>
                        </div>
                    </div>
                     <button
                        // FIX: Dispatch correct action type for showing admin dashboard.
                        onClick={() => dispatch({ type: 'SELECT_ADMIN_DASHBOARD' })}
                        className="w-full flex items-center p-apple-sm rounded-apple-button-lg transition-colors duration-200 motion-reduce:transition-none text-apple-label-light dark:text-apple-label-dark hover:bg-apple-fill-secondary-light dark:hover:bg-apple-fill-secondary-dark"
                    >
                        <span className="ml-apple-md font-sf-semibold text-apple-body">管理ダッシュボード</span>
                    </button>
                    <button
                        onClick={() => dispatch({ type: 'SELECT_PERFORMANCE_DASHBOARD' })}
                        className="w-full flex items-center p-apple-sm rounded-apple-button-lg transition-colors duration-200 motion-reduce:transition-none text-apple-label-light dark:text-apple-label-dark hover:bg-apple-fill-secondary-light dark:hover:bg-apple-fill-secondary-dark"
                    >
                        <span className="ml-apple-md font-sf-semibold text-apple-body">パフォーマンス</span>
                    </button>
                    <button
                        onClick={() => dispatch({ type: 'LOGOUT' })}
                        className="w-full flex items-center p-apple-sm rounded-apple-button-lg transition-colors duration-200 motion-reduce:transition-none text-apple-red-light dark:text-apple-red-dark hover:bg-apple-red-light/20 dark:hover:bg-apple-red-dark/20"
                    >
                        <LogoutIcon className="h-5 w-5" />
                        <span className="ml-apple-md font-sf-semibold text-apple-body">ログアウト</span>
                    </button>
                </div>
            </aside>
            {activeProject && <ChannelList channels={activeProject.channels} activeChannelId={activeChannelId} projectId={activeProject.id} />}
        </div>
    );
};