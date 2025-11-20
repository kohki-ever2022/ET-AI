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
    <div
      className="flex h-screen w-screen overflow-hidden text-apple-label-light dark:text-apple-label-dark"
      style={{
        background: 'linear-gradient(to right, #7DD3FC 0%, #D8BFD8 50%, #4338CA 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {state.isSidebarOpen && <Sidebar />}
      <main
        className="flex-1 h-full flex flex-col"
        style={{
          background: 'transparent'
        }}
      >
        <MainView />
      </main>
    </div>
  );
};

export default App;
