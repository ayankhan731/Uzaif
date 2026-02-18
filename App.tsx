import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatModule from './components/ChatModule';
import LiveModule from './components/LiveModule';
import ImageModule from './components/ImageModule';
import VideoModule from './components/VideoModule';
import AudioModule from './components/AudioModule';
import { AppMode } from './types';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CHAT);

  const renderContent = () => {
    switch (currentMode) {
      case AppMode.CHAT: 
      case AppMode.CODE: 
      case AppMode.WRITE: 
        return <ChatModule mode={currentMode} />;
      case AppMode.LIVE: return <LiveModule />;
      case AppMode.IMAGES: return <ImageModule />;
      case AppMode.VIDEO: return <VideoModule />;
      case AppMode.AUDIO: return <AudioModule />;
      default: return <ChatModule mode={AppMode.CHAT} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-800 font-sans">
      <Sidebar currentMode={currentMode} setMode={setCurrentMode} />
      <main className="flex-1 h-full overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;