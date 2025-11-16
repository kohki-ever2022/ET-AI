import React from 'react';
import { Auth } from './components/Auth';
import { Sidebar } from './components/ProjectDashboard';
import { MainView } from './components/ProjectView';
import { useAppContext } from './context/AppContext';

const App: React.FC = () => {
  const { state } = useAppContext();

  if (!state.isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden text-apple-label-light dark:text-apple-label-dark bg-apple-bg-secondary-light dark:bg-apple-bg-secondary-dark">
      {state.isSidebarOpen && <Sidebar />}
      <main className="flex-1 h-full flex flex-col bg-apple-bg-primary-light dark:bg-apple-bg-primary-dark">
        <MainView />
      </main>
    </div>
  );
};

export default App;
