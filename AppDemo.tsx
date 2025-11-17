import React, { useState } from 'react';
import { AppleHIGDemo } from './components/AppleHIGDemo';
import App from './App';
import { Button } from './components/ui';

/**
 * アプリケーションデモルーター
 *
 * デモページと実際のアプリケーションを切り替えられるようにします
 */
export const AppDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(true);

  if (showDemo) {
    return (
      <div className="relative">
        <AppleHIGDemo />
        <div className="fixed bottom-apple-base right-apple-base z-tooltip">
          <Button
            variant="primary"
            onClick={() => setShowDemo(false)}
            className="shadow-apple-floating"
          >
            実際のアプリを表示
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <App />
      <div className="fixed bottom-apple-base right-apple-base z-tooltip">
        <Button
          variant="secondary"
          onClick={() => setShowDemo(true)}
          className="shadow-apple-floating"
        >
          デモページを表示
        </Button>
      </div>
    </div>
  );
};
