// services/firebaseService.ts
import { Project, Channel, Chat, DocumentFile, User, Knowledge, Timestamp } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- In-memory database to simulate Firestore ---
let mockDb = {
    users: [
        { uid: 'admin-001', email: 'admin@trias.co.jp', displayName: 'Admin User', customClaims: { role: 'admin' } },
        { uid: 'employee-001', email: 'employee@trias.co.jp', displayName: 'Employee User 1', customClaims: { role: 'employee' } },
        { uid: 'employee-002', email: 'employee2@trias.co.jp', displayName: 'Employee User 2', customClaims: { role: 'employee' } },
    ] as User[],
    knowledge: [
        { id: 'kn-1', projectId: 'proj-1', sourceType: 'manual-entry', sourceId: 'manual', content: '当社のROE目標は15%です。', embedding: [], category: 'financial', reliability: 95, usageCount: 10, version: 1, createdAt: new Date(), updatedAt: new Date() },
    ] as Knowledge[],
    projects: [
        {
          id: 'proj-1',
          companyName: '株式会社ノリツ鋼機',
          industry: '製造業',
          fiscalYearEnd: '3月',
          members: ['admin-001', 'employee-001'],
          knowledgeVersion: 1,
          createdBy: 'admin-001',
          createdAt: new Date(Date.now() - 86400000 * 5),
          updatedAt: new Date(),
          lastActivity: new Date(),
          documents: [],
          channels: [
            {
              id: 'chan-1-1',
              projectId: 'proj-1',
              name: '2025年 統合報告書',
              category: 'integrated-report',
              visibility: { type: 'shared', viewableBy: [] },
              status: 'draft',
              createdBy: 'admin-001',
              createdAt: new Date(Date.now() - 86400000 * 2),
              updatedAt: new Date(),
              lastActivity: new Date(),
              chats: [
                { id: 'chat-1-1-1', channelId: 'chan-1-1', projectId: 'proj-1', userId: 'employee-001', userName: 'Employee User 1', timestamp: new Date(), userMessage: '昨年の業績についてまとめてください。', aiResponse: '昨年度の売上高は前年比10%増の500億円、営業利益は15%増の50億円となりました。', characterCount: 60, referencedKnowledge: [], referencedDocuments: [], approved: true, approvedBy: 'admin-001', approvedAt: new Date(), modifications: [], addedToKnowledge: true },
                { id: 'chat-1-1-2', channelId: 'chan-1-1', projectId: 'proj-1', userId: 'admin-001', userName: 'Admin User', timestamp: new Date(), userMessage: 'ESGへの取り組みについて教えてください。', aiResponse: '当社は環境負荷低減のため、全工場で再生可能エネルギーの導入を進めています。', characterCount: 55, referencedKnowledge: [], referencedDocuments: [], approved: false, modifications: [], addedToKnowledge: false }
              ],
              context: null,
              draft: '',
            },
            {
              id: 'chan-1-2',
              projectId: 'proj-1',
              name: '株主総会QA',
              category: 'qa',
              visibility: { type: 'personal', viewableBy: ['admin-001'] },
              status: 'draft',
              createdBy: 'admin-001',
              createdAt: new Date(),
              updatedAt: new Date(),
              lastActivity: new Date(),
              chats: [],
              context: null,
              draft: '今後の配当方針は？',
            }
          ],
        },
        {
          id: 'proj-2',
          companyName: '株式会社サンプル',
          industry: 'ITサービス',
          fiscalYearEnd: '12月',
          members: ['admin-001', 'employee-002'],
          knowledgeVersion: 1,
          createdBy: 'admin-001',
          createdAt: new Date(Date.now() - 86400000 * 10),
          updatedAt: new Date(),
          lastActivity: new Date(),
          documents: [],
          channels: [],
        }
      ] as Project[],
};

// --- Listener simulation ---
type CollectionName = 'projects' | 'users' | 'knowledge';
type ListenerCallback<T> = (data: T[]) => void;

const listeners: { [key in CollectionName]?: ListenerCallback<any>[] } = {};

const notifyListeners = (collection: CollectionName) => {
    const data = mockDb[collection];
    listeners[collection]?.forEach(callback => callback(data));
};

// --- Mock Firestore API ---

export const onSnapshot = <T>(collection: CollectionName, callback: ListenerCallback<T>) => {
    if (!listeners[collection]) {
        listeners[collection] = [];
    }
    listeners[collection]?.push(callback);
    
    // Immediately call with current data
    callback(mockDb[collection] as T[]);

    // Return an unsubscribe function
    return () => {
        listeners[collection] = listeners[collection]?.filter(cb => cb !== callback);
    };
};

export const addDoc = async (collection: CollectionName, data: any) => {
    const newDoc = { ...data, id: uuidv4(), createdAt: new Date(), updatedAt: new Date() };
    (mockDb[collection] as any[]).unshift(newDoc);
    notifyListeners(collection);
    return newDoc;
};

export const updateDoc = async (collectionPath: string, docId: string, updates: any) => {
    const [collection, subCollection, subDocId, nestedCollection] = collectionPath.split('/');
    
    if (collection === 'projects' && subCollection === 'channels' && subDocId && nestedCollection === 'chats') {
        const project = mockDb.projects.find(p => p.id === subDocId);
        if (project) {
            const channel = project.channels.find(c => c.id === docId);
            if (channel) {
                const chatIndex = channel.chats.findIndex(ch => ch.id === updates.id);
                if (chatIndex > -1) {
                    channel.chats[chatIndex] = { ...channel.chats[chatIndex], ...updates, updatedAt: new Date() };
                } else {
                    channel.chats.push({ ...updates, id: uuidv4() });
                }
            }
        }
    } else {
        const collectionName = collection as CollectionName;
        const itemIndex = (mockDb[collectionName] as any[]).findIndex(item => item.id === docId);
        if (itemIndex > -1) {
            (mockDb[collectionName] as any[])[itemIndex] = { ...(mockDb[collectionName] as any[])[itemIndex], ...updates, updatedAt: new Date() };
        }
    }
    
    notifyListeners(collection as CollectionName);
};

// A more complex add function to handle nested collections like chats
export const addChatDoc = async (projectId: string, channelId: string, chat: Omit<Chat, 'id' | 'timestamp'>) => {
    const project = mockDb.projects.find(p => p.id === projectId);
    if (project) {
        const channel = project.channels.find(c => c.id === channelId);
        if (channel) {
            const newChat: Chat = {
                ...chat,
                id: uuidv4(),
                timestamp: new Date(),
            };
            channel.chats.push(newChat);
            channel.lastActivity = new Date();
            project.lastActivity = new Date();
            notifyListeners('projects');
            return newChat;
        }
    }
    return null;
};

export const updateChatDoc = async (projectId: string, channelId: string, chatId: string, updates: Partial<Chat>) => {
    const project = mockDb.projects.find(p => p.id === projectId);
    if(project) {
        const channel = project.channels.find(c => c.id === channelId);
        if (channel) {
            const chatIndex = channel.chats.findIndex(ch => ch.id === chatId);
            if (chatIndex > -1) {
                channel.chats[chatIndex] = { ...channel.chats[chatIndex], ...updates, updatedAt: new Date() };
                channel.lastActivity = new Date();
                project.lastActivity = new Date();
                notifyListeners('projects');
            }
        }
    }
};

export const deleteChatDoc = async (projectId: string, channelId: string, chatId: string) => {
    const project = mockDb.projects.find(p => p.id === projectId);
    if(project) {
        const channel = project.channels.find(c => c.id === channelId);
        if (channel) {
            channel.chats = channel.chats.filter(ch => ch.id !== chatId);
            channel.lastActivity = new Date();
            project.lastActivity = new Date();
            notifyListeners('projects');
        }
    }
}
