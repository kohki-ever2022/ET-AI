import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { User } from '../types';

const UserManagement: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { users } = state;
    
    // In a real app, this would be a fetch call. Here we just rely on state.
    // useEffect(() => {
    //     // a function to fetch users would be called here.
    // }, []);

    const handleUpdateRole = (uid: string, role: 'admin' | 'employee') => {
        dispatch({ type: 'UPDATE_USER_ROLE', payload: { uid, role }});
        // Here you might want to re-fetch users to confirm the change.
    };

    return (
        <div className="bg-white/60 dark:bg-black/50 p-6 rounded-lg shadow-md col-span-1 md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">ユーザー管理</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark">
                            <th className="p-2">メール</th>
                            <th className="p-2">ロール</th>
                            <th className="p-2">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.uid} className="border-b border-apple-label-quaternary-light/50 dark:border-apple-label-quaternary-dark/50">
                                <td className="p-2">{user.email}</td>
                                <td className="p-2">{user.customClaims?.role || 'employee'}</td>
                                <td className="p-2">
                                    <select
                                        value={user.customClaims?.role || 'employee'}
                                        onChange={(e) => handleUpdateRole(user.uid, e.target.value as 'admin' | 'employee')}
                                        className="bg-white/50 dark:bg-black/50 border border-apple-label-quaternary-light dark:border-apple-label-quaternary-dark rounded-apple-field p-1 text-apple-label-light dark:text-apple-label-dark focus:ring-1 focus:ring-apple-blue-light"
                                    >
                                        <option value="employee">社員</option>
                                        <option value="admin">管理者</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const StatCard: React.FC<{title: string, value: number | string}> = ({title, value}) => (
    <div className="bg-white/60 dark:bg-black/50 p-6 rounded-lg shadow-md">
        <h3 className="text-apple-subhead text-apple-label-secondary-light dark:text-apple-label-secondary-dark">{title}</h3>
        <p className="text-apple-title-1 font-bold mt-2">{value}</p>
    </div>
);


export const AdminDashboard: React.FC = () => {
    const { state } = useAppContext();

    const totalChats = state.projects.reduce((sum, p) => sum + p.channels.reduce((cSum, c) => cSum + c.chats.length, 0), 0);
    const approvedChats = state.projects.reduce((sum, p) => sum + p.channels.reduce((cSum, c) => cSum + c.chats.filter(ch => ch.approved).length, 0), 0);
    const knowledgeCount = state.knowledge.length;

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="総チャット数" value={totalChats} />
                <StatCard title="承認済みチャット数" value={approvedChats} />
                <StatCard title="ナレッジ数" value={knowledgeCount} />
                <UserManagement />
                {/* Other admin components like ProjectManagement and SecurityAlerts would go here */}
            </div>
        </div>
    );
};
