import React, { useState } from 'react';
import { AppMode } from './types';
import { Nav } from './components/Nav';
import { LiveMode } from './components/LiveMode';
import { VisionMode } from './components/VisionMode';
import { ChatMode } from './components/ChatMode';
import { StudioMode } from './components/StudioMode';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LIVE);

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE:
        return <LiveMode />;
      case AppMode.VISION:
        return <VisionMode />;
      case AppMode.CHAT:
        return <ChatMode />;
      case AppMode.CREATE:
        return <StudioMode />;
      default:
        return <LiveMode />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
            {renderContent()}
        </main>

        {/* Navigation */}
        <Nav mode={mode} setMode={setMode} />
    </div>
  );
};

export default App;