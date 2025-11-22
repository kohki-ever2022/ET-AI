import React, { createContext, useReducer, useContext, useCallback, useEffect, useState } from 'react';
import { Project, Channel, Chat, DocumentFile, ChatContext, User, Knowledge, Timestamp } from '../types';
import { sendMessageStream } from '../services/geminiService';
import * as firebaseService from '../services/firebaseService';
import { v4 as uuidv4 } from 'uuid';

// --- INITIAL STATE ---
const INITIAL_STATE: AppState = {
  isInitialized: false,
  isAuthenticated: false,
  currentUser: null,
  users: [],
  knowledge: [],
  projects: [],
  activeProjectId: null,
  activeChannelId: null,
  searchQuery: '',
  isSidebarOpen: true,
  expandedProjects: new Set(),
};

// --- TYPE DEFINITIONS ---
export interface AppState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  knowledge: Knowledge[];
  projects: Project[];
  activeProjectId: string | null;
  activeChannelId: string | null;
  searchQuery: string;
  isSidebarOpen: boolean;
  expandedProjects: Set<string>;
}

export type AppAction =
  | { type: 'INITIALIZE_DATA'; payload: { users: User[], projects: Project[], knowledge: Knowledge[] } }
  | { type: 'LOGIN'; payload: { email: string; role: 'admin' | 'employee' } }
  | { type: 'LOGOUT' }
  | { type: 'SELECT_ADMIN_DASHBOARD' }
  | { type: 'SELECT_PERFORMANCE_DASHBOARD' }
  | { type: 'SELECT_BATCH_JOB_MONITOR' }
  | { type: 'CREATE_PROJECT'; payload: { name: string } }
  | { type: 'SELECT_PROJECT'; payload: { projectId: string } }
  | { type: 'TOGGLE_EXPAND_PROJECT'; payload: { projectId: string } }
  | { type: 'CREATE_CHANNEL'; payload: { projectId: string, name: string } }
  | { type: 'SELECT_CHANNEL'; payload: { projectId: string, channelId: string } }
  | { type: 'UPLOAD_FILES_TO_PROJECT'; payload: { projectId: string; documents: DocumentFile[] } }
  | { type: 'DELETE_DOCUMENT'; payload: { projectId: string; documentId: string } }
  | { type: 'SET_CHAT_CONTEXT'; payload: { projectId: string; channelId: string; context: ChatContext | null } }
  | { type: 'APPROVE_CHAT'; payload: { projectId: string; channelId: string; chatId: string } }
  | { type: 'MODIFY_CHAT'; payload: { projectId: string; channelId: string; chatId: string; originalText: string; modifiedText: string } }
  | { type: 'DELETE_CHAT'; payload: { projectId: string; channelId: string; chatId: string } }
  | { type: 'CLEAR_CHATS_IN_CHANNEL'; payload: { projectId: string; channelId: string } }
  | { type: 'UPDATE_USER_ROLE'; payload: { uid: string, role: 'admin' | 'employee' } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  // Actions to receive real-time updates
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_USERS'; payload: User[] };


interface IAppContext {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  sendMessage: (channelId: string, projectId: string, message: string) => Promise<void>;
  uploadFilesToProject: (projectId: string, files: File[]) => Promise<void>;
}

// --- REDUCER ---
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'INITIALIZE_DATA':
        return {
            ...state,
            isInitialized: true,
            users: action.payload.users,
            projects: action.payload.projects,
            knowledge: action.payload.knowledge,
            expandedProjects: new Set(action.payload.projects.map(p => p.id)), // Expand all projects by default
        };
    case 'SET_PROJECTS':
        return { ...state, projects: action.payload };
    case 'SET_USERS':
        return { ...state, users: action.payload };
    case 'LOGIN': {
      const user = state.users.find(u => u.email === action.payload.email);
      return { ...state, isAuthenticated: true, currentUser: user || null };
    }
    case 'LOGOUT':
      return { ...INITIAL_STATE, isInitialized: true, users: state.users };
    case 'SELECT_ADMIN_DASHBOARD':
        return { ...state, activeProjectId: 'ADMIN_DASHBOARD', activeChannelId: null };
    case 'SELECT_PERFORMANCE_DASHBOARD':
        return { ...state, activeProjectId: 'PERFORMANCE_DASHBOARD', activeChannelId: null };
    case 'SELECT_BATCH_JOB_MONITOR':
        return { ...state, activeProjectId: 'BATCH_JOB_MONITOR', activeChannelId: null };
    case 'CREATE_PROJECT': {
      const newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
        companyName: action.payload.name,
        industry: '未設定',
        fiscalYearEnd: '3月',
        members: [state.currentUser?.uid || ''],
        knowledgeVersion: 1,
        createdBy: state.currentUser?.uid || '',
        lastActivity: new Date(),
        documents: [],
        channels: [],
      };
      firebaseService.addDoc('projects', newProject);
      return state; // State will be updated via onSnapshot
    }
    case 'SELECT_PROJECT':
        return { ...state, activeProjectId: action.payload.projectId, activeChannelId: null };
    case 'TOGGLE_EXPAND_PROJECT': {
        const newSet = new Set(state.expandedProjects);
        if (newSet.has(action.payload.projectId)) newSet.delete(action.payload.projectId);
        else newSet.add(action.payload.projectId);
        return { ...state, expandedProjects: newSet };
    }
    case 'CREATE_CHANNEL': {
        const { projectId, name } = action.payload;
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
            const newChannel: Channel = {
                id: uuidv4(),
                projectId,
                name,
                category: 'other',
                visibility: { type: 'shared', viewableBy: [] },
                status: 'draft',
                createdBy: state.currentUser?.uid || '',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivity: new Date(),
                chats: [],
                context: null,
                draft: ''
            };
            const updatedChannels = [newChannel, ...project.channels];
            firebaseService.updateDoc('projects', projectId, { channels: updatedChannels });
        }
        return state;
    }
    case 'SELECT_CHANNEL':
        return { ...state, activeProjectId: action.payload.projectId, activeChannelId: action.payload.channelId };

    case 'UPLOAD_FILES_TO_PROJECT': {
        const { projectId, documents } = action.payload;
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
           const updatedDocs = [...documents, ...project.documents];
           firebaseService.updateDoc('projects', projectId, { documents: updatedDocs });
        }
        return state;
    }
    
    case 'DELETE_DOCUMENT': {
        const { projectId, documentId } = action.payload;
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
            const updatedDocs = project.documents.filter(d => d.id !== documentId);
            firebaseService.updateDoc('projects', projectId, { documents: updatedDocs });
        }
        return state;
    }

    case 'SET_CHAT_CONTEXT': {
        const { projectId, channelId, context } = action.payload;
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
            const updatedChannels = project.channels.map(c => c.id === channelId ? { ...c, context } : c);
            firebaseService.updateDoc('projects', projectId, { channels: updatedChannels });
        }
        return state;
    }

    case 'APPROVE_CHAT': {
        const { projectId, channelId, chatId } = action.payload;
        const updates: Partial<Chat> = {
            approved: true,
            approvedBy: state.currentUser?.uid,
            approvedAt: new Date(),
            addedToKnowledge: true // Simulate knowledge addition
        };
        firebaseService.updateChatDoc(projectId, channelId, chatId, updates);
        return state;
    }
    case 'MODIFY_CHAT': {
        const { projectId, channelId, chatId, originalText, modifiedText } = action.payload;
        const project = state.projects.find(p => p.id === projectId);
        const channel = project?.channels.find(c => c.id === channelId);
        const chat = channel?.chats.find(ch => ch.id === chatId);

        if (chat) {
            const newModification = {
                originalText,
                modifiedText,
                modifiedBy: state.currentUser?.uid || 'unknown',
                modifiedAt: new Date() as Timestamp,
            };
            const updates: Partial<Chat> = {
                aiResponse: modifiedText,
                modifications: [...chat.modifications, newModification]
            };
            firebaseService.updateChatDoc(projectId, channelId, chatId, updates);
        }
        return state;
    }
    case 'DELETE_CHAT': {
        const { projectId, channelId, chatId } = action.payload;
        firebaseService.deleteChatDoc(projectId, channelId, chatId);
        return state;
    }
    case 'CLEAR_CHATS_IN_CHANNEL': {
        const { projectId, channelId } = action.payload;
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
            const updatedChannels = project.channels.map(c => c.id === channelId ? {...c, chats: [], context: null, draft: ''} : c);
            firebaseService.updateDoc('projects', projectId, { channels: updatedChannels });
        }
        return state;
    }
    case 'UPDATE_USER_ROLE': {
        firebaseService.updateDoc('users', action.payload.uid, { customClaims: { role: action.payload.role } });
        return state;
    }
    case 'SET_SEARCH_QUERY':
        return { ...state, searchQuery: action.payload };
    case 'TOGGLE_SIDEBAR':
        return { ...state, isSidebarOpen: !state.isSidebarOpen };
    default:
      return state;
  }
};

const AppContext = createContext<IAppContext>({
  state: INITIAL_STATE,
  dispatch: () => null,
  sendMessage: async () => {},
  uploadFilesToProject: async () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  useEffect(() => {
    // Subscribe to real-time updates from our mock service
    const unsubscribeProjects = firebaseService.onSnapshot<Project>('projects', (data) => {
        dispatch({ type: 'SET_PROJECTS', payload: data });
    });
    const unsubscribeUsers = firebaseService.onSnapshot<User>('users', (data) => {
        dispatch({ type: 'SET_USERS', payload: data });
    });

    // Simulate initial data load
    if (!state.isInitialized) {
        // This part is a bit of a trick for the mock. In a real app,
        // you'd probably fetch initial data, then subscribe. Here we just use the first snapshot.
        dispatch({ type: 'INITIALIZE_DATA', payload: { users: [], projects: [], knowledge: [] }});
    }

    return () => {
      // Clean up subscriptions
      unsubscribeProjects();
      unsubscribeUsers();
    };
  }, [state.isInitialized]);
  

  const uploadFilesToProject = useCallback(async (projectId: string, files: File[]) => {
    const documents: DocumentFile[] = Array.from(files).map(file => ({
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
        content: null,
        uploadDate: new Date(),
        status: 'ready'
    }));
    dispatch({ type: 'UPLOAD_FILES_TO_PROJECT', payload: { projectId, documents }});
  }, []);

  const sendMessage = useCallback(async (channelId: string, projectId: string, messageText: string) => {
    const project = state.projects.find(p => p.id === projectId);
    const channel = project?.channels.find(c => c.id === channelId);
    if (!channel || !state.currentUser) {
        console.error("Channel or user not found.");
        return;
    }
    
    const userMessage: Omit<Chat, 'id' | 'timestamp'> = {
        channelId,
        projectId,
        userId: state.currentUser.uid,
        userName: state.currentUser.displayName,
        userMessage: messageText,
        aiResponse: '',
        characterCount: 0,
        referencedKnowledge: [],
        referencedDocuments: [],
        approved: false,
        modifications: [],
        addedToKnowledge: false,
    };
    const addedUserMessage = await firebaseService.addChatDoc(projectId, channelId, userMessage);
    if (!addedUserMessage) return;

    const modelPlaceholder: Omit<Chat, 'id' | 'timestamp'> = { ...userMessage, aiResponse: '...' };
    const addedModelPlaceholder = await firebaseService.addChatDoc(projectId, channelId, modelPlaceholder);
    if (!addedModelPlaceholder) return;

    try {
        const historyForApi = channel.chats.map(c => ([
            { role: 'user' as const, content: c.userMessage },
            { role: 'model' as const, content: c.aiResponse },
        ])).flat();

        const contextString = channel.context?.snippet || channel.context?.document.content || null;
        const knowledgeForRAG = { ir: [], relevant: state.knowledge };
        
        const stream = await sendMessageStream(historyForApi, messageText, contextString, knowledgeForRAG);
        
        let fullResponse = "";
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullResponse += chunkText;
                // This is not ideal as it sends many updates, but it simulates streaming
                await firebaseService.updateChatDoc(projectId, channelId, addedModelPlaceholder.id, { aiResponse: fullResponse });
            }
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました。";
        await firebaseService.updateChatDoc(projectId, channelId, addedModelPlaceholder.id, { aiResponse: `\n\n**エラー:** ${errorMessage}` });
    }
  }, [state.projects, state.currentUser, state.knowledge]);

  const contextValue = { state, dispatch, sendMessage, uploadFilesToProject };
  
  if (!state.isInitialized) {
      return <div className="flex h-screen w-screen items-center justify-center">Loading application...</div>;
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

// Alias for backward compatibility and shorter name
export const useApp = useAppContext;
