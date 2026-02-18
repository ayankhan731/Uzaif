import React from 'react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode }) => {
  const navItems = [
    { mode: AppMode.CHAT, icon: 'chat_bubble_outline', label: 'Chat' },
    { mode: AppMode.CODE, icon: 'code', label: 'Code' },
    { mode: AppMode.WRITE, icon: 'edit_note', label: 'Write' },
    { mode: AppMode.LIVE, icon: 'graphic_eq', label: 'Live' },
    { mode: AppMode.IMAGES, icon: 'image', label: 'Images' },
    { mode: AppMode.VIDEO, icon: 'movie', label: 'Video' },
    { mode: AppMode.AUDIO, icon: 'audiotrack', label: 'Audio' },
  ];

  return (
    <div className="w-20 lg:w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full flex-shrink-0">
      <div className="p-4 lg:p-6 flex items-center justify-center lg:justify-start gap-3">
        <span className="material-icons text-blue-600 text-3xl">diamond</span>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden lg:block">
          OmniGemini
        </h1>
      </div>
      
      <nav className="flex-1 flex flex-col gap-2 p-3">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => setMode(item.mode)}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${
              currentMode === item.mode
                ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className={`material-icons text-2xl group-hover:scale-110 transition-transform ${currentMode === item.mode ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
              {item.icon}
            </span>
            <span className="font-medium hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 hidden lg:block">
        <div className="bg-white rounded-lg p-3 text-xs text-gray-400 border border-gray-100 shadow-sm">
          Powered by Gemini 3 & 2.5
        </div>
      </div>
    </div>
  );
};

export default Sidebar;